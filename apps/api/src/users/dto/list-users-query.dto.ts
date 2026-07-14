import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsUUID()
  role?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
