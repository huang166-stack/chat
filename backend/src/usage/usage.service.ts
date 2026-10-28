import { HttpStatus, Injectable } from '@nestjs/common';
import type { ReviewStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const ACTIVE_REVIEW_STATUSES: ReviewStatus[] = [
  'PENDING',
  'PARSING',
  'RULE_CHECK',
  'MODEL_REVIEW',
  'AGGREGATING',
];

const DEFAULT_REVIEW_QUOTA = 10;
const DEFAULT_MAX_CONTRACT_PAGES = 30;
const DEFAULT_MAX_FILE_SIZE_MB = 20;
const MAX_ACTIVE_REVIEWS_PER_USER = 1;

interface UsageLedgerClient {
  usageLedger: Pick<
    Prisma.TransactionClient['usageLedger'],
    'findFirst' | 'create'
  >;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanUpload(
    userId: bigint,
    role: string,
    sizeBytes: number,
    pageCount: number,
  ) {
    if (role === 'ADMIN') {
      return;
    }

    const allowance = await this.getAllowance(userId, false);
    if (sizeBytes > allowance.maxFileSizeMb * 1024 * 1024) {
      throw new BusinessException(
        `当前套餐单个文件不能超过 ${allowance.maxFileSizeMb}MB`,
        ErrorCodes.FILE_TOO_LARGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    if (pageCount > allowance.maxContractPages) {
      throw new BusinessException(
        `当前套餐单份合同最多 ${allowance.maxContractPages} 页`,
        ErrorCodes.FILE_PAGE_LIMIT_EXCEEDED,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async assertCanCreateReview(userId: bigint, role: string, pageCount: number) {
    if (role === 'ADMIN') {
      return {
        isAdmin: true,
        planName: null,
        quota: null,
        usedPages: 0,
        remainingPages: null,
        maxContractPages: null,
        maxFileSizeMb: null,
      };
    }

    const allowance = await this.getAllowance(userId, false);
    if (!allowance.isMember) {
      throw new BusinessException(
        '请先开通会员',
        ErrorCodes.NON_MEMBER,
        HttpStatus.FORBIDDEN,
      );
    }

    if (pageCount > allowance.maxContractPages) {
      throw new BusinessException(
        `当前套餐单份合同最多 ${allowance.maxContractPages} 页`,
        ErrorCodes.FILE_PAGE_LIMIT_EXCEEDED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const remainingPages = allowance.remainingPages ?? 0;
    if (pageCount > remainingPages) {
      throw new BusinessException(
        `本月审查额度不足，剩余 ${remainingPages} 页`,
        ErrorCodes.REVIEW_QUOTA_EXCEEDED,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (allowance.activeTasks >= MAX_ACTIVE_REVIEWS_PER_USER) {
      throw new BusinessException(
        '已有审查任务正在进行，请完成后再提交',
        ErrorCodes.REVIEW_CONCURRENCY_LIMIT,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return allowance;
  }

  async getSummary(userId: bigint, role: string) {
    const allowance = await this.getAllowance(userId, role === 'ADMIN');
    return {
      isMember: allowance.isMember,
      planName: allowance.planName,
      quota: allowance.quota,
      usedPages: allowance.usedPages,
      remainingPages: allowance.remainingPages,
      maxContractPages: allowance.maxContractPages,
      maxFileSizeMb: allowance.maxFileSizeMb,
      activeTasks: allowance.activeTasks,
      concurrencyLimit: role === 'ADMIN' ? null : MAX_ACTIVE_REVIEWS_PER_USER,
    };
  }

  async ensureReviewCharge(
    client: UsageLedgerClient,
    taskId: bigint,
    userId: bigint,
    pageCount: number,
  ) {
    const existing = await client.usageLedger.findFirst({
      where: { taskId, userId, kind: 'REVIEW' },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await client.usageLedger.create({
      data: {
        userId,
        taskId,
        kind: 'REVIEW',
        credits: Math.max(1, pageCount),
        note: `合同审查 ${Math.max(1, pageCount)} 页`,
      },
    });
  }

  async recordModelUsage(
    client: UsageLedgerClient,
    taskId: bigint,
    userId: bigint,
    usage: { tokensIn: number; tokensOut: number; calls: number },
  ) {
    if (usage.calls <= 0) {
      return;
    }

    const existing = await client.usageLedger.findFirst({
      where: { taskId, userId, kind: 'MODEL_CALL' },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await client.usageLedger.create({
      data: {
        userId,
        taskId,
        kind: 'MODEL_CALL',
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
        credits: 0,
        note: `合同审查模型调用 ${usage.calls} 次`,
      },
    });
  }

  private async getAllowance(userId: bigint, isAdmin: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });
    if (!user) {
      throw new BusinessException(
        '用户不存在',
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const isMember =
      isAdmin ||
      Boolean(
        user.membership && user.membership.expireAt.getTime() > Date.now(),
      );
    const plan = isAdmin ? null : await this.resolvePlan(userId);
    const quota = isAdmin ? null : (plan?.reviewQuota ?? DEFAULT_REVIEW_QUOTA);
    const usedPages = isAdmin ? 0 : await this.getMonthlyUsedPages(userId);
    const activeTasks = isAdmin ? 0 : await this.getActiveTaskCount(userId);

    return {
      isMember,
      isAdmin,
      planName: plan?.name ?? null,
      quota,
      usedPages,
      remainingPages: quota === null ? null : Math.max(0, quota - usedPages),
      maxContractPages: plan?.maxContractPages ?? DEFAULT_MAX_CONTRACT_PAGES,
      maxFileSizeMb: plan?.maxFileSizeMb ?? DEFAULT_MAX_FILE_SIZE_MB,
      activeTasks,
    };
  }

  private async resolvePlan(userId: bigint) {
    const paidOrder = await this.prisma.order.findFirst({
      where: { userId, status: 'PAID' },
      orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
      include: { plan: true },
    });
    if (paidOrder?.plan) {
      return paidOrder.plan;
    }

    return this.prisma.memberPlan.findFirst({
      where: { enabled: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
  }

  private async getMonthlyUsedPages(userId: bigint) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await this.prisma.usageLedger.aggregate({
      where: {
        userId,
        kind: 'REVIEW',
        createdAt: { gte: monthStart },
      },
      _sum: { credits: true },
    });
    return result._sum.credits ?? 0;
  }

  private async getActiveTaskCount(userId: bigint) {
    return this.prisma.reviewTask.count({
      where: {
        status: { in: ACTIVE_REVIEW_STATUSES },
        document: { project: { userId, deletedAt: null } },
      },
    });
  }
}
