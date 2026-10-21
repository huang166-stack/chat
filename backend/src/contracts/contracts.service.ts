import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { ContractDocument, ContractProject } from '@prisma/client';
import { fileTypeFromBuffer } from 'file-type';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractQueueService } from '../queue/queue.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  ALLOWED_CONTRACT_FILE_TYPES,
  MAX_CONTRACT_FILE_BYTES,
  MAX_CONTRACT_PAGES,
  type AllowedContractFileType,
  type UploadedContractFile,
} from './contracts.constants.js';
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

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: ContractQueueService,
  ) {}

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
