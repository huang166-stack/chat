import { AdminReviewsService } from '../../src/admin/reviews/admin-reviews.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import type { ReviewsService } from '../../src/reviews/reviews.service.js';

function createService() {
  const startedAt = new Date('2026-10-01T10:00:00.000Z');
  const completedAt = new Date('2026-10-01T10:01:30.000Z');
  const task = {
    id: 1n,
    documentId: 2n,
    ruleSetId: 3n,
    modelConfigId: 4n,
    ruleSetVersion: 2,
    stance: 'NEUTRAL',
    status: 'FAILED',
    progress: 75,
    errorMessage: '模型调用超时',
    startedAt,
    completedAt,
    createdAt: startedAt,
    updatedAt: completedAt,
    document: {
      filename: '采购合同.pdf',
      pageCount: 12,
      project: {
        id: 6n,
        name: '采购合同审查',
        userId: 8n,
        user: { username: 'alice' },
      },
    },
    ruleSet: { name: '默认通用规则集' },
    modelConfig: { name: '主力模型' },
    _count: { findings: 4 },
  };
  const findMany = vi.fn().mockResolvedValue([task]);
  const count = vi.fn().mockResolvedValue(1);
  const prisma = {
    $transaction: vi.fn().mockResolvedValue([[task], 1]),
    reviewTask: { findMany, count },
  };
  const reviews = { retry: vi.fn().mockResolvedValue({ id: '1' }) };

  return {
    prisma,
    reviews,
    service: new AdminReviewsService(
      prisma as unknown as PrismaService,
      reviews as unknown as ReviewsService,
    ),
  };
}

describe('AdminReviewsService', () => {
  it('lists review tasks with duration and retry state', async () => {
    const { prisma, service } = createService();

    const result = await service.findAll({
      status: 'FAILED',
      keyword: 'alice',
      page: 1,
      pageSize: 10,
    });

    expect(prisma.reviewTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'FAILED',
          document: {
            project: {
              deletedAt: null,
              OR: [
                { name: { contains: 'alice' } },
                { user: { username: { contains: 'alice' } } },
              ],
            },
          },
        },
      }),
    );
    expect(result.list[0]).toMatchObject({
      id: '1',
      projectId: '6',
      username: 'alice',
      status: 'FAILED',
      durationMs: 90_000,
      findingCount: 4,
      canRetry: true,
    });
  });

  it('delegates retry with the administrator role', async () => {
    const { reviews, service } = createService();

    await service.retry(5n, 9n);

    expect(reviews.retry).toHaveBeenCalledWith(5n, 9n, 'ADMIN');
  });
});
