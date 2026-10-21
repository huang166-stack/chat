import { HttpStatus, Injectable } from '@nestjs/common';
import type { PaymentConfig } from '@prisma/client';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { RedisService } from '../common/services/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';
import { MockPaymentProvider } from './mock-payment.provider.js';
import { PlayOfferPaymentProvider } from './playoffer-payment.provider.js';
import type { PaymentProvider } from './payment-provider.interface.js';

@Injectable()
export class PaymentService {
  private readonly providers: Record<string, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    mockProvider: MockPaymentProvider,
    playOfferProvider: PlayOfferPaymentProvider,
  ) {
    this.providers = {
      mock: mockProvider,
      playoffer: playOfferProvider,
    };
  }

  async findReadyConfig(): Promise<PaymentConfig | null> {
    const configs = await this.prisma.paymentConfig.findMany({
      where: { enabled: 1 },
      orderBy: { id: 'asc' },
    });

    return configs.find((config) => this.providerFor(config.provider).isConfigured(config)) ?? null;
  }

  async createPayment(orderNo: string, amount: number, config: PaymentConfig) {
    const provider = this.providerFor(config.provider);
    if (!provider.isConfigured(config)) {
      throw new BusinessException('支付未配置', ErrorCodes.PAYMENT_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return provider.createPayment(orderNo, amount, config);
  }

  async handleCallback(dto: PaymentCallbackDto) {
    const provider = this.providerFor(dto.provider);
    if (!provider.verifyCallback(dto)) {
      throw new BusinessException('支付回调验签失败', ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
    }

    const lockKey = `payment:callback:${dto.orderNo}`;
    const locked = await this.redis.setnx(lockKey, '1', 30);
    if (!locked) {
      const order = await this.prisma.order.findUnique({ where: { orderNo: dto.orderNo } });
      if (order?.status === 'PAID') {
        return { orderNo: dto.orderNo, status: 'PAID', duplicate: true };
      }
      throw new BusinessException('订单正在处理中', ErrorCodes.ORDER_STATUS_CONFLICT, HttpStatus.CONFLICT);
    }

    try {
      const order = await this.prisma.order.findUnique({ where: { orderNo: dto.orderNo } });
      if (!order) {
        throw new BusinessException('订单不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (order.status === 'PAID') {
        return { orderNo: dto.orderNo, status: 'PAID', duplicate: true };
      }

      if (order.status !== 'CREATED' && order.status !== 'PENDING') {
        throw new BusinessException('订单状态冲突', ErrorCodes.ORDER_STATUS_CONFLICT, HttpStatus.CONFLICT);
      }

      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: {
            orderNo: dto.orderNo,
            status: { in: ['CREATED', 'PENDING'] },
          },
          data: {
            status: 'PAID',
            transactionNo: dto.transactionNo ?? null,
            paidAt: now,
            updatedAt: now,
          },
        });

        if (updated.count === 0) {
          return;
        }

        const membership = await tx.userMembership.findUnique({ where: { userId: order.userId } });
        const baseTime =
          membership && membership.expireAt.getTime() > now.getTime() ? membership.expireAt : now;
        const expireAt = new Date(baseTime.getTime() + order.durationDays * 24 * 60 * 60 * 1000);

        await tx.userMembership.upsert({
          where: { userId: order.userId },
          update: { expireAt },
          create: { userId: order.userId, expireAt },
        });
      });

      return { orderNo: dto.orderNo, status: 'PAID', duplicate: false };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async handleMockPay(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { paymentConfig: true },
    });

    if (!order) {
      throw new BusinessException('订单不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (order.paymentConfig?.provider !== 'mock' || process.env.NODE_ENV === 'production') {
      throw new BusinessException('当前环境不允许模拟支付', ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    return this.handleCallback({
      orderNo,
      provider: 'mock',
      signature: 'mock-sign',
    });
  }

  async getReturnInfo(orderNo: string, user?: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { orderNo } });
    if (!order) {
      throw new BusinessException('订单不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user && order.userId !== user.userId && user.role !== 'ADMIN') {
      throw new BusinessException('无权限', ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    return {
      orderNo: order.orderNo,
      status: order.status,
      amount: Number(order.amount),
      paidAt: order.paidAt,
    };
  }

  private providerFor(provider: string): PaymentProvider {
    const matched = this.providers[provider];
    if (!matched) {
      throw new BusinessException('不支持的支付渠道', ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
    }
    return matched;
  }
}

