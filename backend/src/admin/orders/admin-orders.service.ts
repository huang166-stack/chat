import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { getPagination, toPage } from '../../common/utils/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto.js';

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminOrderQueryDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const where: Prisma.OrderWhereInput = {
      ...(query.orderNo ? { orderNo: { contains: query.orderNo } } : {}),
      ...(query.username ? { user: { username: { contains: query.username } } } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { username: true } },
          paymentConfig: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return toPage(
      orders.map((order) => this.serialize(order)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: { select: { username: true } },
        paymentConfig: { select: { name: true } },
      },
    });

    if (!order) {
      throw new BusinessException('订单不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return this.serialize(order);
  }

  private serialize(
    order: Prisma.OrderGetPayload<{
      include: {
        user: { select: { username: true } };
        paymentConfig: { select: { name: true } };
      };
    }>,
  ) {
    return {
      orderNo: order.orderNo,
      username: order.user.username,
      planId: String(order.planId),
      planName: order.planName,
      durationDays: order.durationDays,
      amount: Number(order.amount),
      status: order.status,
      paymentConfigName: order.paymentConfig?.name ?? null,
      transactionNo: order.transactionNo,
      paidAt: order.paidAt,
      expireAt: order.expireAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
