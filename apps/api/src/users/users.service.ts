import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { generateTemporaryPassword } from '../common/generate-temporary-password';
import { paginate, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  CannotDeactivateSelfException,
  EmailAlreadyExistsException,
  UserNotFoundException,
} from './users.exceptions';

const userWithRolePermissions = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

// Shape explícito de la query de arriba — más simple y estable que pelear con los
// tipos genéricos de payload del cliente generado.
interface UserWithRolePermissions {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  roles: {
    roleId: string;
    role: {
      id: string;
      name: string;
      permissions: { permission: { key: string } }[];
    };
  }[];
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string } | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

  async findAll(
    query: ListUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponse>> {
    const where = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.role ? { roles: { some: { roleId: query.role } } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userWithRolePermissions,
        orderBy: { fullName: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      users.map((user) => this.toUserResponse(user)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findById(id: string): Promise<UserResponse> {
    const user = await this.findByIdOrThrow(id);
    return this.toUserResponse(user);
  }

  async create(
    dto: CreateUserDto,
  ): Promise<UserResponse & { temporaryPassword: string }> {
    await this.assertEmailAvailable(dto.email);
    await this.rolesService.findById(dto.roleId); // valida que el rol exista

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        roles: { create: { roleId: dto.roleId } },
      },
      include: userWithRolePermissions,
    });

    return { ...this.toUserResponse(user), temporaryPassword };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    await this.findByIdOrThrow(id);
    if (dto.email) {
      await this.assertEmailAvailable(dto.email, id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { fullName: dto.fullName, email: dto.email },
      include: userWithRolePermissions,
    });

    return this.toUserResponse(user);
  }

  async updateStatus(
    id: string,
    isActive: boolean,
    currentUserId: string,
  ): Promise<UserResponse> {
    if (id === currentUserId && !isActive) {
      throw new CannotDeactivateSelfException();
    }
    await this.findByIdOrThrow(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: userWithRolePermissions,
    });

    return this.toUserResponse(user);
  }

  async updateRole(id: string, roleId: string): Promise<UserResponse> {
    await this.findByIdOrThrow(id);
    await this.rolesService.findById(roleId);

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.create({ data: { userId: id, roleId } }),
    ]);

    const user = await this.findByIdOrThrow(id);
    return this.toUserResponse(user);
  }

  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    await this.findByIdOrThrow(id);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { temporaryPassword };
  }

  /** Usado por AuthModule — no expuesto vía HTTP directamente. */
  async findByEmailForAuth(
    email: string,
  ): Promise<UserWithRolePermissions | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: userWithRolePermissions,
    });
  }

  async findByIdForAuth(id: string): Promise<UserWithRolePermissions | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithRolePermissions,
    });
  }

  toAuthenticatedUser(user: UserWithRolePermissions): AuthenticatedUser {
    const userRole = user.roles[0];
    const permissions = userRole
      ? userRole.role.permissions.map(
          (rolePermission) => rolePermission.permission.key,
        )
      : [];

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: userRole?.roleId ?? '',
      roleName: userRole?.role.name ?? '',
      permissions,
    };
  }

  private async findByIdOrThrow(id: string): Promise<UserWithRolePermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userWithRolePermissions,
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }

  private async assertEmailAvailable(
    email: string,
    excludingUserId?: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== excludingUserId) {
      throw new EmailAlreadyExistsException();
    }
  }

  private toUserResponse(user: UserWithRolePermissions): UserResponse {
    const userRole = user.roles[0];
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      role: userRole
        ? { id: userRole.role.id, name: userRole.role.name }
        : null,
      createdAt: user.createdAt,
    };
  }
}
