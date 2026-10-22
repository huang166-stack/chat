import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { UsageService } from '../../src/usage/usage.service.js';

function createService(
  options: {
    expired?: boolean;
    usedPages?: number;
    activeTasks?: number;
    quota?: number;
    maxPages?: number;
  } = {},
) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 1n,
        role: 'USER',
        membership: {
          expireAt: options.expired
            ? new Date(Date.now() - 60_000)
            : new Date(Date.now() + 86_400_000),
        },
      }),
    },
    order: {
      findFirst: vi.fn().mockResolvedValue({
        plan: {
          name: '专业版',
          reviewQuota: options.quota ?? 20,
          maxContractPages: options.maxPages ?? 30,
        },
      }),
    },
    memberPlan: { findFirst: vi.fn() },
    usageLedger: {
      aggregate: vi.fn().mockResolvedValue({
        _sum: { credits: options.usedPages ?? 5 },
      }),
    },
    reviewTask: {
      count: vi.fn().mockResolvedValue(options.activeTasks ?? 0),
    },
  };

  return {
    prisma,
    service: new UsageService(prisma as unknown as PrismaService),
  };
}

describe('UsageService', () => {
  it('returns the remaining monthly pages for a member', async () => {
    const { service } = createService();
    const allowance = await service.assertCanCreateReview(1n, 'USER', 10);

    expect(allowance).toMatchObject({
      planName: '专业版',
      quota: 20,
      usedPages: 5,
      remainingPages: 15,
      maxContractPages: 30,
    });
  });

  it('rejects non-members before creating a review', async () => {
    const { service } = createService({ expired: true });
    await expect(service.assertCanCreateReview(1n, 'USER', 1)).rejects.toThrow(
      '请先开通会员',
    );
  });

  it('rejects documents that exceed the monthly page quota', async () => {
    const { service } = createService({ usedPages: 19 });
    await expect(service.assertCanCreateReview(1n, 'USER', 2)).rejects.toThrow(
      '本月审查额度不足，剩余 1 页',
    );
  });

  it('enforces one active review per user', async () => {
    const { service } = createService({ activeTasks: 1 });
    await expect(service.assertCanCreateReview(1n, 'USER', 1)).rejects.toThrow(
      '已有审查任务正在进行',
    );
  });

  it('writes the review charge only once', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1n });
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1n });
    const client = { usageLedger: { findFirst, create } };
    const { service } = createService();

    await service.ensureReviewCharge(client, 2n, 1n, 12);
    await service.ensureReviewCharge(client, 2n, 1n, 12);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 2n,
        userId: 1n,
        kind: 'REVIEW',
        credits: 12,
      }),
    });
  });
});
