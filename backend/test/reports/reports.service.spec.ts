import type { ReviewReport } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import type { ContractQueueService } from '../../src/queue/queue.service.js';
import {
  ReportsService,
  buildReportFilename,
} from '../../src/reports/reports.service.js';
import type { StorageService } from '../../src/storage/storage.service.js';

function report(overrides: Partial<ReviewReport> = {}): ReviewReport {
  return {
    id: 1n,
    taskId: 2n,
    format: 'DOCX',
    storageKey: 'reports/9/2/采购合同_审查报告_20261023.docx',
    summaryJson: null,
    status: 'PENDING',
    errorMessage: null,
    createdAt: new Date('2026-10-23T03:00:00.000Z'),
    updatedAt: new Date('2026-10-23T03:00:00.000Z'),
    ...overrides,
  };
}

function createService(existing: ReviewReport | null = null) {
  const prisma = {
    contractProject: {
      findFirst: vi.fn().mockResolvedValue({ id: 10n, name: '采购合同' }),
    },
    reviewTask: {
      findFirst: vi.fn().mockResolvedValue({ id: 2n }),
    },
    reviewReport: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue(report()),
      update: vi.fn().mockResolvedValue(report()),
      findFirst: vi.fn().mockResolvedValue(existing),
    },
  };
  const queue = { enqueue: vi.fn().mockResolvedValue('job-1') };
  const storage = {
    signedUrl: vi.fn().mockResolvedValue('http://storage.local/report'),
  };
  const service = new ReportsService(
    prisma as unknown as PrismaService,
    queue as unknown as ContractQueueService,
    storage as unknown as StorageService,
  );
  return { service, prisma, queue, storage };
}

describe('ReportsService', () => {
  it('creates a report record and enqueues generation for the latest successful review', async () => {
    const { service, prisma, queue } = createService();

    const result = await service.create(10n, 9n, 'USER');

    expect(prisma.contractProject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 10n, userId: 9n }),
      }),
    );
    expect(prisma.reviewTask.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SUCCESS' }),
      }),
    );
    expect(prisma.reviewReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        taskId: 2n,
        format: 'DOCX',
        status: 'PENDING',
        storageKey: expect.stringMatching(
          /^reports\/9\/2\/采购合同_审查报告_\d{8}\.docx$/,
        ),
      }),
    });
    expect(queue.enqueue).toHaveBeenCalledWith(
      'generate-report',
      { taskId: '2', reportId: '1', userId: '9' },
      expect.objectContaining({
        jobId: expect.stringMatching(/^report-1-/),
        attempts: 3,
      }),
    );
    expect(result).toMatchObject({
      id: '1',
      taskId: '2',
      status: 'PENDING',
    });
  });

  it('does not enqueue again when the report is already complete', async () => {
    const { service, queue } = createService(
      report({ status: 'SUCCESS', summaryJson: { version: 1 } }),
    );

    await service.create(10n, 9n, 'USER');

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('returns a five-minute signed URL only after verifying ownership', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T04:00:00.000Z'));
    const { service, prisma, storage } = createService(
      report({
        status: 'SUCCESS',
        summaryJson: { reportFilename: '采购合同_审查报告_20261023.docx' },
      }),
    );

    const result = await service.download(1n, 9n, 'USER');

    expect(prisma.reviewReport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1n,
          task: expect.objectContaining({
            document: expect.objectContaining({
              project: expect.objectContaining({ userId: 9n }),
            }),
          }),
        }),
      }),
    );
    expect(storage.signedUrl).toHaveBeenCalledWith(report().storageKey, 300);
    expect(result).toEqual({
      url: 'http://storage.local/report',
      filename: '采购合同_审查报告_20261023.docx',
      format: 'DOCX',
      expiresAt: '2026-10-23T04:05:00.000Z',
    });
    vi.useRealTimers();
  });

  it('rejects downloads while generation is still running', async () => {
    const { service, storage } = createService(
      report({ status: 'PROCESSING' }),
    );

    await expect(service.download(1n, 9n, 'USER')).rejects.toThrow(
      '报告仍在生成中',
    );
    expect(storage.signedUrl).not.toHaveBeenCalled();
  });

  it('normalizes report filenames', () => {
    expect(
      buildReportFilename(
        '  采购/合同?.docx  ',
        new Date('2026-10-23T04:00:00.000Z'),
      ),
    ).toBe('采购_合同_.docx_审查报告_20261023.docx');
    expect(buildReportFilename('', new Date('2026-10-23T04:00:00.000Z'))).toBe(
      '合同_审查报告_20261023.docx',
    );
  });
});
