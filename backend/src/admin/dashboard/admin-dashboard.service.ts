import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const paidWhere: Prisma.OrderWhereInput = { status: 'PAID' };
    const todayPaidWhere: Prisma.OrderWhereInput = {
      status: 'PAID',
      paidAt: { gte: todayStart, lt: todayEnd },
    };

    const [userCount, memberCount, orderCount, paidAggregate, todayPaidAggregate] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            OR: [
              { role: 'ADMIN' },
              { membership: { is: { expireAt: { gt: now } } } },
            ],
          },
        }),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          where: paidWhere,
          _sum: { amount: true },
        }),
        this.prisma.order.aggregate({
          where: todayPaidWhere,
          _sum: { amount: true },
        }),
      ]);

    return {
      userCount,
      memberCount,
      orderCount,
      paidAmount: Number(paidAggregate._sum.amount ?? 0),
      todayPaidAmount: Number(todayPaidAggregate._sum.amount ?? 0),
    };
  }
}
