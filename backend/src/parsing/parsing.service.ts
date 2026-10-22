import { Injectable, Logger } from '@nestjs/common';
import type { ParseDocumentPayload } from '../queue/queue.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ClauseSplitterService } from './clause-splitter.service.js';
import { DocxParserService } from './docx-parser.service.js';
import type { ParsedDocument, ParseResult } from './parsing.types.js';
import { PdfParserService } from './pdf-parser.service.js';

const MIN_EXTRACTED_TEXT_CHARS = 20;
const MAX_PARSE_ERROR_CHARS = 500;

@Injectable()
export class ContractParsingService {
  private readonly logger = new Logger(ContractParsingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdfParser: PdfParserService,
    private readonly docxParser: DocxParserService,
    private readonly clauseSplitter: ClauseSplitterService,
  ) {}

  async parse(payload: ParseDocumentPayload): Promise<ParseResult> {
    const documentId = this.toBigInt(payload.documentId, 'documentId');
    const projectId = this.toBigInt(payload.projectId, 'projectId');
    const userId = this.toBigInt(payload.userId, 'userId');

    const document = await this.prisma.contractDocument.findFirst({
      where: {
        id: documentId,
        projectId,
        project: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        project: true,
      },
    });

    if (!document) {
      throw new Error('合同文档不存在或无权访问');
    }

    if (document.parseStatus === 'SUCCESS') {
      const clauseCount = await this.prisma.contractClause.count({
        where: { documentId },
      });
      if (clauseCount > 0) {
        return {
          documentId: String(documentId),
          clauseCount,
          skipped: true,
        };
      }
    }

    try {
      await this.prisma.contractDocument.update({
        where: { id: documentId },
        data: {
          parseStatus: 'PROCESSING',
          parseError: null,
        },
      });
      await this.prisma.contractProject.update({
        where: { id: projectId },
        data: { status: 'PARSING' },
      });

      const stored = await this.storage.get(document.storageKey);
      const parsed = await this.parseBuffer(document, stored.body);
      this.assertExtractedText(document.mimeType, parsed.text);

      const clauses = this.clauseSplitter.split(parsed);
      if (clauses.length === 0) {
        throw new Error('未能识别合同条款，请确认文件包含可读的条款正文');
      }

      const clauseCount = await this.prisma.$transaction(async (tx) => {
        await tx.contractClause.deleteMany({ where: { documentId } });
        await tx.contractClause.createMany({
          data: clauses.map((clause) => ({
            documentId,
            orderNo: clause.orderNo,
            clauseType: clause.clauseType,
            heading: clause.heading,
            content: clause.content,
            pageStart: clause.pageStart,
            pageEnd: clause.pageEnd,
            charStart: clause.charStart,
            charEnd: clause.charEnd,
          })),
        });
        await tx.contractDocument.update({
          where: { id: documentId },
          data: {
            parsedText: parsed.text,
            parseStatus: 'SUCCESS',
            parseError: null,
            ...(parsed.pageCount > 0 ? { pageCount: parsed.pageCount } : {}),
          },
        });
        await tx.contractProject.update({
          where: { id: projectId },
          data: { status: 'READY' },
        });

        return clauses.length;
      });

      return {
        documentId: String(documentId),
        clauseCount,
        skipped: false,
      };
    } catch (error) {
      await this.markFailed(documentId, projectId, error);
      throw error instanceof Error
        ? error
        : new Error('合同解析失败，请稍后重试');
    }
  }

  private async parseBuffer(
    document: { mimeType: string; filename: string },
    buffer: Buffer,
  ): Promise<ParsedDocument> {
    const mimeType = document.mimeType.toLowerCase();
    const filename = document.filename.toLowerCase();

    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
      return this.pdfParser.parse(buffer);
    }
    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      return this.docxParser.parse(buffer);
    }

    throw new Error('暂不支持该合同文件格式');
  }

  private assertExtractedText(mimeType: string, text: string) {
    const characterCount = text.replace(/\s/g, '').length;
    if (characterCount >= MIN_EXTRACTED_TEXT_CHARS) {
      return;
    }

    if (mimeType === 'application/pdf') {
      throw new Error('暂不支持扫描件，请上传可复制文本的 PDF');
    }
    throw new Error('未能从合同中提取到可识别的文本');
  }

  private async markFailed(
    documentId: bigint,
    projectId: bigint,
    error: unknown,
  ) {
    const message = this.errorMessage(error);
    const results = await Promise.allSettled([
      this.prisma.contractDocument.update({
        where: { id: documentId },
        data: {
          parseStatus: 'FAILED',
          parseError: message,
        },
      }),
      this.prisma.contractProject.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      }),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          'Failed to persist parsing failure state',
          result.reason,
        );
      }
    }
  }

  private errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : '合同解析失败';
    return message.slice(0, MAX_PARSE_ERROR_CHARS) || '合同解析失败';
  }

  private toBigInt(value: string, field: string): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new Error(`Invalid ${field}`);
    }
  }
}
