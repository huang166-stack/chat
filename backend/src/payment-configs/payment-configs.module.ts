import { Module } from '@nestjs/common';
import { PaymentConfigsController } from './payment-configs.controller.js';
import { PaymentConfigsService } from './payment-configs.service.js';

@Module({
  controllers: [PaymentConfigsController],
  providers: [PaymentConfigsService],
})
export class PaymentConfigsModule {}