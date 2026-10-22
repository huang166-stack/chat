import { ClauseSplitterService } from '../../src/parsing/clause-splitter.service.js';
import { DocxParserService } from '../../src/parsing/docx-parser.service.js';
import { ContractParsingService } from '../../src/parsing/parsing.service.js';
import type { ParsedDocument } from '../../src/parsing/parsing.types.js';
import { PdfParserService } from '../../src/parsing/pdf-parser.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { StorageService } from '../../src/storage/storage.service.js';

function parsedDocument(text: string): ParsedDocument {
  return {
    text,
    pages: [
      {
        pageNumber: 1,
        text,
        charStart: 0,
        charEnd: text.length,
      },
    ],
    pageCount: 1,
  };
}

function setup(options: { parseStatus?: string; text?: string } = {}) {
  const document = {
    id: 1n,
    projectId: 2n,
    filename: 'contract.pdf',
    mimeType: 'application/pdf',
    storageKey: 'contracts/3/2026/10/contract.pdf',
    parseStatus: options.parseStatus ?? 'PENDING',
    project: {
      id: 2n,
      userId: 3n,
      status: 'PARSING',
    },
  };
  const tx = {
    contractClause: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    contractDocument: {
      update: vi.fn().mockResolvedValue({}),
    },
    contractProject: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    contractDocument: {
      findFirst: vi.fn().mockResolvedValue(document),
      update: vi.fn().mockResolvedValue({}),
    },
    contractProject: {
      update: vi.fn().mockResolvedValue({}),
    },
    contractClause: {
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );

  const text =
    options.text ??
    [
      '第一条 付款方式',
      '买方应在收到发票后三十日内支付货款。',
      '第二条 保密义务',
      '双方应对商业秘密承担保密义务。',
    ].join('\n');
  const storage = {
    get: vi.fn().mockResolvedValue({
      body: Buffer.from('document'),
      contentType: 'application/pdf',
      size: 8,
    }),
  };
  const pdfParser = {
    parse: vi.fn().mockResolvedValue(parsedDocument(text)),
  };
  const docxParser = {
    parse: vi.fn(),
  };
  const service = new ContractParsingService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
    pdfParser as unknown as PdfParserService,
    docxParser as unknown as DocxParserService,
    new ClauseSplitterService(),
  );

  return { service, prisma, tx, storage, pdfParser };
}

describe('ContractParsingService', () => {
  it('writes clauses and marks the document and project as ready', async () => {
    const { service, prisma, tx, storage } = setup();

    const result = await service.parse({
      documentId: '1',
      projectId: '2',
      userId: '3',
    });

    expect(result).toEqual({
      documentId: '1',
      clauseCount: 2,
      skipped: false,
    });
    expect(prisma.contractDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1n,
          projectId: 2n,
          project: expect.objectContaining({ userId: 3n }),
        }),
      }),
    );
    expect(storage.get).toHaveBeenCalledWith(
      'contracts/3/2026/10/contract.pdf',
    );
    expect(tx.contractClause.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          documentId: 1n,
          orderNo: 1,
          clauseType: 'PAYMENT',
          charStart: 0,
        }),
        expect.objectContaining({
          documentId: 1n,
          orderNo: 2,
          clauseType: 'CONFIDENTIALITY',
        }),
      ],
    });
    expect(tx.contractDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parseStatus: 'SUCCESS',
          parseError: null,
        }),
      }),
    );
    expect(tx.contractProject.update).toHaveBeenCalledWith({
      where: { id: 2n },
      data: { status: 'READY' },
    });
  });

  it('rejects scanned PDFs with a friendly reason and marks them failed', async () => {
    const { service, prisma } = setup({ text: '   \n\n  ' });

    await expect(
      service.parse({ documentId: '1', projectId: '2', userId: '3' }),
    ).rejects.toThrow('暂不支持扫描件，请上传可复制文本的 PDF');

    expect(prisma.contractDocument.update).toHaveBeenLastCalledWith({
      where: { id: 1n },
      data: {
        parseStatus: 'FAILED',
        parseError: '暂不支持扫描件，请上传可复制文本的 PDF',
      },
    });
    expect(prisma.contractProject.update).toHaveBeenLastCalledWith({
      where: { id: 2n },
      data: { status: 'FAILED' },
    });
  });

  it('skips reprocessing when a successful parse already has clauses', async () => {
    const { service, prisma, tx, pdfParser } = setup({
      parseStatus: 'SUCCESS',
    });
    prisma.contractClause.count.mockResolvedValue(2);

    const result = await service.parse({
      documentId: '1',
      projectId: '2',
      userId: '3',
    });

    expect(result).toEqual({
      documentId: '1',
      clauseCount: 2,
      skipped: true,
    });
    expect(pdfParser.parse).not.toHaveBeenCalled();
    expect(tx.contractClause.createMany).not.toHaveBeenCalled();
  });
});
