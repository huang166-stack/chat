import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId!: number;
}