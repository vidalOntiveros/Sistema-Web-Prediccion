import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatasetColumnsModule } from '../dataset-columns/dataset-columns.module';
import { DatasetUploadsController } from './dataset-uploads.controller';
import { DatasetUploadsService } from './dataset-uploads.service';

@Module({
  imports: [AuditModule, DatasetColumnsModule],
  controllers: [DatasetUploadsController],
  providers: [DatasetUploadsService],
})
export class DatasetUploadsModule {}
