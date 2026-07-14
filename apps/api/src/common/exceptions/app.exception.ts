import { HttpException } from '@nestjs/common';

// Base para excepciones de negocio: el código de error va explícito (no se adivina
// a partir del texto del mensaje), y el filtro global lo lee directo.
// Ver docs/07-diseno-modulos-nestjs.md §3.3 y docs/06-diseno-api-rest.md §3.
export class AppException extends HttpException {
  constructor(
    status: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ errorCode, message, details }, status);
  }
}
