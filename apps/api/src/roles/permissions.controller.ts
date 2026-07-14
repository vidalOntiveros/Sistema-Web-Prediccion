import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { RolesService } from './roles.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles:read')
  findAll() {
    return this.rolesService.findAllPermissions();
  }
}
