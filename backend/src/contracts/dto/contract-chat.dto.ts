import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ContractChatHistoryDto {
  @IsIn(['USER', 'ASSISTANT'])
  role!: 'USER' | 'ASSISTANT';

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}

export class ContractChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsString()
  @Length(8, 64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  requestId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  modelConfigId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ContractChatHistoryDto)
  history?: ContractChatHistoryDto[];
}
