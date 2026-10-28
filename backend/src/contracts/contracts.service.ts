import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { ContractDocument, ContractProject } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { getPagination, toPage } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractQueueService } from '../queue/queue.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ACTIVE_REVIEW_STATUSES } from '../usage/usage.service.js';
import {
  ALLOWED_CONTRACT_FILE_TYPES,
  MAX_CONTRACT_FILE_BYTES,
  MAX_CONTRACT_PAGES,
  type AllowedContractFileType,
  type UploadedContractFile,
} from './contracts.constants.js';
import type { ContractQueryDto } from './dto/contract-query.dto.js';
import type { UploadContractDto } from './dto/upload-contract.dto.js';

interface ValidatedContractFile {
  filename: string;
  fileType: AllowedContractFileType;
  pageCount: number;
}

export interface UploadContractResult {
  projectId: string;
  documentId: string;
  duplicate: boolean;
  status: ContractProject['status'];
  parseStatus: ContractDocument['parseStatus'];
}

export interface FindingCounts {
  total: number;
  high: number;
  medium: number;
  low: number;
}

interface TaskRecord {
  id: bigint;
  status: string;
  progress: number;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  ruleSet: { name: string; version: number } | null;
  modelConfig: { name: string } | null;
}

interface ClauseRecord {
  id: bigint;
  orderNo: number;
  clauseType: string | null;
  heading: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
}

interface DocumentRecord {
  id: bigint;
  filename: string;
  mimeType: string;
  size: number;
  pageCount: number;
  parseStatus: string;
  parseError: string | null;
  createdAt: Date;
  clauses?: ClauseRecord[];
  tasks: TaskRecord[];
}

