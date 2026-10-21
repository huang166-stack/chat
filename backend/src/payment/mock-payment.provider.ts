import { Injectable } from '@nestjs/common';
import { PaymentConfig } from '@prisma/client';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';
import { PaymentCreationResult, PaymentProvider } from './payment-provider.interface.js';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  isConfigured(_config: PaymentConfig): boolean {
    return true;
  }

  async createPayment(orderNo: string, _amount: number, _config: PaymentConfig): Promise<PaymentCreationResult> {
    return {
      payUrl: `http://localhost:3001/api/payment/mock-pay?orderNo=${orderNo}`,
    };
  }

  verifyCallback(payload: PaymentCallbackDto): boolean {
    return payload.signature === 'mock-sign';
  }
}