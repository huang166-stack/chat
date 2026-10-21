import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class OrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['CREATED', 'PENDING', 'PAID', 'CLOSED', 'REFUNDED'])
  status?: 'CREATED' | 'PENDING' | 'PAID' | 'CLOSED' | 'REFUNDED';
}