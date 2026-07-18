import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { ExtraDataFieldError } from '../common/validate-extra-data';

export class StudentNotFoundException extends AppException {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'STUDENT_NOT_FOUND',
      'El estudiante no existe.',
    );
  }
}

export class ControlNumberAlreadyExistsException extends AppException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'CONTROL_NUMBER_ALREADY_EXISTS',
      'Ya existe un estudiante con ese número de control.',
    );
  }
}

export class ExtraDataValidationException extends AppException {
  constructor(details: ExtraDataFieldError[]) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'EXTRA_DATA_VALIDATION_FAILED',
      'Los datos adicionales del estudiante tienen errores de validación.',
      details,
    );
  }
}

export class TeacherNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'TEACHER_NOT_FOUND', 'El docente no existe.');
  }
}
