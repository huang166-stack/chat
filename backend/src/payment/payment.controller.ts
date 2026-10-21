import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';
import { PaymentService } from './payment.service.js';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('callback')
  callback(@Body() dto: PaymentCallbackDto) {
    return this.paymentService.handleCallback(dto);
  }

  @Public()
  @Get('mock-pay')
  async mockPay(@Query('orderNo') orderNo: string, @Res() res: Response) {
    await this.paymentService.handleMockPay(orderNo);
    const frontendBase = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000';
    return res.redirect(`${frontendBase}/payment/return?orderNo=${encodeURIComponent(orderNo)}`);
  }

  @Get('return')
  returnToClient(@CurrentUser() user: AuthUser, @Query('orderNo') orderNo: string) {
    return this.paymentService.getReturnInfo(orderNo, user);
  }
}
