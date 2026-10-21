import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConversationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  modelConfigId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
