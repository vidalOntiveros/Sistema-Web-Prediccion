import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class InvalidCredentialsException extends AppException {
  constructor() {
    super(
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
      'Correo o contraseña incorrectos.',
    );
  }
}

export class AccountInactiveException extends AppException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'ACCOUNT_INACTIVE',
      'Esta cuenta está desactivada.',
    );
  }
}
