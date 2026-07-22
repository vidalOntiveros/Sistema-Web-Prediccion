import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatasetColumnsModule } from '../dataset-columns/dataset-columns.module';
import { StudentScopeService } from './scope/student-scope.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [AuditModule, DatasetColumnsModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentScopeService],
  exports: [StudentsService, StudentScopeService],
})
export class StudentsModule {}
