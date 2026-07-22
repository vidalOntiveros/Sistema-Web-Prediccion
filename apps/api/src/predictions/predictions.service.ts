import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { paginate, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { StudentNotFoundException } from '../students/students.exceptions';
import { StudentScopeService } from '../students/scope/student-scope.service';
import { buildPredictionPayload } from './build-prediction-payload';
import { MlClientService } from './ml-client.service';
import { PredictionNotFoundException } from './predictions.exceptions';
import { getRecommendations, Recommendation } from './recommendation-rules';
import { ListPredictionsQueryDto } from './dto/list-predictions-query.dto';

const RISK_THRESHOLDS_CONFIG_KEY = 'prediction_risk_thresholds';
const DEFAULT_RISK_THRESHOLDS = { medium: 0.4, high: 0.7 };

export interface PredictionListItem {
  id: string;
  studentId: string;
  studentName: string;
  riskLevel: string;
  score: number;
  modelVersion: string;
  createdAt: Date;
}

export interface PredictionDetail {
  id: string;
  studentId: string;
  executedBy: string;
  modelVersion: string;
  riskLevel: string;
  score: number;
  topFactors: unknown;
  recommendations: Recommendation[];
  createdAt: Date;
}

@Injectable()
export class PredictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: StudentScopeService,
    private readonly mlClient: MlClientService,
  ) {}

  async create(
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<PredictionDetail> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, ...this.scopeService.resolve(user) },
    });
    if (!student) {
      throw new StudentNotFoundException();
    }

    const features = buildPredictionPayload({
      career: student.career,
      semester: student.semester,
      extraData: student.extraData as Record<string, unknown>,
    });

    const mlResult = await this.mlClient.predict(studentId, features);
    const riskLevel =
      mlResult.riskLevel ?? (await this.calculateRiskLevel(mlResult.score));
    const recommendations = getRecommendations(riskLevel);

    const prediction = await this.prisma.prediction.create({
      data: {
        studentId,
        executedBy: user.id,
        modelVersion: mlResult.modelVersion,
        riskLevel,
        score: mlResult.score,
        topFactors: mlResult.topFactors,
        recommendations: recommendations as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toDetail(prediction);
  }

  async findAll(
    query: ListPredictionsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponse<PredictionListItem>> {
    const where: Prisma.PredictionWhereInput = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      student: {
        ...this.scopeService.resolve(user),
        ...(query.career ? { career: query.career } : {}),
      },
    };

    const [predictions, total] = await Promise.all([
      this.prisma.prediction.findMany({
        where,
        include: { student: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.prediction.count({ where }),
    ]);

    return paginate(
      predictions.map((prediction) => ({
        id: prediction.id,
        studentId: prediction.studentId,
        studentName: prediction.student.fullName,
        riskLevel: prediction.riskLevel,
        score: prediction.score,
        modelVersion: prediction.modelVersion,
        createdAt: prediction.createdAt,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PredictionDetail> {
    const prediction = await this.prisma.prediction.findFirst({
      where: { id, student: this.scopeService.resolve(user) },
    });
    if (!prediction) {
      throw new PredictionNotFoundException();
    }
    return this.toDetail(prediction);
  }

  private async calculateRiskLevel(score: number): Promise<string> {
    const thresholds = await this.getRiskThresholds();
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }

  private async getRiskThresholds(): Promise<{
    medium: number;
    high: number;
  }> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: RISK_THRESHOLDS_CONFIG_KEY },
    });
    const value = config?.value as
      { medium?: number; high?: number } | undefined;
    return {
      medium: value?.medium ?? DEFAULT_RISK_THRESHOLDS.medium,
      high: value?.high ?? DEFAULT_RISK_THRESHOLDS.high,
    };
  }

  private toDetail(prediction: {
    id: string;
    studentId: string;
    executedBy: string;
    modelVersion: string;
    riskLevel: string;
    score: number;
    topFactors: unknown;
    recommendations: unknown;
    createdAt: Date;
  }): PredictionDetail {
    return {
      id: prediction.id,
      studentId: prediction.studentId,
      executedBy: prediction.executedBy,
      modelVersion: prediction.modelVersion,
      riskLevel: prediction.riskLevel,
      score: prediction.score,
      topFactors: prediction.topFactors,
      recommendations: prediction.recommendations as Recommendation[],
      createdAt: prediction.createdAt,
    };
  }
}
