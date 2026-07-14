import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { RolesService } from './roles.service';

interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  permissions: { permission: { key: string } }[];
}

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles:read')
  async findAll() {
    const roles = await this.rolesService.findAll();
    return roles.map((role) => this.toResponse(role));
  }

  @Get(':id')
  @RequirePermission('roles:read')
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findById(id);
    return this.toResponse(role);
  }

  private toResponse(role: RoleWithPermissions) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: this.rolesService.toPermissionKeys(role),
    };
  }
}
