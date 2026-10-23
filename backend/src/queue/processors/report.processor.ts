import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportDocumentService } from '../../reports/report-document.service.js';
import type {
  ReportFindingSnapshot,
  ReportRiskLevel,
  ReportSnapshot,
} from '../../reports/report.types.js';
import { StorageService } from '../../storage/storage.service.js';
import type { GenerateReportPayload } from '../queue.types.js';

const REPORT_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type ReportTask = Prisma.ReviewTaskGetPayload<{
  include: {
    document: { include: { project: true } };
    ruleSet: true;
    modelConfig: true;
    findings: { include: { clause: true } };
  };
}>;

@Injectable()
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly documentService: ReportDocumentService,
  ) {}

  async process(job: Job<GenerateReportPayload>) {
    const reportId = BigInt(job.data.reportId);
    const taskId = BigInt(job.data.taskId);
    const userId = BigInt(job.data.userId);

    const report = await this.prisma.reviewReport.findFirst({
      where: {
        id: reportId,
        taskId,
        task: { document: { project: { userId } } },
      },
      include: {
        task: {
          include: {
            document: { include: { project: true } },
            ruleSet: true,
            modelConfig: true,
            findings: { include: { clause: true } },
          },
        },
      },
    });
    if (!report) {
      throw new Error('审查报告不存在');
    }
    if (report.status === 'SUCCESS') {
      return { reportId: String(report.id), skipped: true };
    }
    if (report.task.status !== 'SUCCESS') {
      throw new Error('审查任务尚未成功完成');
    }

    const claimed = await this.prisma.reviewReport.updateMany({
      where: { id: report.id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PROCESSING', errorMessage: null },
    });
    if (claimed.count === 0) {
      return { reportId: String(report.id), skipped: true };
    }

    try {
      const snapshot = createSnapshot(report.task, report.storageKey);
      const buffer = await this.documentService.generate(snapshot);
      await this.storage.put(report.storageKey, buffer, {
        contentType: REPORT_CONTENT_TYPE,
      });
      await this.prisma.reviewReport.update({
        where: { id: report.id },
        data: {
          status: 'SUCCESS',
          summaryJson: snapshot as unknown as Prisma.InputJsonValue,
          errorMessage: null,
        },
      });

      return {
        reportId: String(report.id),
        status: 'SUCCESS',
        findingCount: snapshot.statistics.total,
        bytes: buffer.byteLength,
      };
    } catch (error) {
      const message = (
        error instanceof Error ? error.message : '报告生成失败'
      ).slice(0, 500);
      this.logger.error('Report generation failed', {
        reportId: String(report.id),
        taskId: String(taskId),
        message,
      });
      await this.prisma.reviewReport
        .updateMany({
          where: { id: report.id, status: { not: 'SUCCESS' } },
          data: { status: 'FAILED', errorMessage: message },
        })
        .catch((persistError: unknown) => {
          this.logger.error(
            'Failed to persist report failure state',
            persistError,
          );
        });
      throw error;
    }
  }
}

function createSnapshot(task: ReportTask, storageKey: string): ReportSnapshot {
  const findings = task.findings.map(toFindingSnapshot).sort(compareFindings);
  const statistics = {
    total: findings.length,
    high: findings.filter((item) => item.riskLevel === 'HIGH').length,
    medium: findings.filter((item) => item.riskLevel === 'MEDIUM').length,
    low: findings.filter((item) => item.riskLevel === 'LOW').length,
    open: findings.filter((item) => item.status === 'OPEN').length,
    accepted: findings.filter((item) => item.status === 'ACCEPTED').length,
    ignored: findings.filter((item) => item.status === 'IGNORED').length,
    needsReview: findings.filter((item) => item.status === 'NEEDS_REVIEW')
      .length,
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    reportFilename: storageKey.split('/').pop() ?? '合同审查报告.docx',
    contract: {
      id: String(task.document.project.id),
      name: task.document.project.name,
      contractType: task.document.project.contractType,
      stance: task.stance,
      counterparty: task.document.project.counterparty,
      documentFilename: task.document.filename,
      pageCount: Math.max(1, task.document.pageCount),
    },
    review: {
      taskId: String(task.id),
      status: task.status,
      ruleSetName: task.ruleSet?.name ?? null,
      ruleSetVersion: task.ruleSetVersion,
      modelName: task.modelConfig?.modelName ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
    },
    statistics,
    findings,
  };
}

function toFindingSnapshot(
  finding: ReportTask['findings'][number],
): ReportFindingSnapshot {
  return {
    id: String(finding.id),
    clauseOrder: finding.clause?.orderNo ?? null,
    pageStart: finding.clause?.pageStart ?? null,
    pageEnd: finding.clause?.pageEnd ?? null,
    source: finding.source,
    category: finding.category,
    riskLevel: finding.riskLevel,
    title: finding.title,
    analysis: finding.analysis,
    suggestion: finding.suggestion,
    legalBasis: finding.legalBasis,
    evidence: finding.evidence,
    status: finding.status,
    updatedAt: finding.updatedAt.toISOString(),
  };
}

function compareFindings(
  left: ReportFindingSnapshot,
  right: ReportFindingSnapshot,
) {
  const riskOrder: Record<ReportRiskLevel, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  return (
    riskOrder[left.riskLevel] - riskOrder[right.riskLevel] ||
    left.category.localeCompare(right.category, 'zh-CN') ||
    (left.clauseOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.clauseOrder ?? Number.MAX_SAFE_INTEGER)
  );
}
