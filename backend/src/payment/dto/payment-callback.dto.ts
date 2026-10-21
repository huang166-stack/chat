import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PaymentCallbackDto {
  @IsString()
  @IsNotEmpty()
  orderNo!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;

  @IsOptional()
  @IsString()
  transactionNo?: string;
}