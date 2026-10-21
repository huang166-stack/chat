import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user.interface.js';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { getPagination, toPage } from '../common/utils/pagination.js';
import { PaymentService } from '../payment/payment.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderQueryDto } from './dto/order-query.dto.js';

const ORDER_EXPIRE_MINUTES = 30;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async create(userId: bigint, dto: CreateOrderDto) {
    const plan = await this.prisma.memberPlan.findUnique({
      where: { id: BigInt(dto.planId) },
    });

    if (!plan || plan.enabled !== 1) {
      throw new BusinessException('套餐不存在或已下架', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const paymentConfig = await this.paymentService.findReadyConfig();
    if (!paymentConfig) {
      throw new BusinessException('支付未配置', ErrorCodes.PAYMENT_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }

    const orderNo = await this.generateUniqueOrderNo();
    const amount = Number(plan.price);
    const expireAt = new Date(Date.now() + ORDER_EXPIRE_MINUTES * 60 * 1000);

    const order = await this.prisma.order.create({
      data: {
        orderNo,
        userId,
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        amount,
        status: 'CREATED',
        paymentConfigId: paymentConfig.id,
        expireAt,
      },
    });

    const payment = await this.paymentService.createPayment(orderNo, amount, paymentConfig);

    return {
      orderNo: order.orderNo,
      amount,
      status: order.status,
      payUrl: payment.payUrl,
      expireAt,
    };
  }

  async findMine(userId: bigint, query: OrderQueryDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const where: Prisma.OrderWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return toPage(
      orders.map((order) => this.toSummary(order)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(orderNo: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { orderNo } });

    if (!order) {
      throw new BusinessException('订单不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (order.userId !== user.userId && user.role !== 'ADMIN') {
      throw new BusinessException('无权限', ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    return this.toSummary(order);
  }

  private async generateUniqueOrderNo(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const orderNo = this.buildOrderNo();
      const existing = await this.prisma.order.findUnique({ where: { orderNo } });
      if (!existing) {
        return orderNo;
      }
    }

    throw new BusinessException('订单号生成失败，请重试', ErrorCodes.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private buildOrderNo(): string {
    const now = new Date();
    const pad = (value: number, length = 2) => String(value).padStart(length, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');

    return `${timestamp}${random}`;
  }

  private toSummary(order: Prisma.OrderGetPayload<Record<string, never>>) {
    return {
      orderNo: order.orderNo,
      planId: String(order.planId),
      planName: order.planName,
      durationDays: order.durationDays,
      amount: Number(order.amount),
      status: order.status,
      transactionNo: order.transactionNo,
      paidAt: order.paidAt,
      expireAt: order.expireAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
