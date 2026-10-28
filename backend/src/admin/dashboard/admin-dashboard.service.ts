import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ACTIVE_REVIEW_STATUSES } from '../../usage/usage.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const monitoringStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    const [reviewGroups, completedReviews, usageAggregate, modelCallCount] =
      await Promise.all([
        this.prisma.reviewTask.groupBy({
          by: ['status'],
          where: { createdAt: { gte: monitoringStart } },
          _count: { _all: true },
        }),
        this.prisma.reviewTask.findMany({
          where: {
            status: 'SUCCESS',
            createdAt: { gte: monitoringStart },
            startedAt: { not: null },
            completedAt: { not: null },
          },
          select: { startedAt: true, completedAt: true },
        }),
        this.prisma.usageLedger.aggregate({
          where: { createdAt: { gte: monitoringStart } },
          _sum: { tokensIn: true, tokensOut: true },
        }),
        this.prisma.usageLedger.count({
          where: {
            createdAt: { gte: monitoringStart },
            kind: 'MODEL_CALL',
          },
        }),
      ]);

    const statusCounts = new Map(
      reviewGroups.map((group) => [group.status, group._count._all]),
    );
    const reviewSuccess = statusCounts.get('SUCCESS') ?? 0;
    const reviewFailed = statusCounts.get('FAILED') ?? 0;
    const reviewCancelled = statusCounts.get('CANCELLED') ?? 0;
    const reviewActive = ACTIVE_REVIEW_STATUSES.reduce(
      (total, status) => total + (statusCounts.get(status) ?? 0),
      0,
    );
    const reviewTotal =
      reviewSuccess + reviewFailed + reviewCancelled + reviewActive;
    const finishedReviews = reviewSuccess + reviewFailed;
    const durations = completedReviews.flatMap((task) => {
      if (!task.startedAt || !task.completedAt) {
        return [];
      }
      return [Math.max(0, task.completedAt.getTime() - task.startedAt.getTime())];
    });
    const averageDurationMs = durations.length
      ? Math.round(
          durations.reduce((total, value) => total + value, 0) / durations.length,
        )
      : 0;
    const tokensIn = usageAggregate._sum.tokensIn ?? 0;
    const tokensOut = usageAggregate._sum.tokensOut ?? 0;
    const inputCostPerMillion =
      this.configService.get<number>('monitoring.inputCostPerMillionTokens') ??
      0;
    const outputCostPerMillion =
      this.configService.get<number>('monitoring.outputCostPerMillionTokens') ??
      0;
    const estimatedModelCost =
      (tokensIn * inputCostPerMillion + tokensOut * outputCostPerMillion) /
      1_000_000;

    return {
      userCount,
      memberCount,
      orderCount,
      paidAmount: Number(paidAggregate._sum.amount ?? 0),
      todayPaidAmount: Number(todayPaidAggregate._sum.amount ?? 0),
      monitoring: {
        windowDays: 7,
        reviewTotal,
        reviewSuccess,
        reviewFailed,
        reviewCancelled,
        reviewActive,
        successRate: finishedReviews
          ? Math.round((reviewSuccess / finishedReviews) * 10000) / 100
          : 0,
        averageDurationMs,
        averageDurationSeconds: Math.round(averageDurationMs / 100) / 10,
        tokensIn,
        tokensOut,
        modelCallCount,
        estimatedModelCost: Math.round(estimatedModelCost * 10000) / 10000,
        pricingConfigured: inputCostPerMillion > 0 || outputCostPerMillion > 0,
      },
    };
  }
}
