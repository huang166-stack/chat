import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getPagination, toPage } from '../../common/utils/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReviewsService } from '../../reviews/reviews.service.js';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto.js';

type AdminReviewTask = Prisma.ReviewTaskGetPayload<{
  include: {
    document: {
      include: {
        project: {
          include: {
            user: { select: { username: true } };
          };
        };
      };
    };
    ruleSet: true;
    modelConfig: true;
    _count: { select: { findings: true } };
  };
}>;

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
  ) {}

  async findAll(query: AdminReviewQueryDto) {
    const { page, pageSize, skip, take } = getPagination(
      query.page,
      query.pageSize,
    );
    const projectWhere: Prisma.ContractProjectWhereInput = {
      deletedAt: null,
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword } },
              { user: { username: { contains: query.keyword } } },
            ],
          }
        : {}),
    };
    const where: Prisma.ReviewTaskWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      document: { project: projectWhere },
    };

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.reviewTask.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        include: {
          document: {
            include: {
              project: {
                include: {
                  user: { select: { username: true } },
                },
              },
            },
          },
          ruleSet: true,
          modelConfig: true,
          _count: { select: { findings: true } },
        },
      }),
      this.prisma.reviewTask.count({ where }),
    ]);

    return toPage(
      tasks.map((task) => this.serialize(task)),
      total,
      page,
      pageSize,
    );
  }

  async retry(taskId: bigint, adminUserId: bigint) {
    return this.reviews.retry(taskId, adminUserId, 'ADMIN');
  }

  private serialize(task: AdminReviewTask) {
    const endAt = task.completedAt ?? (task.startedAt ? new Date() : null);
    return {
      id: String(task.id),
      projectId: String(task.document.project.id),
      projectName: task.document.project.name,
      filename: task.document.filename,
      username: task.document.project.user.username,
      pageCount: task.document.pageCount,
      ruleSetName: task.ruleSet?.name ?? null,
      ruleSetVersion: task.ruleSetVersion,
      modelName: task.modelConfig?.name ?? null,
      status: task.status,
      progress: task.progress,
      errorMessage: task.errorMessage,
      findingCount: task._count.findings,
      durationMs:
        task.startedAt && endAt
          ? Math.max(0, endAt.getTime() - task.startedAt.getTime())
          : null,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      canRetry: task.status === 'FAILED' || task.status === 'CANCELLED',
    };
  }
}
