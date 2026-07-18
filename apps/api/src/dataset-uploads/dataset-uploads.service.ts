import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { DatasetColumnsService } from '../dataset-columns/dataset-columns.service';
import { paginate, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  DatasetColumnCatalogEntry,
  validateExtraData,
} from '../common/validate-extra-data';
import { ListDatasetUploadsQueryDto } from './dto/list-dataset-uploads-query.dto';
import { parseCsv } from './parsers/csv.parser';
import { parseXlsx } from './parsers/xlsx.parser';
import { ParsedDatasetRow } from './parsers/parsed-dataset-row';
import {
  DatasetRowError,
  DatasetUploadNotFoundException,
  DatasetValidationFailedException,
  FileTooLargeException,
  RowLimitExceededException,
  UnsupportedFileTypeException,
} from './dataset-uploads.exceptions';
import { validateCoreFields } from './validate-core-fields';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ROW_LIMIT = 2000;
const MAX_ERROR_DETAILS = 200;
const ROW_LIMIT_CONFIG_KEY = 'dataset_upload_row_limit';

export interface DatasetUploadResult {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  createdAt: Date;
}

export interface DatasetUploadListItem {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  errorRows: number;
  uploadedBy: { id: string; fullName: string };
  createdAt: Date;
}

export interface DatasetUploadDetail extends DatasetUploadListItem {
  errors: DatasetRowError[];
}

interface ValidRow {
  controlNumber: string;
  fullName: string;
  career: string;
  semester: number;
  extraData: Record<string, unknown>;
}

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class DatasetUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly datasetColumnsService: DatasetColumnsService,
  ) {}

  async processFile(
    file: UploadedFile,
    uploadedBy: string,
  ): Promise<DatasetUploadResult> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new FileTooLargeException();
    }

    const rows = this.parse(file.originalname, file.buffer);
    const rowLimit = await this.getRowLimit();
    if (rows.length > rowLimit) {
      throw new RowLimitExceededException(rowLimit);
    }

    const catalog = await this.datasetColumnsService.findActiveCatalog();
    const { validRows, errors } = this.validateRows(rows, catalog);

    if (errors.length > 0) {
      await this.recordFailedUpload(
        file.originalname,
        uploadedBy,
        rows.length,
        errors,
      );
      const truncated = errors.length > MAX_ERROR_DETAILS;
      throw new DatasetValidationFailedException(
        errors.slice(0, MAX_ERROR_DETAILS),
        truncated,
      );
    }

    const upload = await this.prisma.$transaction(async (tx) => {
      const created = await tx.datasetUpload.create({
        data: {
          fileName: file.originalname,
          uploadedBy,
          status: 'completed',
          totalRows: rows.length,
        },
      });

      let createdCount = 0;
      let updatedCount = 0;

      for (const row of validRows) {
        const existing = await tx.student.findUnique({
          where: { controlNumber: row.controlNumber },
        });

        const data = {
          fullName: row.fullName,
          career: row.career,
          semester: row.semester,
          extraData: row.extraData as Prisma.InputJsonValue,
          datasetUploadId: created.id,
        };

        if (existing) {
          await tx.student.update({ where: { id: existing.id }, data });
          updatedCount += 1;
        } else {
          await tx.student.create({
            data: { controlNumber: row.controlNumber, ...data },
          });
          createdCount += 1;
        }
      }

      return tx.datasetUpload.update({
        where: { id: created.id },
        data: { createdCount, updatedCount },
      });
    });

    return this.toResult(upload);
  }

  async findAll(
    query: ListDatasetUploadsQueryDto,
  ): Promise<PaginatedResponse<DatasetUploadListItem>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.uploadedBy ? { uploadedBy: query.uploadedBy } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [uploads, total] = await Promise.all([
      this.prisma.datasetUpload.findMany({
        where,
        include: { uploader: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.datasetUpload.count({ where }),
    ]);

    return paginate(
      uploads.map((upload) => this.toListItem(upload)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findOne(id: string): Promise<DatasetUploadDetail> {
    const upload = await this.prisma.datasetUpload.findUnique({
      where: { id },
      include: { uploader: true },
    });
    if (!upload) {
      throw new DatasetUploadNotFoundException();
    }

    return {
      ...this.toListItem(upload),
      errors:
        upload.status === 'failed'
          ? (upload.errors as unknown as DatasetRowError[])
          : [],
    };
  }

  private parse(fileName: string, buffer: Buffer): ParsedDatasetRow[] {
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'csv') return parseCsv(buffer);
    if (extension === 'xlsx') return parseXlsx(buffer);
    throw new UnsupportedFileTypeException();
  }

  private async getRowLimit(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: ROW_LIMIT_CONFIG_KEY },
    });
    return typeof config?.value === 'number' ? config.value : DEFAULT_ROW_LIMIT;
  }

  private validateRows(
    rows: ParsedDatasetRow[],
    catalog: DatasetColumnCatalogEntry[],
  ): { validRows: ValidRow[]; errors: DatasetRowError[] } {
    const validRows: ValidRow[] = [];
    const errors: DatasetRowError[] = [];

    for (const row of rows) {
      const core = validateCoreFields(row.rowNumber, row.values);
      const { data: extraData, errors: extraDataErrors } = validateExtraData(
        catalog,
        row.values,
      );
      const rowErrors = [
        ...core.errors,
        ...extraDataErrors.map((error) => ({ row: row.rowNumber, ...error })),
      ];

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      validRows.push({
        ...(core.data as NonNullable<typeof core.data>),
        extraData,
      });
    }

    return { validRows, errors };
  }

  private async recordFailedUpload(
    fileName: string,
    uploadedBy: string,
    totalRows: number,
    errors: DatasetRowError[],
  ): Promise<void> {
    const details = errors.slice(0, MAX_ERROR_DETAILS);
    await this.prisma.datasetUpload.create({
      data: {
        fileName,
        uploadedBy,
        status: 'failed',
        totalRows,
        errorRows: new Set(errors.map((error) => error.row)).size,
        errors: details as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private toListItem(upload: {
    id: string;
    fileName: string;
    status: string;
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    errorRows: number;
    createdAt: Date;
    uploader: { id: string; fullName: string };
  }): DatasetUploadListItem {
    return {
      id: upload.id,
      fileName: upload.fileName,
      status: upload.status,
      totalRows: upload.totalRows,
      createdCount: upload.createdCount,
      updatedCount: upload.updatedCount,
      errorRows: upload.errorRows,
      uploadedBy: {
        id: upload.uploader.id,
        fullName: upload.uploader.fullName,
      },
      createdAt: upload.createdAt,
    };
  }

  private toResult(upload: {
    id: string;
    fileName: string;
    status: string;
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    createdAt: Date;
  }): DatasetUploadResult {
    return {
      id: upload.id,
      fileName: upload.fileName,
      status: upload.status,
      totalRows: upload.totalRows,
      createdCount: upload.createdCount,
      updatedCount: upload.updatedCount,
      createdAt: upload.createdAt,
    };
  }
}
