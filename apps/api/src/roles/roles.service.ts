import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleNotFoundException } from './roles.exceptions';

const roleWithPermissions = {
  permissions: { include: { permission: true } },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      include: roleWithPermissions,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: roleWithPermissions,
    });
    if (!role) {
      throw new RoleNotFoundException();
    }
    return role;
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  toPermissionKeys(role: {
    permissions: { permission: { key: string } }[];
  }): string[] {
    return role.permissions.map(
      (rolePermission) => rolePermission.permission.key,
    );
  }
}
