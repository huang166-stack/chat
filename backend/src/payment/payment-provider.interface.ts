import { PaymentConfig } from '@prisma/client';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';

export interface PaymentCreationResult {
  payUrl: string;
}

export interface PaymentProvider {
  isConfigured(config: PaymentConfig): boolean;
  createPayment(orderNo: string, amount: number, config: PaymentConfig): Promise<PaymentCreationResult>;
  verifyCallback(payload: PaymentCallbackDto): boolean;
}