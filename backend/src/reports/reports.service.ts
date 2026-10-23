import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { ReviewReport } from '@prisma/client';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractQueueService } from '../queue/queue.service.js';
import { StorageService } from '../storage/storage.service.js';
import { stripControlCharacters } from './report-text.js';

const REPORT_URL_TTL_SECONDS = 300;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ContractQueueService,
    private readonly storage: StorageService,
  ) {}

  async create(projectId: bigint, userId: bigint, role: string) {
    const project = await this.requireProject(projectId, userId, role);
    const task = await this.prisma.reviewTask.findFirst({
      where: {
        status: 'SUCCESS',
        document: { projectId: project.id },
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (!task) {
      throw new BusinessException(
        '请先完成合同审查再生成报告',
        ErrorCodes.REPORT_NOT_READY,
        HttpStatus.BAD_REQUEST,
      );
    }

    const reportFilename = buildReportFilename(project.name);
    const storageKey = `reports/${String(userId)}/${String(task.id)}/${reportFilename}`;
    let report = await this.prisma.reviewReport.findUnique({
      where: { taskId: task.id },
    });
    let shouldEnqueue = false;

    if (!report) {
      try {
        report = await this.prisma.reviewReport.create({
          data: {
            taskId: task.id,
            format: 'DOCX',
            storageKey,
            status: 'PENDING',
          },
        });
        shouldEnqueue = true;
      } catch (error) {
        const raced = await this.prisma.reviewReport.findUnique({
          where: { taskId: task.id },
        });
        if (!raced) {
          throw error;
        }
        report = raced;
      }
    } else if (report.status === 'FAILED') {
      report = await this.prisma.reviewReport.update({
        where: { id: report.id },
        data: {
          status: 'PENDING',
          errorMessage: null,
          storageKey,
        },
      });
      shouldEnqueue = true;
    }

    if (shouldEnqueue) {
      try {
        await this.queue.enqueue(
          'generate-report',
          {
            taskId: String(task.id),
            reportId: String(report.id),
            userId: String(userId),
          },
          {
            jobId: `report-${String(report.id)}-${Date.now()}`,
            attempts: 3,
            backoffDelayMs: 2000,
          },
        );
      } catch (error) {
        this.logger.error('Failed to enqueue report generation', error);
        await this.markEnqueueFailed(report.id);
        throw new BusinessException(
          '报告任务提交失败，请稍后重试',
          ErrorCodes.REPORT_ENQUEUE_FAILED,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    return this.serialize(report);
  }

  async findLatest(projectId: bigint, userId: bigint, role: string) {
    const project = await this.requireProject(projectId, userId, role);
    const report = await this.prisma.reviewReport.findFirst({
      where: {
        task: {
          status: 'SUCCESS',
          document: { projectId: project.id },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return report ? this.serialize(report) : null;
  }

  async findOne(reportId: bigint, userId: bigint, role: string) {
    const report = await this.requireReport(reportId, userId, role);
    return this.serialize(report);
  }

  async download(reportId: bigint, userId: bigint, role: string) {
    const report = await this.requireReport(reportId, userId, role);
    if (report.status !== 'SUCCESS') {
      throw new BusinessException(
        report.status === 'FAILED'
          ? '报告生成失败，请重新生成'
          : '报告仍在生成中，请稍后再试',
        ErrorCodes.REPORT_NOT_READY,
        HttpStatus.CONFLICT,
      );
    }

    const url = await this.storage.signedUrl(
      report.storageKey,
      REPORT_URL_TTL_SECONDS,
    );
    return {
      url,
      filename: reportFilenameFromSummary(report),
      format: report.format,
      expiresAt: new Date(
        Date.now() + REPORT_URL_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  private async requireProject(
    projectId: bigint,
    userId: bigint,
    role: string,
  ) {
    const project = await this.prisma.contractProject.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        ...(role === 'ADMIN' ? {} : { userId }),
      },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new BusinessException(
        '合同不存在',
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return project;
  }

  private async requireReport(reportId: bigint, userId: bigint, role: string) {
    const report = await this.prisma.reviewReport.findFirst({
      where: {
        id: reportId,
        task: {
          document: {
            project: {
              deletedAt: null,
              ...(role === 'ADMIN' ? {} : { userId }),
            },
          },
        },
      },
    });
    if (!report) {
      throw new BusinessException(
        '报告不存在',
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return report;
  }

  private async markEnqueueFailed(reportId: bigint) {
    try {
      await this.prisma.reviewReport.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          errorMessage: '报告任务提交失败',
        },
      });
    } catch (error) {
      this.logger.error('Failed to mark report enqueue failure', error);
    }
  }

  private serialize(report: ReviewReport) {
    const summary =
      report.summaryJson &&
      typeof report.summaryJson === 'object' &&
      !Array.isArray(report.summaryJson)
        ? report.summaryJson
        : null;

    return {
      id: String(report.id),
      taskId: String(report.taskId),
      format: report.format,
      status: report.status,
      errorMessage: report.errorMessage,
      summary,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}

export function buildReportFilename(contractName: string, now = new Date()) {
  const normalized = stripControlCharacters(contractName.normalize('NFKC'))
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 80);
  const baseName = normalized || '合同';
  const date = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .replace(/\D/g, '');

  return `${baseName}_审查报告_${date}.docx`;
}

function reportFilenameFromSummary(report: ReviewReport) {
  const summary = report.summaryJson as { reportFilename?: unknown } | null;
  if (summary && typeof summary.reportFilename === 'string') {
    return summary.reportFilename;
  }
  return report.storageKey.split('/').pop() ?? '合同审查报告.docx';
}
