import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ExtraDataFieldError } from '../common/validate-extra-data';

export class UnsupportedFileTypeException extends AppException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      'UNSUPPORTED_FILE_TYPE',
      'El archivo debe ser .csv o .xlsx.',
    );
  }
}

export class FileTooLargeException extends AppException {
  constructor() {
    super(
      HttpStatus.PAYLOAD_TOO_LARGE,
      'FILE_TOO_LARGE',
      'El archivo excede el tamaño máximo permitido (5 MB).',
    );
  }
}

export class RowLimitExceededException extends AppException {
  constructor(limit: number) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'ROW_LIMIT_EXCEEDED',
      `El archivo supera el máximo de ${limit} filas permitidas por carga.`,
    );
  }
}

export interface DatasetRowError extends ExtraDataFieldError {
  row: number;
}

export class DatasetValidationFailedException extends AppException {
  constructor(details: DatasetRowError[], truncated: boolean) {
    const message = truncated
      ? `El archivo tiene errores de validación en más de ${details.length} filas. Corrige y vuelve a intentar por lotes si es necesario.`
      : `El archivo tiene errores de validación en ${new Set(details.map((d) => d.row)).size} fila(s).`;
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'DATASET_VALIDATION_FAILED',
      message,
      details,
    );
  }
}

export class DatasetUploadNotFoundException extends AppException {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'DATASET_UPLOAD_NOT_FOUND',
      'La carga no existe.',
    );
  }
}
