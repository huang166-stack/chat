import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Prisma, ReviewTask } from '@prisma/client';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { getPagination, toPage } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractQueueService } from '../queue/queue.service.js';
import { RuleSetService } from '../rules/rule-set.service.js';
import {
  UsageService,
  ACTIVE_REVIEW_STATUSES,
} from '../usage/usage.service.js';
import type {
  CreateReviewDto,
  ReviewFindingQueryDto,
  UpdateFindingDto,
} from './dto/review.dto.js';
import { ReviewProgressService } from './review-progress.service.js';

type TaskWithRelations = Prisma.ReviewTaskGetPayload<{
  include: {
    document: { include: { project: true } };
    ruleSet: true;
    modelConfig: true;
  };
}>;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ContractQueueService,
    private readonly usage: UsageService,
    private readonly ruleSets: RuleSetService,
    private readonly progress: ReviewProgressService,
  ) {}

  async create(
    userId: bigint,
    role: string,
    projectId: bigint,
    dto: CreateReviewDto,
  ) {
    const project = await this.prisma.contractProject.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!project) {
      throw this.notFound('合同不存在', ErrorCodes.NOT_FOUND);
    }

    const document = project.documents[0];
    if (!document || document.parseStatus !== 'SUCCESS') {
      throw new BusinessException(
        '合同尚未解析完成，暂时不能审查',
        ErrorCodes.REVIEW_NOT_READY,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pageCount = effectivePageCount(document);
    await this.usage.assertCanCreateReview(userId, role, pageCount);

    const stance = dto.stance ?? project.stance;
    const ruleSet = await this.ruleSets.load({
      ruleSetId: dto.ruleSetId ? BigInt(dto.ruleSetId) : undefined,
      contractType: project.contractType,
      stance,
    });
    const modelConfig = await this.resolveModelConfig(dto.modelConfigId);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reviewTask.create({
        data: {
          documentId: document.id,
          ruleSetId: ruleSet.id,
          modelConfigId: modelConfig?.id ?? null,
          ruleSetVersion: ruleSet.version,
          stance,
          status: 'PENDING',
          progress: 0,
        },
      });
      await tx.contractProject.update({
        where: { id: project.id },
        data: { status: 'REVIEWING', stance },
      });
      return created;
    });

    try {
      await this.enqueue(task, userId, `review-${String(task.id)}`);
    } catch (error) {
      this.logger.error('Failed to enqueue review task', error);
      await this.markEnqueueFailed(task.id, project.id);
      throw new BusinessException(
        '审查任务提交失败，请稍后重试',
        ErrorCodes.REVIEW_ENQUEUE_FAILED,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return this.getTask(task.id, userId, role);
  }

  async getTask(taskId: bigint, userId: bigint, role: string) {
    const task = await this.requireTask(taskId, userId, role);
    const counts = await this.prisma.reviewFinding.groupBy({
      by: ['riskLevel'],
      where: { taskId },
      _count: { _all: true },
    });
    const findingCounts = { total: 0, high: 0, medium: 0, low: 0 };
    for (const item of counts) {
      const count = item._count._all;
      findingCounts.total += count;
      if (item.riskLevel === 'HIGH') findingCounts.high = count;
      if (item.riskLevel === 'MEDIUM') findingCounts.medium = count;
      if (item.riskLevel === 'LOW') findingCounts.low = count;
    }

    return this.serialize(task, findingCounts);
  }

  async retry(taskId: bigint, userId: bigint, role: string) {
    const task = await this.requireTask(taskId, userId, role);
    if (task.status !== 'FAILED' && task.status !== 'CANCELLED') {
      throw new BusinessException(
        '只有失败或已取消的任务可以重试',
        ErrorCodes.REVIEW_STATE_CONFLICT,
        HttpStatus.CONFLICT,
      );
    }

    const pageCount = effectivePageCount(task.document);
    await this.usage.assertCanCreateReview(userId, role, pageCount);
    await this.progress.clearCancellation(taskId);

    const retried = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reviewTask.updateMany({
        where: { id: taskId, status: { in: ['FAILED', 'CANCELLED'] } },
        data: {
          status: 'PENDING',
          progress: 0,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
        },
      });
      if (updated.count === 0) {
        return false;
      }
      await tx.reviewFinding.deleteMany({ where: { taskId } });
      await tx.contractProject.update({
        where: { id: task.document.projectId },
        data: { status: 'REVIEWING' },
      });
      return true;
    });
    if (!retried) {
      throw new BusinessException(
        '任务状态已变化，请刷新后重试',
        ErrorCodes.REVIEW_STATE_CONFLICT,
        HttpStatus.CONFLICT,
      );
    }

    try {
      await this.enqueue(
        task,
        userId,
        `review-${String(taskId)}-retry-${Date.now()}`,
      );
    } catch (error) {
      this.logger.error('Failed to re-enqueue review task', error);
      await this.markEnqueueFailed(taskId, task.document.projectId);
      throw new BusinessException(
        '审查任务提交失败，请稍后重试',
        ErrorCodes.REVIEW_ENQUEUE_FAILED,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return this.getTask(taskId, userId, role);
  }

  async cancel(taskId: bigint, userId: bigint, role: string) {
    const task = await this.requireTask(taskId, userId, role);
    if (task.status === 'CANCELLED') {
      return this.getTask(taskId, userId, role);
    }
    if (!ACTIVE_REVIEW_STATUSES.includes(task.status)) {
      throw new BusinessException(
        '当前任务状态不能取消',
        ErrorCodes.REVIEW_STATE_CONFLICT,
        HttpStatus.CONFLICT,
      );
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reviewTask.updateMany({
        where: { id: taskId, status: { in: ACTIVE_REVIEW_STATUSES } },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          errorMessage: null,
        },
      });
      if (updated.count === 0) {
        return false;
      }
      await tx.contractProject.update({
        where: { id: task.document.projectId },
        data: { status: 'READY' },
      });
      return true;
    });
    if (!cancelled) {
      const latest = await this.getTask(taskId, userId, role);
      if (latest.status === 'CANCELLED') {
        return latest;
      }
      throw new BusinessException(
        '任务状态已变化，无法取消',
        ErrorCodes.REVIEW_STATE_CONFLICT,
        HttpStatus.CONFLICT,
      );
    }
    await this.progress.markCancelled(taskId);

    return this.getTask(taskId, userId, role);
  }

  async findFindings(
    projectId: bigint,
    userId: bigint,
    role: string,
    query: ReviewFindingQueryDto,
  ) {
    const project = await this.prisma.contractProject.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        ...(role === 'ADMIN' ? {} : { userId }),
      },
      select: { id: true },
    });
    if (!project) {
      throw this.notFound('合同不存在', ErrorCodes.NOT_FOUND);
    }

    const task = await this.prisma.reviewTask.findFirst({
      where: {
        document: { projectId },
        status: 'SUCCESS',
        ...(query.taskId ? { id: BigInt(query.taskId) } : {}),
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (!task) {
      return toPage([], 0, 1, query.pageSize);
    }

    const findings = await this.prisma.reviewFinding.findMany({
      where: {
        taskId: task.id,
        ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
      },
      include: { clause: true },
    });
    const sorted = findings.sort(compareFindings);
    const { page, pageSize, skip, take } = getPagination(
      query.page,
      query.pageSize,
    );

    return toPage(
      sorted.slice(skip, skip + take).map((finding) => ({
        id: String(finding.id),
        taskId: String(finding.taskId),
        clauseId: finding.clauseId ? String(finding.clauseId) : null,
        clauseOrder: finding.clause?.orderNo ?? null,
        pageStart: finding.clause?.pageStart ?? null,
        pageEnd: finding.clause?.pageEnd ?? null,
        source: finding.source,
        ruleCode: finding.ruleCode,
        category: finding.category,
        riskLevel: finding.riskLevel,
        title: finding.title,
        analysis: finding.analysis,
        suggestion: finding.suggestion,
        legalBasis: finding.legalBasis,
        evidence: finding.evidence,
        confidence: finding.confidence ? Number(finding.confidence) : null,
        status: finding.status,
        createdAt: finding.createdAt,
        updatedAt: finding.updatedAt,
      })),
      sorted.length,
      page,
      pageSize,
    );
  }

  async updateFinding(
    findingId: bigint,
    userId: bigint,
    role: string,
    dto: UpdateFindingDto,
  ) {
    const finding = await this.prisma.reviewFinding.findFirst({
      where: {
        id: findingId,
        task: {
          document: {
            project: {
              deletedAt: null,
              ...(role === 'ADMIN' ? {} : { userId }),
            },
          },
        },
      },
      select: { id: true },
    });
    if (!finding) {
      throw this.notFound('风险项不存在', ErrorCodes.NOT_FOUND);
    }

    const updated = await this.prisma.reviewFinding.update({
      where: { id: findingId },
      data: { status: dto.status },
    });
    return {
      id: String(updated.id),
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  private async requireTask(taskId: bigint, userId: bigint, role: string) {
    const task = await this.prisma.reviewTask.findFirst({
      where: {
        id: taskId,
        ...(role === 'ADMIN'
          ? {}
          : { document: { project: { userId, deletedAt: null } } }),
      },
      include: {
        document: { include: { project: true } },
        ruleSet: true,
        modelConfig: true,
      },
    });
    if (!task) {
      throw this.notFound('审查任务不存在', ErrorCodes.NOT_FOUND);
    }
    return task;
  }

  private async resolveModelConfig(modelConfigId?: string) {
    if (modelConfigId) {
      const config = await this.prisma.modelConfig.findFirst({
        where: { id: BigInt(modelConfigId), enabled: 1 },
      });
      if (!config) {
        throw this.notFound('模型配置不存在或已停用', ErrorCodes.NOT_FOUND);
      }
      return config;
    }

    return this.prisma.modelConfig.findFirst({
      where: { enabled: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
  }

  private async enqueue(task: ReviewTask, userId: bigint, jobId: string) {
    return this.queue.enqueue(
      'review-document',
      {
        taskId: String(task.id),
        documentId: String(task.documentId),
        userId: String(userId),
      },
      { jobId, attempts: 3, backoffDelayMs: 5000 },
    );
  }

  private async markEnqueueFailed(taskId: bigint, projectId: bigint) {
    await Promise.allSettled([
      this.prisma.reviewTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: '审查任务提交失败',
          completedAt: new Date(),
        },
      }),
      this.prisma.contractProject.update({
        where: { id: projectId },
        data: { status: 'READY' },
      }),
    ]);
  }

  private serialize(
    task: TaskWithRelations,
    findingCounts: { total: number; high: number; medium: number; low: number },
  ) {
    return {
      id: String(task.id),
      documentId: String(task.documentId),
      projectId: String(task.document.projectId),
      projectName: task.document.project.name,
      filename: task.document.filename,
      pageCount: effectivePageCount(task.document),
      ruleSetId: task.ruleSetId ? String(task.ruleSetId) : null,
      ruleSetName: task.ruleSet?.name ?? null,
      ruleSetVersion: task.ruleSetVersion,
      modelConfigId: task.modelConfigId ? String(task.modelConfigId) : null,
      modelName: task.modelConfig?.name ?? null,
      stance: task.stance,
      status: task.status,
      progress: task.progress,
      errorMessage: task.errorMessage,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      findingCounts,
    };
  }

  private notFound(message: string, code: number) {
    return new BusinessException(message, code, HttpStatus.NOT_FOUND);
  }
}

export function effectivePageCount(document: {
  pageCount: number;
  parsedText: string | null;
}) {
  if (document.pageCount > 0) {
    return document.pageCount;
  }
  const text = document.parsedText ?? '';
  return Math.max(1, Math.ceil(text.length / 1800));
}

function compareFindings(
  left: {
    riskLevel: string;
    category: string;
    clause: { orderNo: number } | null;
  },
  right: {
    riskLevel: string;
    category: string;
    clause: { orderNo: number } | null;
  },
) {
  const risk = { HIGH: 0, MEDIUM: 1, LOW: 2 } as Record<string, number>;
  return (
    (risk[left.riskLevel] ?? 9) - (risk[right.riskLevel] ?? 9) ||
    left.category.localeCompare(right.category, 'zh-CN') ||
    (left.clause?.orderNo ?? Number.MAX_SAFE_INTEGER) -
      (right.clause?.orderNo ?? Number.MAX_SAFE_INTEGER)
  );
}
