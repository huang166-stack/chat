import { Type } from 'class-transformer';
import type { RiskLevel, RuleType } from '@prisma/client';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const RULE_TYPES: RuleType[] = [
  'PRESENCE',
  'REGEX',
  'KEYWORD',
  'THRESHOLD',
  'LLM',
];
const RISK_LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW'];

export class CreateRuleDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  category!: string;

  @IsIn(RISK_LEVELS)
  severity!: RiskLevel;

  @IsIn(RULE_TYPES)
  ruleType!: RuleType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsObject()
  configJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  prompt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  enabled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  category?: string;

  @IsOptional()
  @IsIn(RISK_LEVELS)
  severity?: RiskLevel;

  @IsOptional()
  @IsIn(RULE_TYPES)
  ruleType?: RuleType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  prompt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  enabled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

export class AdminRuleQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(RULE_TYPES)
  ruleType?: RuleType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  enabled?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;
}
