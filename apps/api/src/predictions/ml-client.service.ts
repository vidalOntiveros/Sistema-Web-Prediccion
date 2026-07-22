import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';
import type { FeatureValue } from './build-prediction-payload';
import {
  InsufficientStudentDataException,
  MlServiceUnavailableException,
} from './predictions.exceptions';

export interface MlPredictionResult {
  modelVersion: string;
  score: number;
  riskLevel: string | null;
  topFactors: { feature: string; contribution: number }[];
}

interface MlPredictionErrorBody {
  error: string;
  message: string;
  missingFeatures: string[];
}

interface MlPredictionResponseBody {
  modelVersion: string;
  score: number;
  riskLevel?: string | null;
  topFactors?: { feature: string; contribution: number }[];
}

// Único punto del código que conoce el contrato HTTP con apps/ml (ADR-0001).
// Sin reintentos automáticos: fallar rápido y claro ante un timeout/caída
// (docs/07-diseno-modulos-nestjs.md §6).
@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async predict(
    studentId: string,
    features: Record<string, FeatureValue>,
  ): Promise<MlPredictionResult> {
    const controller = new AbortController();
    const timeoutMs = this.config.get('ML_REQUEST_TIMEOUT_MS', {
      infer: true,
    });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(
        `${this.config.get('ML_SERVICE_URL', { infer: true })}/predict`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Key': this.config.get('ML_INTERNAL_API_KEY', {
              infer: true,
            }),
          },
          body: JSON.stringify({
            studentId,
            contractVersion: '1',
            features,
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      this.logger.error(`Fallo al llamar al servicio ML: ${String(error)}`);
      throw new MlServiceUnavailableException();
    } finally {
      clearTimeout(timeout);
    }

    // 422: PredictionErrorResponse (docs/09-contrato-ml-definitivo.md §3) — código
    // de la respuesta HTTP en sí, no un errorCode propio, por eso el literal.
    if (response.status === 422) {
      const body = (await response.json()) as MlPredictionErrorBody;
      throw new InsufficientStudentDataException(body.missingFeatures);
    }

    if (!response.ok) {
      this.logger.error(
        `Respuesta no esperada del servicio ML: ${response.status}`,
      );
      throw new MlServiceUnavailableException();
    }

    const body = (await response.json()) as MlPredictionResponseBody;
    return {
      modelVersion: body.modelVersion,
      score: body.score,
      riskLevel: body.riskLevel ?? null,
      topFactors: body.topFactors ?? [],
    };
  }
}
