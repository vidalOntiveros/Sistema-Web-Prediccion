import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DatasetUploadsService } from './dataset-uploads.service';
import { UnsupportedFileTypeException } from './dataset-uploads.exceptions';
import { ListDatasetUploadsQueryDto } from './dto/list-dataset-uploads-query.dto';

// Límite de Multer como red de seguridad (memoria); el límite "de negocio" con
// mensaje amigable (5 MB) vive en DatasetUploadsService.
const MULTER_HARD_LIMIT_BYTES = 20 * 1024 * 1024;

@Controller('dataset-uploads')
export class DatasetUploadsController {
  constructor(
    private readonly datasetUploadsService: DatasetUploadsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission('datasets:upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MULTER_HARD_LIMIT_BYTES } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (!file) {
      throw new UnsupportedFileTypeException();
    }
    const result = await this.datasetUploadsService.processFile(
      file,
      currentUser.id,
    );
    await this.auditService.record(currentUser.id, 'DATASET_UPLOAD_COMPLETED', {
      datasetUploadId: result.id,
      totalRows: result.totalRows,
    });
    return result;
  }

  @Get()
  @RequirePermission('datasets:read')
  findAll(@Query() query: ListDatasetUploadsQueryDto) {
    return this.datasetUploadsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('datasets:read')
  findOne(@Param('id') id: string) {
    return this.datasetUploadsService.findOne(id);
  }
}
