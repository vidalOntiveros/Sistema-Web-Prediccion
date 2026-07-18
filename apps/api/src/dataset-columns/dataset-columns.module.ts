import { Module } from '@nestjs/common';
import { DatasetColumnsController } from './dataset-columns.controller';
import { DatasetColumnsService } from './dataset-columns.service';

@Module({
  controllers: [DatasetColumnsController],
  providers: [DatasetColumnsService],
  exports: [DatasetColumnsService],
})
export class DatasetColumnsModule {}
