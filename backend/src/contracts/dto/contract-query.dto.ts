import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { CONTRACT_TYPES } from '../contracts.constants.js';

const CONTRACT_STATUSES = [
  'PARSING',
  'READY',
  'REVIEWING',
  'COMPLETED',
  'FAILED',
  'ARCHIVED',
] as const;

export class ContractQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];

  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: (typeof CONTRACT_STATUSES)[number];
}
