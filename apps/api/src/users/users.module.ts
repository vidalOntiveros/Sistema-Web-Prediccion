import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesModule } from '../roles/roles.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RolesModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
