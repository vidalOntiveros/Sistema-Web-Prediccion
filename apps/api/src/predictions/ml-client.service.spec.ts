import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { EnvConfig } from '../config/env.validation';
import { MlClientService } from './ml-client.service';
import {
  InsufficientStudentDataException,
  MlServiceUnavailableException,
} from './predictions.exceptions';

const ENV: Pick<
  EnvConfig,
  'ML_SERVICE_URL' | 'ML_INTERNAL_API_KEY' | 'ML_REQUEST_TIMEOUT_MS'
> = {
  ML_SERVICE_URL: 'http://ml.internal:8000',
  ML_INTERNAL_API_KEY: 'secret-key',
  ML_REQUEST_TIMEOUT_MS: 8000,
};

describe('MlClientService', () => {
  let service: MlClientService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    const moduleRef = await Test.createTestingModule({
      providers: [
        MlClientService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: keyof typeof ENV) => ENV[key],
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MlClientService);
  });

  it('sends the ADR-0001 request shape with the internal API key header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          modelVersion: 'mock-v0',
          score: 0.5,
          topFactors: [],
        }),
    });

    await service.predict('student-1', { promedio_general: 8 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ml.internal:8000/predict');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual(
      expect.objectContaining({ 'X-Internal-Api-Key': 'secret-key' }),
    );
    expect(init?.body).toBe(
      JSON.stringify({
        studentId: 'student-1',
        contractVersion: '1',
        features: { promedio_general: 8 },
      }),
    );
  });

  it('defaults riskLevel to null and topFactors to [] when the model omits them', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ modelVersion: 'mock-v0', score: 0.8 }),
    });

    const result = await service.predict('student-1', {});

    expect(result).toEqual({
      modelVersion: 'mock-v0',
      score: 0.8,
      riskLevel: null,
      topFactors: [],
    });
  });

  it('maps a 422 response to InsufficientStudentDataException with missingFeatures', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({
          error: 'INSUFFICIENT_DATA',
          message: 'no data',
          missingFeatures: ['promedio_general'],
        }),
    });

    await expect(service.predict('student-1', {})).rejects.toThrow(
      InsufficientStudentDataException,
    );
  });

  it('maps a network failure to MlServiceUnavailableException', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.predict('student-1', {})).rejects.toThrow(
      MlServiceUnavailableException,
    );
  });

  it('maps an unexpected non-2xx response to MlServiceUnavailableException', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.predict('student-1', {})).rejects.toThrow(
      MlServiceUnavailableException,
    );
  });
});
