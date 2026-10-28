import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateMemberPlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsIn(['MONTH_1', 'MONTH_3', 'CUSTOM'])
  durationType!: 'MONTH_1' | 'MONTH_3' | 'CUSTOM';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  enabled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reviewQuota?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxContractPages?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxFileSizeMb?: number;
}
