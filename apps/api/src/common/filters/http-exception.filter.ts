import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

// Traduce cualquier excepción al sobre único de error definido en
// docs/06-diseno-api-rest.md §3. Único lugar del código que conoce ese formato.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.buildBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        error: exception.errorCode,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null) {
        const payloadObj = payload as Record<string, unknown>;

        // Forma por defecto del ValidationPipe de Nest: { message: string[], ... }
        if (Array.isArray(payloadObj.message)) {
          return {
            statusCode: status,
            error: 'VALIDATION_ERROR',
            message: 'La solicitud no es válida.',
            details: payloadObj.message,
          };
        }

        return {
          statusCode: status,
          error: this.defaultErrorCode(status),
          message:
            typeof payloadObj.message === 'string'
              ? payloadObj.message
              : exception.message,
        };
      }

      return {
        statusCode: status,
        error: this.defaultErrorCode(status),
        message: exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado.',
    };
  }

  private defaultErrorCode(status: number): string {
    const knownCodes: Record<number, string> = {
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    };
    return knownCodes[status] ?? 'ERROR';
  }
}
