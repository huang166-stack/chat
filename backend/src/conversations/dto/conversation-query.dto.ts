import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class ConversationQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  keyword?: string;
}
