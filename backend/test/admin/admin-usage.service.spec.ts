import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { AdminUsageService } from '../../src/admin/usage/admin-usage.service.js';

function createService() {
  const aggregate = vi.fn().mockResolvedValue({
    _sum: { credits: 25, tokensIn: 1000, tokensOut: 400 },
    _count: { _all: 3 },
  });
  const groupBy = vi.fn().mockResolvedValue([
    {
      userId: 7n,
      _sum: { credits: 25, tokensIn: 1000, tokensOut: 400 },
      _count: { _all: 3 },
    },
  ]);
  const user = {
    count: vi.fn().mockResolvedValue(1),
    findMany: vi.fn().mockResolvedValue([
      { id: 7n, username: 'alice', nickname: 'Alice' },
    ]),
  };
  const prisma = {
    usageLedger: { aggregate, groupBy },
    user,
  };

  return {
    prisma,
    service: new AdminUsageService(prisma as unknown as PrismaService),
  };
}

describe('AdminUsageService', () => {
  it('aggregates the selected month directly from the usage ledger', async () => {
    const { prisma, service } = createService();

    const result = await service.getSummary({
      month: '2026-10',
      keyword: 'ali',
      page: 2,
      pageSize: 10,
    });

    const expectedRange = {
      gte: new Date(2026, 9, 1),
      lt: new Date(2026, 10, 1),
    };
    expect(prisma.usageLedger.aggregate).toHaveBeenCalledWith({
      where: {
        createdAt: expectedRange,
        user: { username: { contains: 'ali' } },
      },
      _sum: { credits: true, tokensIn: true, tokensOut: true },
      _count: { _all: true },
    });
    expect(prisma.usageLedger.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['userId'],
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toMatchObject({
      month: '2026-10',
      total: 1,
      page: 2,
      pageSize: 10,
      totals: {
        credits: 25,
        tokensIn: 1000,
        tokensOut: 400,
        entries: 3,
      },
      list: [
        {
          userId: '7',
          username: 'alice',
          nickname: 'Alice',
          credits: 25,
          tokensIn: 1000,
          tokensOut: 400,
          entries: 3,
        },
      ],
    });
  });
});
