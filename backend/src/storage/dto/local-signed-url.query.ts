import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class LocalSignedUrlQueryDto {
  @IsString()
  @Length(1, 512)
  key!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expires!: number;

  @IsString()
  @Length(16, 128)
  signature!: string;
}
