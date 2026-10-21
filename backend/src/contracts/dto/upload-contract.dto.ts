import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CONTRACT_STANCES,
  CONTRACT_TYPES,
  type ContractStanceValue,
  type ContractTypeValue,
} from '../contracts.constants.js';

export class UploadContractDto {
  @IsIn(CONTRACT_TYPES)
  contractType!: ContractTypeValue;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsIn(CONTRACT_STANCES)
  stance?: ContractStanceValue;
}
