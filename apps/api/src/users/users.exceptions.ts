import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class EmailAlreadyExistsException extends AppException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'EMAIL_ALREADY_EXISTS',
      'El correo ya está registrado.',
    );
  }
}

export class UserNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'El usuario no existe.');
  }
}

export class CannotDeactivateSelfException extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CANNOT_DEACTIVATE_SELF',
      'No puedes desactivar tu propia cuenta.',
    );
  }
}
