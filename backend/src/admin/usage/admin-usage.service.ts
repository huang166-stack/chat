import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getPagination, toPage } from '../../common/utils/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminUsageQueryDto } from './dto/admin-usage-query.dto.js';

@Injectable()
export class AdminUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: AdminUsageQueryDto) {
    const { page, pageSize, skip, take } = getPagination(
      query.page,
      query.pageSize,
    );
    const { month, start, end } = resolveMonth(query.month);
    const createdRange = { gte: start, lt: end };
    const ledgerWhere: Prisma.UsageLedgerWhereInput = {
      createdAt: createdRange,
      ...(query.keyword
        ? { user: { username: { contains: query.keyword } } }
        : {}),
    };

    const [aggregate, groups, total] = await Promise.all([
      this.prisma.usageLedger.aggregate({
        where: ledgerWhere,
        _sum: { credits: true, tokensIn: true, tokensOut: true },
        _count: { _all: true },
      }),
      this.prisma.usageLedger.groupBy({
        by: ['userId'],
        where: ledgerWhere,
        _sum: { credits: true, tokensIn: true, tokensOut: true },
        _count: { _all: true },
        orderBy: { _sum: { credits: 'desc' } },
        skip,
        take,
      }),
      this.prisma.user.count({
        where: {
          ...(query.keyword
            ? { username: { contains: query.keyword } }
            : {}),
          usageLedgers: { some: { createdAt: createdRange } },
        },
      }),
    ]);

    const userIds = groups.map((group) => group.userId);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, nickname: true },
        })
      : [];
    const userMap = new Map(users.map((user) => [String(user.id), user]));
    const list = groups.map((group) => {
      const user = userMap.get(String(group.userId));
      return {
        userId: String(group.userId),
        username: user?.username ?? '未知用户',
        nickname: user?.nickname ?? null,
        credits: group._sum.credits ?? 0,
        tokensIn: group._sum.tokensIn ?? 0,
        tokensOut: group._sum.tokensOut ?? 0,
        entries: group._count._all,
      };
    });

    return {
      ...toPage(list, total, page, pageSize),
      month,
      totals: {
        credits: aggregate._sum.credits ?? 0,
        tokensIn: aggregate._sum.tokensIn ?? 0,
        tokensOut: aggregate._sum.tokensOut ?? 0,
        entries: aggregate._count._all,
      },
    };
  }
}

function resolveMonth(value?: string) {
  const now = new Date();
  const year = value ? Number(value.slice(0, 4)) : now.getFullYear();
  const month = value ? Number(value.slice(5, 7)) : now.getMonth() + 1;
  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}
