import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { ListPredictionsQueryDto } from './dto/list-predictions-query.dto';
import { PredictionsService } from './predictions.service';

@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly predictionsService: PredictionsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission('predictions:run:all', 'predictions:run:own')
  async create(
    @Body() dto: CreatePredictionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.predictionsService.create(
      dto.studentId,
      currentUser,
    );
    await this.auditService.record(currentUser.id, 'PREDICTION_EXECUTED', {
      studentId: dto.studentId,
      predictionId: result.id,
      riskLevel: result.riskLevel,
    });
    return result;
  }

  @Get()
  @RequirePermission('predictions:read:all', 'predictions:read:own')
  findAll(
    @Query() query: ListPredictionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.predictionsService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('predictions:read:all', 'predictions:read:own')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.predictionsService.findOne(id, user);
  }
}
