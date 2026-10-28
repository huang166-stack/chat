import { IsIn, IsOptional } from 'class-validator';
import {
  CONTRACT_STANCES,
  CONTRACT_TYPES,
} from '../../contracts/contracts.constants.js';

export class ReviewRuleSetQueryDto {
  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];

  @IsOptional()
  @IsIn(CONTRACT_STANCES)
  stance?: (typeof CONTRACT_STANCES)[number];
}
