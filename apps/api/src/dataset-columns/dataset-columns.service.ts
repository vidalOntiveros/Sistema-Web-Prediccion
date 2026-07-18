import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetColumnCatalogEntry } from '../common/validate-extra-data';

@Injectable()
export class DatasetColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.datasetColumnDefinition.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Usado por StudentsService/DatasetUploadsService para validar `extraData`. */
  async findActiveCatalog(): Promise<DatasetColumnCatalogEntry[]> {
    const columns = await this.findActive();
    return columns.map((column) => ({
      key: column.key,
      dataType: column.dataType as DatasetColumnCatalogEntry['dataType'],
      required: column.required,
    }));
  }
}
