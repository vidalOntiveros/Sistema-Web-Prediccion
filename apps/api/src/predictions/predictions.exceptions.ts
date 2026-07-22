import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class PredictionNotFoundException extends AppException {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'PREDICTION_NOT_FOUND',
      'La predicción no existe.',
    );
  }
}

export class InsufficientStudentDataException extends AppException {
  constructor(missingFeatures: string[]) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INSUFFICIENT_STUDENT_DATA',
      'No hay suficientes datos del estudiante para generar una predicción.',
      { missingFeatures },
    );
  }
}

// Mapea la caída/timeout del servicio ML a 502 (docs/07-diseno-modulos-nestjs.md §6).
// No se persiste ninguna Prediction cuando esto ocurre (UC-06, flujo alterno).
export class MlServiceUnavailableException extends AppException {
  constructor() {
    super(
      HttpStatus.BAD_GATEWAY,
      'ML_SERVICE_UNAVAILABLE',
      'El servicio de predicción no está disponible en este momento. Intenta de nuevo más tarde.',
    );
  }
}
