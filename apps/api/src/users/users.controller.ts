import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('users:read')
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('users:read')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermission('users:write')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const created = await this.usersService.create(dto);
    await this.auditService.record(currentUser.id, 'USER_CREATED', {
      targetUserId: created.id,
    });
    return created;
  }

  @Patch(':id')
  @RequirePermission('users:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const updated = await this.usersService.update(id, dto);
    await this.auditService.record(currentUser.id, 'USER_UPDATED', {
      targetUserId: id,
    });
    return updated;
  }

  @Patch(':id/status')
  @RequirePermission('users:write')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const updated = await this.usersService.updateStatus(
      id,
      dto.isActive,
      currentUser.id,
    );
    await this.auditService.record(currentUser.id, 'USER_STATUS_CHANGED', {
      targetUserId: id,
      isActive: dto.isActive,
    });
    return updated;
  }

  @Patch(':id/role')
  @RequirePermission('users:write')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const updated = await this.usersService.updateRole(id, dto.roleId);
    await this.auditService.record(currentUser.id, 'USER_ROLE_CHANGED', {
      targetUserId: id,
      roleId: dto.roleId,
    });
    return updated;
  }

  @Post(':id/reset-password')
  @RequirePermission('users:write')
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.usersService.resetPassword(id);
    await this.auditService.record(currentUser.id, 'USER_PASSWORD_RESET', {
      targetUserId: id,
    });
    return result;
  }
}
