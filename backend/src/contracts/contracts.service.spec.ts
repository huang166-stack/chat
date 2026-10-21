import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractQueueService } from '../queue/queue.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  MAX_CONTRACT_FILE_BYTES,
  type UploadedContractFile,
} from './contracts.constants.js';
import { ContractsService } from './contracts.service.js';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function createPdf(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    pdf.addPage();
  }
  return Buffer.from(await pdf.save());
}

async function createDocx(pageCount?: number): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip
    .folder('_rels')
    ?.file(
      '.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    );
  zip
    .folder('word')
    ?.file(
      'document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p><w:r><w:t>测试合同</w:t></w:r></w:p></w:body>' +
        '</w:document>',
    );

  if (pageCount !== undefined) {
    zip
      .folder('docProps')
      ?.file(
        'app.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
          `<Pages>${pageCount}</Pages>` +
          '</Properties>',
      );
  }

  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

function uploadFile(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): UploadedContractFile {
  return {
    originalname,
    mimetype,
    size: buffer.length,
    buffer,
  };
}

function setup() {
  const prisma = {
    contractDocument: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    contractProject: {
      create: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };

  prisma.contractProject.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 1n,
      ...data,
    }),
  );
  prisma.contractDocument.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 2n,
      ...data,
    }),
  );
  prisma.$transaction.mockImplementation(
    async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );

  const storage = {
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const queue = {
    enqueue: vi.fn().mockResolvedValue('job-1'),
  };
  const service = new ContractsService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
    queue as unknown as ContractQueueService,
  );

  return { service, prisma, storage, queue };
}

async function expectBusinessError(promise: Promise<unknown>, code: number) {
  try {
    await promise;
    throw new Error('Expected a business exception');
  } catch (error) {
    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).getResponse()).toMatchObject({ code });
  }
}

describe('ContractsService', () => {
  it('stores a valid PDF, creates the project and document, and enqueues parsing', async () => {
    const { service, prisma, storage, queue } = setup();
    const buffer = await createPdf(2);

    const result = await service.upload(
      1n,
      uploadFile(buffer, '销售合同.pdf', 'application/pdf'),
      { contractType: 'SALES', name: '年度销售合同' },
    );

    expect(result).toEqual({
      projectId: '1',
      documentId: '2',
      duplicate: false,
      status: 'PARSING',
      parseStatus: 'PENDING',
    });
    expect(prisma.contractProject.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1n,
        name: '年度销售合同',
        contractType: 'SALES',
        stance: 'NEUTRAL',
        status: 'PARSING',
      }),
    });
    expect(prisma.contractDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        filename: '销售合同.pdf',
        mimeType: 'application/pdf',
        pageCount: 2,
        parseStatus: 'PENDING',
      }),
    });
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^contracts\/1\/\d{4}\/\d{2}\/[a-f0-9-]+\.pdf$/),
      buffer,
      { contentType: 'application/pdf' },
    );
    expect(queue.enqueue).toHaveBeenCalledWith(
      'parse-document',
      { documentId: '2', projectId: '1', userId: '1' },
      { jobId: 'parse-document-2' },
    );
  });

  it('accepts DOCX files and reads the optional page metadata', async () => {
    const { service, prisma, storage } = setup();
    const buffer = await createDocx(4);

    await service.upload(1n, uploadFile(buffer, 'NDA.docx', DOCX_MIME), {
      contractType: 'NDA',
    });

    expect(prisma.contractDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mimeType: DOCX_MIME,
        pageCount: 4,
      }),
    });
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/\.docx$/),
      buffer,
      { contentType: DOCX_MIME },
    );
  });

  it('rejects an extension whose content does not match', async () => {
    const { service, storage, queue } = setup();
    const buffer = Buffer.from('this is not a real pdf');

    await expectBusinessError(
      service.upload(1n, uploadFile(buffer, 'fake.pdf', 'application/pdf'), {
        contractType: 'OTHER',
      }),
      ErrorCodes.FILE_TYPE_NOT_ALLOWED,
    );

    expect(storage.put).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('rejects files over 20MB', async () => {
    const { service } = setup();
    const buffer = Buffer.alloc(MAX_CONTRACT_FILE_BYTES + 1);

    await expectBusinessError(
      service.upload(1n, uploadFile(buffer, 'large.pdf', 'application/pdf'), {
        contractType: 'OTHER',
      }),
      ErrorCodes.FILE_TOO_LARGE,
    );
  });

  it('rejects PDFs with more than 30 pages', async () => {
    const { service } = setup();
    const buffer = await createPdf(31);

    await expectBusinessError(
      service.upload(1n, uploadFile(buffer, 'long.pdf', 'application/pdf'), {
        contractType: 'SERVICE',
      }),
      ErrorCodes.FILE_PAGE_LIMIT_EXCEEDED,
    );
  });

  it('reuses a duplicate document only within the same user', async () => {
    const { service, prisma, storage, queue } = setup();
    prisma.contractDocument.findFirst.mockResolvedValue({
      id: 9n,
      projectId: 8n,
      parseStatus: 'SUCCESS',
      project: { status: 'READY' },
    });
    const buffer = await createPdf(1);

    const result = await service.upload(
      1n,
      uploadFile(buffer, '重复合同.pdf', 'application/pdf'),
      { contractType: 'SALES' },
    );

    expect(result).toEqual({
      projectId: '8',
      documentId: '9',
      duplicate: true,
      status: 'READY',
      parseStatus: 'SUCCESS',
    });
    expect(prisma.contractDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sha256: expect.any(String),
          project: expect.objectContaining({ userId: 1n, deletedAt: null }),
        }),
      }),
    );
    expect(storage.put).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('does not reuse another user document', async () => {
    const { service, prisma, storage } = setup();
    const buffer = await createPdf(1);

    await service.upload(
      2n,
      uploadFile(buffer, '另一个用户的合同.pdf', 'application/pdf'),
      { contractType: 'PURCHASE' },
    );

    expect(prisma.contractDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: expect.objectContaining({ userId: 2n }),
        }),
      }),
    );
    expect(storage.put).toHaveBeenCalled();
  });

  it('rolls back the database record and stored file when enqueueing fails', async () => {
    const { service, prisma, storage, queue } = setup();
    queue.enqueue.mockRejectedValue(new Error('redis unavailable'));
    const buffer = await createPdf(1);

    await expectBusinessError(
      service.upload(
        1n,
        uploadFile(buffer, 'queue-failure.pdf', 'application/pdf'),
        { contractType: 'OTHER' },
      ),
      ErrorCodes.UPLOAD_UNAVAILABLE,
    );

    expect(prisma.contractProject.delete).toHaveBeenCalledWith({
      where: { id: 1n },
    });
    expect(storage.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^contracts\/1\//),
    );
  });
});
