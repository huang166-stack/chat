import type { ReviewStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const REVIEW_STATUSES: ReviewStatus[] = [
  'PENDING',
  'PARSING',
  'RULE_CHECK',
  'MODEL_REVIEW',
  'AGGREGATING',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
];

export class AdminReviewQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(REVIEW_STATUSES)
  status?: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;
}
