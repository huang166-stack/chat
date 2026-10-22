import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class CreateReviewDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  ruleSetId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  modelConfigId?: string;

  @IsOptional()
  @IsIn(['PARTY_A', 'PARTY_B', 'NEUTRAL'])
  stance?: 'PARTY_A' | 'PARTY_B' | 'NEUTRAL';
}

export class ReviewFindingQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsIn(['RULE', 'MODEL'])
  source?: 'RULE' | 'MODEL';

  @IsOptional()
  @IsIn(['OPEN', 'ACCEPTED', 'IGNORED', 'NEEDS_REVIEW'])
  status?: 'OPEN' | 'ACCEPTED' | 'IGNORED' | 'NEEDS_REVIEW';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  taskId?: string;
}

export class UpdateFindingDto {
  @IsIn(['OPEN', 'ACCEPTED', 'IGNORED', 'NEEDS_REVIEW'])
  status!: 'OPEN' | 'ACCEPTED' | 'IGNORED' | 'NEEDS_REVIEW';
}
