import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StudentsModule } from '../students/students.module';
import { MlClientService } from './ml-client.service';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
  imports: [AuditModule, StudentsModule],
  controllers: [PredictionsController],
  providers: [PredictionsService, MlClientService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
