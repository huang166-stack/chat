import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CryptoService } from '../../common/services/crypto.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RuleRunnerService } from '../../reviews/rule-runner.service.js';
import { ReviewModelService } from '../../reviews/review-model.service.js';
import { ReviewProgressService } from '../../reviews/review-progress.service.js';
import { effectivePageCount } from '../../reviews/reviews.service.js';
import type {
  EvaluationClause,
  ReviewFindingDraft,
} from '../../rules/rules.types.js';
import { UsageService } from '../../usage/usage.service.js';
import type { ReviewDocumentPayload } from '../queue.types.js';

const REVIEW_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class ReviewProcessor {
  private readonly logger = new Logger(ReviewProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ReviewProgressService,
    private readonly ruleRunner: RuleRunnerService,
    private readonly reviewModel: ReviewModelService,
    private readonly usage: UsageService,
    private readonly crypto: CryptoService,
  ) {}

  async process(job: Job<ReviewDocumentPayload>) {
    const taskId = BigInt(job.data.taskId);
    const userId = BigInt(job.data.userId);
    const documentId = BigInt(job.data.documentId);
    const task = await this.prisma.reviewTask.findFirst({
      where: {
        id: taskId,
        documentId,
        document: { project: { userId } },
      },
      include: {
        document: {
          include: {
            project: true,
            clauses: { orderBy: { orderNo: 'asc' } },
          },
        },
        modelConfig: true,
      },
    });

    if (!task) {
      throw new Error('审查任务不存在');
    }
    if (task.status === 'SUCCESS') {
      return { taskId: String(taskId), skipped: true };
    }
    if (task.status === 'CANCELLED') {
      return { taskId: String(taskId), cancelled: true };
    }

    const deadline = Date.now() + REVIEW_TIMEOUT_MS;

    try {
      if (
        task.document.parseStatus !== 'SUCCESS' ||
        task.document.clauses.length === 0
      ) {
        throw new Error('合同尚未解析完成或没有可审查条款');
      }

      const started = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.reviewTask.updateMany({
          where: { id: taskId, status: { notIn: ['CANCELLED', 'SUCCESS'] } },
          data: {
            status: 'PARSING',
            progress: 5,
            errorMessage: null,
            startedAt: new Date(),
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
      if (!started) {
        if (await this.progress.isCancelled(taskId)) {
          return { taskId: String(taskId), cancelled: true };
        }
        return { taskId: String(taskId), skipped: true };
      }
      await this.progress.set(taskId, 'PARSING', 5);

      if (await this.progress.isCancelled(taskId)) {
        return { taskId: String(taskId), cancelled: true };
      }

      const clauses = task.document.clauses.map(toEvaluationClause);
      await this.progress.set(taskId, 'RULE_CHECK', 20);
      const ruleResult = await this.ruleRunner.run({
        clauses,
        ruleSetId: task.ruleSetId ?? undefined,
        contractType: task.document.project.contractType,
        stance: task.stance,
      });
      await this.prisma.reviewTask.update({
        where: { id: taskId },
        data: { ruleSetVersion: ruleResult.ruleSetVersion },
      });
      await this.replaceFindings(taskId, ruleResult.findings);
      await this.progress.set(taskId, 'RULE_CHECK', 35);

      if (await this.progress.isCancelled(taskId)) {
        return { taskId: String(taskId), cancelled: true };
      }

      let modelResult = {
        findings: [] as ReviewFindingDraft[],
        usage: { tokensIn: 0, tokensOut: 0, calls: 0 },
        failedCalls: 0,
        attemptedCalls: 0,
      };

      if (task.modelConfig) {
        await this.progress.set(taskId, 'MODEL_REVIEW', 40);
        try {
          modelResult = await this.reviewModel.review({
            documentName: task.document.filename,
            contractType: task.document.project.contractType,
            stance: task.stance,
            clauses,
            rules: ruleResult.rules,
            llmRequests: ruleResult.llmRequests,
            modelConfig: {
              baseUrl: task.modelConfig.baseUrl,
              apiKey: this.crypto.decrypt(task.modelConfig.apiKey),
              modelName: task.modelConfig.modelName,
              maxTokens: task.modelConfig.maxTokens,
              temperature: Number(task.modelConfig.temperature),
            },
            deadline,
            isCancelled: () => this.progress.isCancelled(taskId),
            onProgress: async (completed, total) => {
              const percent =
                total > 0 ? 40 + Math.floor((completed / total) * 35) : 75;
              await this.progress.set(taskId, 'MODEL_REVIEW', percent);
            },
          });
        } catch (error) {
          this.logger.warn('Model review degraded to rule-only result', {
            taskId: String(taskId),
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (await this.progress.isCancelled(taskId)) {
        return { taskId: String(taskId), cancelled: true };
      }

      await this.progress.set(taskId, 'AGGREGATING', 85);
      const findings = mergeFindings(ruleResult.findings, modelResult.findings);
      const pageCount = effectivePageCount(task.document);
      const now = new Date();

      await this.prisma.$transaction(async (tx) => {
        await tx.reviewFinding.deleteMany({ where: { taskId } });
        if (findings.length > 0) {
          await tx.reviewFinding.createMany({
            data: findings.map((finding) => ({
              taskId,
              clauseId: finding.clauseId,
              source: finding.source,
              ruleCode: finding.ruleCode,
              category: finding.category,
              riskLevel: finding.riskLevel,
              title: finding.title,
              analysis: finding.analysis,
              suggestion: finding.suggestion,
              legalBasis: finding.legalBasis,
              evidence: finding.evidence,
              confidence: finding.confidence,
            })),
          });
        }

        const updated = await tx.reviewTask.updateMany({
          where: { id: taskId, status: { notIn: ['CANCELLED', 'SUCCESS'] } },
          data: {
            status: 'SUCCESS',
            progress: 100,
            errorMessage: null,
            completedAt: now,
            ruleSetVersion: ruleResult.ruleSetVersion,
          },
        });
        if (updated.count === 0) {
          throw new ReviewCancelledError();
        }
        await tx.contractProject.update({
          where: { id: task.document.projectId },
          data: { status: 'COMPLETED' },
        });
        await this.usage.ensureReviewCharge(tx, taskId, userId, pageCount);
        await this.usage.recordModelUsage(
          tx,
          taskId,
          userId,
          modelResult.usage,
        );
      });

      await this.progress.set(taskId, 'SUCCESS', 100);
      return {
        taskId: String(taskId),
        status: 'SUCCESS',
        ruleFindings: ruleResult.findings.length,
        modelFindings: modelResult.findings.length,
        findingCount: findings.length,
      };
    } catch (error) {
      if (await this.progress.isCancelled(taskId)) {
        return { taskId: String(taskId), cancelled: true };
      }
      await this.markFailed(taskId, task.document.projectId, error);
      throw error;
    }
  }

  private async replaceFindings(
    taskId: bigint,
    findings: ReviewFindingDraft[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.reviewFinding.deleteMany({ where: { taskId } });
      if (findings.length > 0) {
        await tx.reviewFinding.createMany({
          data: findings.map((finding) => ({
            taskId,
            clauseId: finding.clauseId,
            source: finding.source,
            ruleCode: finding.ruleCode,
            category: finding.category,
            riskLevel: finding.riskLevel,
            title: finding.title,
            analysis: finding.analysis,
            suggestion: finding.suggestion,
            legalBasis: finding.legalBasis,
            evidence: finding.evidence,
            confidence: finding.confidence,
          })),
        });
      }
    });
  }

  private async markFailed(taskId: bigint, projectId: bigint, error: unknown) {
    const message = (
      error instanceof Error ? error.message : '合同审查失败'
    ).slice(0, 500);
    try {
      const marked = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.reviewTask.updateMany({
          where: { id: taskId, status: { notIn: ['CANCELLED', 'SUCCESS'] } },
          data: {
            status: 'FAILED',
            errorMessage: message,
            completedAt: new Date(),
          },
        });
        if (updated.count === 0) {
          return false;
        }
        await tx.contractProject.update({
          where: { id: projectId },
          data: { status: 'FAILED' },
        });
        return true;
      });
      if (marked) {
        await this.progress.set(taskId, 'FAILED', 100);
      }
    } catch (persistError) {
      this.logger.error('Failed to persist review failure state', persistError);
    }
  }
}

class ReviewCancelledError extends Error {
  constructor() {
    super('审查任务已取消');
    this.name = ReviewCancelledError.name;
  }
}

function toEvaluationClause(clause: {
  id: bigint;
  orderNo: number;
  clauseType: string | null;
  heading: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  charStart: number;
  charEnd: number;
}): EvaluationClause {
  return {
    id: clause.id,
    orderNo: clause.orderNo,
    clauseType: clause.clauseType,
    heading: clause.heading,
    content: clause.content,
    pageStart: clause.pageStart,
    pageEnd: clause.pageEnd,
    charStart: clause.charStart,
    charEnd: clause.charEnd,
  };
}

function mergeFindings(
  ruleFindings: ReviewFindingDraft[],
  modelFindings: ReviewFindingDraft[],
) {
  const merged = new Map<string, ReviewFindingDraft>();
  for (const finding of ruleFindings) {
    merged.set(findingKey(finding), finding);
  }
  for (const finding of modelFindings) {
    const key = findingKey(finding);
    if (!merged.has(key)) {
      merged.set(key, finding);
    }
  }

  const riskOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...merged.values()].sort(
    (left, right) =>
      (riskOrder[left.riskLevel] ?? 9) - (riskOrder[right.riskLevel] ?? 9) ||
      left.category.localeCompare(right.category, 'zh-CN') ||
      (left.clauseId ? Number(left.clauseId) : Number.MAX_SAFE_INTEGER) -
        (right.clauseId ? Number(right.clauseId) : Number.MAX_SAFE_INTEGER),
  );
}

function findingKey(finding: ReviewFindingDraft) {
  return `${finding.clauseId ?? 'document'}:${finding.category.toLowerCase()}`;
}
