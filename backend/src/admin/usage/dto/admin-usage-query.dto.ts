import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class AdminUsageQueryDto extends PaginationDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '月份格式应为 YYYY-MM' })
  month?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}
