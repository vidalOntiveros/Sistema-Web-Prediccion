import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class RoleNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'ROLE_NOT_FOUND', 'El rol no existe.');
  }
}
