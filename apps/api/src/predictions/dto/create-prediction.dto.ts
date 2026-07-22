import { IsUUID } from 'class-validator';

export class CreatePredictionDto {
  @IsUUID()
  studentId: string;
}
