import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller.js';
import { MockPaymentProvider } from './mock-payment.provider.js';
import { PaymentService } from './payment.service.js';
import { PlayOfferPaymentProvider } from './playoffer-payment.provider.js';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, MockPaymentProvider, PlayOfferPaymentProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
