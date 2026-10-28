import type { PrismaService } from '../../src/prisma/prisma.service.js';
import type { ContractQueueService } from '../../src/queue/queue.service.js';
import type { ReviewProgressService } from '../../src/reviews/review-progress.service.js';
import { ReviewsService } from '../../src/reviews/reviews.service.js';
import type { RuleSetService } from '../../src/rules/rule-set.service.js';
import type { UsageService } from '../../src/usage/usage.service.js';

describe('ReviewsService retry ownership', () => {
  it('re-enqueues an administrator retry under the contract owner', async () => {
    const task = {
      id: 1n,
      documentId: 2n,
      ruleSetId: 3n,
      modelConfigId: null,
      ruleSetVersion: 1,
      stance: 'NEUTRAL',
      status: 'FAILED',
      progress: 100,
      errorMessage: 'queue failed',
      startedAt: null,
      completedAt: new Date('2026-10-28T00:00:00.000Z'),
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
      updatedAt: new Date('2026-10-28T00:00:00.000Z'),
      document: {
        id: 2n,
        filename: 'contract.pdf',
        pageCount: 12,
        parsedText: 'contract text',
        projectId: 3n,
        project: {
          id: 3n,
          name: '采购合同',
          userId: 7n,
          deletedAt: null,
        },
      },
      ruleSet: null,
      modelConfig: null,
    };
    const tx = {
      reviewTask: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reviewFinding: { deleteMany: vi.fn() },
      contractProject: { update: vi.fn() },
    };
    const prisma = {
      reviewTask: {
        findFirst: vi.fn().mockResolvedValue(task),
      },
      reviewFinding: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const queue = { enqueue: vi.fn().mockResolvedValue('job-1') };
    const usage = { assertCanCreateReview: vi.fn() };
    const ruleSets = { load: vi.fn() };
    const progress = { clearCancellation: vi.fn() };
    const service = new ReviewsService(
      prisma as unknown as PrismaService,
      queue as unknown as ContractQueueService,
      usage as unknown as UsageService,
      ruleSets as unknown as RuleSetService,
      progress as unknown as ReviewProgressService,
    );

    await service.retry(1n, 99n, 'ADMIN');

    expect(usage.assertCanCreateReview).toHaveBeenCalledWith(7n, 'ADMIN', 12);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'review-document',
      expect.objectContaining({ taskId: '1', documentId: '2', userId: '7' }),
      expect.any(Object),
    );
  });
});
