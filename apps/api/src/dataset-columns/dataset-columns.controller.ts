import { Controller, Get } from '@nestjs/common';
import { DatasetColumnsService } from './dataset-columns.service';

@Controller('dataset-columns')
export class DatasetColumnsController {
  constructor(private readonly datasetColumnsService: DatasetColumnsService) {}

  // Autenticado, sin permiso especial (docs/06-diseno-api-rest.md §5.5).
  @Get()
  findAll() {
    return this.datasetColumnsService.findActive();
  }
}