interface ProjectRecord {
  id: bigint;
  name: string;
  contractType: string;
  counterparty: string | null;
  stance: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  documents: DocumentRecord[];
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: ContractQueueService,
  ) {}

  async findAll(userId: bigint, query: ContractQueryDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const keyword = query.keyword?.trim();
    const where: Prisma.ContractProjectWhereInput = {
      userId,
      deletedAt: null,
      ...(query.contractType ? { contractType: query.contractType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { documents: { some: { filename: { contains: keyword } } } },
            ],
          }
        : {}),
    };

    const [projects, total] = await Promise.all([
      this.prisma.contractProject.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          documents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              tasks: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { ruleSet: true, modelConfig: true },
              },
            },
          },
        },
      }),
      this.prisma.contractProject.count({ where }),
    ]);

    const taskIds = projects.flatMap((project) =>
      project.documents[0]?.tasks[0] ? [project.documents[0].tasks[0].id] : [],
    );
    const grouped =
      taskIds.length > 0
        ? await this.prisma.reviewFinding.groupBy({
            by: ['taskId', 'riskLevel'],
            where: { taskId: { in: taskIds } },
            _count: { _all: true },
          })
        : [];
    const findingsByTask = this.countFindingsByTask(grouped);

    return toPage(
      (projects as ProjectRecord[]).map((project) => {
        const document = project.documents[0] ?? null;
        const latestTask = document?.tasks[0] ?? null;
        return {
          id: String(project.id),
          name: project.name,
          contractType: project.contractType,
          counterparty: project.counterparty,
          stance: project.stance,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          document: document ? this.serializeDocumentSummary(document) : null,
          latestTask: latestTask
            ? this.serializeTask(latestTask, findingsByTask.get(String(latestTask.id)))
            : null,
        };
      }),
      total,
      page,
      pageSize,
    );
  }

  async findOne(userId: bigint, projectId: bigint) {
    const project = await this.prisma.contractProject.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            clauses: { orderBy: { orderNo: 'asc' } },
            tasks: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                ruleSet: true,
                modelConfig: true,
                findings: { select: { riskLevel: true, status: true } },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new BusinessException(
        '合同不存在',
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const record = project as ProjectRecord & {
      documents: Array<
        DocumentRecord & {
          clauses: ClauseRecord[];
          tasks: Array<TaskRecord & { findings: Array<{ riskLevel: string; status: string }> }>;
        }
      >;
    };
    const document = record.documents[0] ?? null;
    const latestTask = document?.tasks[0] ?? null;

    return {
      id: String(record.id),
      name: record.name,
      contractType: record.contractType,
      counterparty: record.counterparty,
      stance: record.stance,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      document: document
        ? {
            ...this.serializeDocumentSummary(document),
            clauses: (document.clauses ?? []).map((clause) => ({
              id: String(clause.id),
              orderNo: clause.orderNo,
              clauseType: clause.clauseType,
              heading: clause.heading,
              content: clause.content,
              pageStart: clause.pageStart,
              pageEnd: clause.pageEnd,
            })),
          }
        : null,
      latestTask: latestTask
        ? this.serializeTask(latestTask, this.countFindings(latestTask.findings))
        : null,
    };
  }

  async getOverview(userId: bigint) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const projectScope = { userId, deletedAt: null };

    const [contracts, reviewedThisMonth, activeReviews, findings, highFindings, reports] =
      await Promise.all([
        this.prisma.contractProject.count({
          where: { userId, deletedAt: null },
        }),
        this.prisma.reviewTask.count({
          where: {
            createdAt: { gte: monthStart },
            document: { project: projectScope },
          },
        }),
        this.prisma.reviewTask.count({
          where: {
            status: { in: ACTIVE_REVIEW_STATUSES },
            document: { project: projectScope },
          },
        }),
        this.prisma.reviewFinding.count({
          where: { task: { document: { project: projectScope } } },
        }),
        this.prisma.reviewFinding.count({
          where: {
            riskLevel: 'HIGH',
            task: { document: { project: projectScope } },
          },
        }),
        this.prisma.reviewReport.count({
          where: {
            status: 'SUCCESS',
            task: { document: { project: projectScope } },
          },
        }),
      ]);

    return {
      contracts,
      reviewedThisMonth,
      activeReviews,
      findings,
      highFindings,
      reports,
    };
  }

  async upload(
    userId: bigint,
    file: UploadedContractFile | undefined,
    dto: UploadContractDto,
  ): Promise<UploadContractResult> {
    const validatedFile = await this.validateFile(file);
    const sha256 = createHash('sha256').update(file!.buffer).digest('hex');

    const duplicate = await this.prisma.contractDocument.findFirst({
      where: {
        sha256,
        project: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        project: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (duplicate) {
      return {
        projectId: String(duplicate.projectId),
        documentId: String(duplicate.id),
        duplicate: true,
        status: duplicate.project.status,
        parseStatus: duplicate.parseStatus,
      };
    }

    const storageKey = this.createStorageKey(
      userId,
      validatedFile.fileType.extension,
    );

    try {
      await this.storage.put(storageKey, file!.buffer, {
        contentType: validatedFile.fileType.mimeType,
      });
    } catch (error) {
      this.logger.error('Failed to store contract file', error);
      throw new BusinessException(
        '上传服务暂时不可用，请稍后重试',
        ErrorCodes.UPLOAD_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let project: ContractProject;
    let document: ContractDocument;

    try {
      ({ project, document } = await this.prisma.$transaction(async (tx) => {
        const createdProject = await tx.contractProject.create({
          data: {
            userId,
            name:
              dto.name?.trim() ||
              this.defaultProjectName(validatedFile.filename),
            contractType: dto.contractType,
            stance: dto.stance ?? 'NEUTRAL',
            status: 'PARSING',
          },
        });

        const createdDocument = await tx.contractDocument.create({
          data: {
            projectId: createdProject.id,
            filename: validatedFile.filename,
            mimeType: validatedFile.fileType.mimeType,
            size: file!.buffer.length,
            pageCount: validatedFile.pageCount,
            sha256,
            storageKey,
            parseStatus: 'PENDING',
          },
        });

        return {
          project: createdProject,
          document: createdDocument,
        };
      }));
    } catch (error) {
      this.logger.error('Failed to persist contract upload', error);
      await this.deleteStoredFile(storageKey);
      throw new BusinessException(
        '合同保存失败，请稍后重试',
        ErrorCodes.UPLOAD_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      await this.queue.enqueue(
        'parse-document',
        {
          documentId: String(document.id),
          projectId: String(project.id),
          userId: String(userId),
        },
        {
          jobId: `parse-document-${document.id}`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue parse job for document ${document.id}`,
        error,
      );
      await this.rollbackUpload(project.id, storageKey);
      throw new BusinessException(
        '解析任务创建失败，请稍后重试',
        ErrorCodes.UPLOAD_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      projectId: String(project.id),
      documentId: String(document.id),
      duplicate: false,
      status: project.status,
      parseStatus: document.parseStatus,
    };
  }

  private async validateFile(
    file: UploadedContractFile | undefined,
  ): Promise<ValidatedContractFile> {
    if (!file?.buffer) {
      throw new BusinessException(
        '请选择要上传的合同文件',
        ErrorCodes.FILE_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (file.buffer.length > MAX_CONTRACT_FILE_BYTES) {
      throw new BusinessException(
        '合同文件不能超过 20MB',
        ErrorCodes.FILE_TOO_LARGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const filename = this.safeFilename(file.originalname);
    const extension = extname(filename).toLowerCase();
    const fileType =
      extension === '.pdf' || extension === '.docx'
        ? ALLOWED_CONTRACT_FILE_TYPES[extension]
        : undefined;

    if (!filename || !fileType) {
      throw new BusinessException(
        '仅支持 PDF 或 DOCX 格式的合同文件',
        ErrorCodes.FILE_TYPE_NOT_ALLOWED,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    const declaredMime = file.mimetype?.split(';')[0].trim().toLowerCase();
    if (
      declaredMime &&
      declaredMime !== fileType.mimeType &&
      declaredMime !== 'application/octet-stream'
    ) {
      throw new BusinessException(
        '文件 MIME 类型不受支持',
        ErrorCodes.FILE_TYPE_NOT_ALLOWED,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (
      !detectedType ||
      detectedType.mime !== fileType.mimeType ||
      detectedType.ext !== fileType.extension.slice(1)
    ) {
      throw new BusinessException(
        '文件内容与扩展名不匹配',
        ErrorCodes.FILE_TYPE_NOT_ALLOWED,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    const pageCount =
      fileType.extension === '.pdf'
        ? await this.readPdfPageCount(file.buffer)
        : await this.readDocxPageCount(file.buffer);

    if (pageCount > MAX_CONTRACT_PAGES) {
      throw new BusinessException(
        `合同页数不能超过 ${MAX_CONTRACT_PAGES} 页`,
        ErrorCodes.FILE_PAGE_LIMIT_EXCEEDED,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      filename,
      fileType,
      pageCount,
    };
  }

  private async readPdfPageCount(buffer: Buffer): Promise<number> {
    try {
      const pdf = await PDFDocument.load(buffer, {
        updateMetadata: false,
      });
      const pageCount = pdf.getPageCount();
      if (pageCount <= 0) {
        throw new Error('PDF has no pages');
      }
      return pageCount;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        'PDF 文件已损坏或无法读取',
        ErrorCodes.FILE_INVALID,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async readDocxPageCount(buffer: Buffer): Promise<number> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      if (!zip.file('word/document.xml')) {
        throw new Error('DOCX main document is missing');
      }

      const appProperties = await zip.file('docProps/app.xml')?.async('string');
      if (!appProperties) {
        return 0;
      }

      const match = /<Pages>\s*(\d+)\s*<\/Pages>/i.exec(appProperties);
      if (!match) {
        return 0;
      }

      const pageCount = Number(match[1]);
      return Number.isSafeInteger(pageCount) && pageCount > 0 ? pageCount : 0;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        'DOCX 文件已损坏或无法读取',
        ErrorCodes.FILE_INVALID,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private serializeDocumentSummary(document: DocumentRecord) {
    return {
      id: String(document.id),
      filename: document.filename,
      mimeType: document.mimeType,
      size: document.size,
      pageCount: document.pageCount,
      parseStatus: document.parseStatus,
      parseError: document.parseError,
      createdAt: document.createdAt,
    };
  }

  private serializeTask(task: TaskRecord, counts?: FindingCounts) {
    return {
      id: String(task.id),
      status: task.status,
      progress: task.progress,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      ruleSetName: task.ruleSet?.name ?? null,
      ruleSetVersion: task.ruleSet?.version ?? null,
      modelName: task.modelConfig?.name ?? null,
      findingCounts: counts ?? { total: 0, high: 0, medium: 0, low: 0 },
    };
  }

  private countFindings(findings: Array<{ riskLevel: string }>): FindingCounts {
    return findings.reduce<FindingCounts>(
      (counts, finding) => {
        counts.total += 1;
        if (finding.riskLevel === 'HIGH') counts.high += 1;
        if (finding.riskLevel === 'MEDIUM') counts.medium += 1;
        if (finding.riskLevel === 'LOW') counts.low += 1;
        return counts;
      },
      { total: 0, high: 0, medium: 0, low: 0 },
    );
  }

  private countFindingsByTask(
    grouped: Array<{
      taskId: bigint;
      riskLevel: string;
      _count: { _all: number };
    }>,
  ) {
    const result = new Map<string, FindingCounts>();
    for (const row of grouped) {
      const key = String(row.taskId);
      const counts = result.get(key) ?? { total: 0, high: 0, medium: 0, low: 0 };
      counts.total += row._count._all;
      if (row.riskLevel === 'HIGH') counts.high += row._count._all;
      if (row.riskLevel === 'MEDIUM') counts.medium += row._count._all;
      if (row.riskLevel === 'LOW') counts.low += row._count._all;
      result.set(key, counts);
    }
    return result;
  }

  private safeFilename(rawName: string | undefined): string {
    return basename((rawName ?? '').replace(/\\/g, '/').replace(/\0/g, ''))
      .trim()
      .slice(0, 255);
  }

  private defaultProjectName(filename: string): string {
    const name = filename.slice(0, filename.length - extname(filename).length);
    return (name.trim() || '未命名合同').slice(0, 128);
  }

  private createStorageKey(
    userId: bigint,
    extension: AllowedContractFileType['extension'],
  ): string {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `contracts/${String(userId)}/${year}/${month}/${randomUUID()}${extension}`;
  }

  private async rollbackUpload(projectId: bigint, storageKey: string) {
    try {
      await this.prisma.contractProject.delete({
        where: { id: projectId },
      });
    } catch (error) {
      this.logger.error(`Failed to roll back project ${projectId}`, error);
    }

    await this.deleteStoredFile(storageKey);
  }

  private async deleteStoredFile(storageKey: string) {
    try {
      await this.storage.delete(storageKey);
    } catch (error) {
      this.logger.error(`Failed to delete stored file ${storageKey}`, error);
    }
  }
}
