import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class AdminOrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsIn(['CREATED', 'PENDING', 'PAID', 'CLOSED', 'REFUNDED'])
  status?: 'CREATED' | 'PENDING' | 'PAID' | 'CLOSED' | 'REFUNDED';
}
