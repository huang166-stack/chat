import { Injectable } from '@nestjs/common';
import { PaymentConfig } from '@prisma/client';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';
import { PaymentCreationResult, PaymentProvider } from './payment-provider.interface.js';

@Injectable()
export class PlayOfferPaymentProvider implements PaymentProvider {
  isConfigured(config: PaymentConfig): boolean {
    return Boolean(config.merchantId && config.appId && config.appSecret && config.apiKey && config.gatewayUrl);
  }

  async createPayment(orderNo: string, _amount: number, config: PaymentConfig): Promise<PaymentCreationResult> {
    return {
      payUrl: `${config.gatewayUrl}/pay?orderNo=${orderNo}`,
    };
  }

  verifyCallback(_payload: PaymentCallbackDto): boolean {
    // TODO: 根据 https://pay.playoffer.cn/doc/index.html 接入真实验签。
    return false;
  }
}