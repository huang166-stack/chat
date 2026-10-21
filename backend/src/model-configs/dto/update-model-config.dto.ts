import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateModelConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsIn(['OPENAI_COMPATIBLE', 'CUSTOM'])
  provider?: 'OPENAI_COMPATIBLE' | 'CUSTOM';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(2)
  temperature?: number;

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
}