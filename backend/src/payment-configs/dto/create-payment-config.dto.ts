import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePaymentConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  merchantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  appId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  appSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  gatewayUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notifyUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  returnUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  enabled?: number;
}