import { Test } from '@nestjs/testing';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { StudentNotFoundException } from '../students/students.exceptions';
import { StudentScopeService } from '../students/scope/student-scope.service';
import { MlClientService } from './ml-client.service';
import { PredictionNotFoundException } from './predictions.exceptions';
import { PredictionsService } from './predictions.service';

function user(permissions: string[]): AuthenticatedUser {
  return {
    id: 'teacher-1',
    email: 'docente@itm.edu.mx',
    fullName: 'Docente Uno',
    roleId: 'role-1',
    roleName: 'Docente',
    permissions,
  };
}

describe('PredictionsService', () => {
  let service: PredictionsService;
  let prisma: {
    student: { findFirst: jest.Mock };
    prediction: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
    systemConfig: { findUnique: jest.Mock };
  };
  let scopeService: { resolve: jest.Mock };
  let mlClient: { predict: jest.Mock };

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn() },
      prediction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      systemConfig: { findUnique: jest.fn() },
    };
    scopeService = { resolve: jest.fn().mockReturnValue({}) };
    mlClient = { predict: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PredictionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StudentScopeService, useValue: scopeService },
        { provide: MlClientService, useValue: mlClient },
      ],
    }).compile();

    service = moduleRef.get(PredictionsService);
  });

  describe('create', () => {
    it('throws StudentNotFoundException when the student is out of scope', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.create('student-1', user(['predictions:run:own'])),
      ).rejects.toThrow(StudentNotFoundException);
      expect(mlClient.predict).not.toHaveBeenCalled();
    });

    it('calculates riskLevel from the default thresholds when the model omits it', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        career: 'ISC',
        semester: 5,
        extraData: { materias_reprobadas: 3 },
      });
      prisma.systemConfig.findUnique.mockResolvedValue(null);
      mlClient.predict.mockResolvedValue({
        modelVersion: 'mock-v0',
        score: 0.75,
        riskLevel: null,
        topFactors: [],
      });
      prisma.prediction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'prediction-1', createdAt: new Date(), ...data }),
      );

      const result = await service.create(
        'student-1',
        user(['predictions:run:own']),
      );

      expect(result.riskLevel).toBe('high'); // score 0.75 >= default high threshold 0.7
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(mlClient.predict).toHaveBeenCalledWith('student-1', {
        career: 'ISC',
        semester: 5,
        materias_reprobadas: 3,
      });
    });

    it('trusts riskLevel from the model when present, without reading thresholds', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        career: 'ISC',
        semester: 5,
        extraData: {},
      });
      mlClient.predict.mockResolvedValue({
        modelVersion: 'mock-v0',
        score: 0.1,
        riskLevel: 'low',
        topFactors: [],
      });
      prisma.prediction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'prediction-1', createdAt: new Date(), ...data }),
      );

      const result = await service.create(
        'student-1',
        user(['predictions:run:all']),
      );

      expect(result.riskLevel).toBe('low');
      expect(prisma.systemConfig.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws PredictionNotFoundException when out of scope or missing', async () => {
      prisma.prediction.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('prediction-1', user(['predictions:read:own'])),
      ).rejects.toThrow(PredictionNotFoundException);
    });
  });
});
