import type { Job } from 'bullmq';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { ReportProcessor } from '../../src/queue/processors/report.processor.js';
import type { GenerateReportPayload } from '../../src/queue/queue.types.js';
import type { ReportDocumentService } from '../../src/reports/report-document.service.js';
import type { StorageService } from '../../src/storage/storage.service.js';

describe('ReportProcessor', () => {
  it('writes the generated DOCX and stores the report snapshot', async () => {
    const completedAt = new Date('2026-10-23T03:50:00.000Z');
    const updatedAt = new Date('2026-10-23T03:45:00.000Z');
    const task = {
      id: 2n,
      status: 'SUCCESS',
      stance: 'PARTY_A',
      ruleSetVersion: 1,
      completedAt,
      document: {
        filename: 'contract.docx',
        pageCount: 5,
        project: {
          id: 10n,
          name: '采购合同',
          contractType: 'PURCHASE',
          counterparty: null,
        },
      },
      ruleSet: { name: '默认规则集' },
      modelConfig: { modelName: 'test-model' },
      findings: [
        {
          id: 3n,
          source: 'RULE',
          category: '付款',
          riskLevel: 'HIGH',
          title: '付款期限不明确',
          analysis: '合同未明确付款期限。',
          suggestion: '补充付款期限。',
          legalBasis: null,
          evidence: null,
          status: 'OPEN',
          updatedAt,
          clause: { orderNo: 3, pageStart: 2, pageEnd: 2 },
        },
      ],
    };
    const prisma = {
      reviewReport: {
        findFirst: vi.fn().mockResolvedValue({
          id: 1n,
          taskId: 2n,
          status: 'PENDING',
          storageKey: 'reports/9/2/采购合同_审查报告_20261023.docx',
          task,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const storage = { put: vi.fn().mockResolvedValue(undefined) };
    const documentService = {
      generate: vi.fn().mockResolvedValue(Buffer.from('docx-data')),
    };
    const processor = new ReportProcessor(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      documentService as unknown as ReportDocumentService,
    );
    const job = {
      id: 'job-1',
      name: 'generate-report',
      data: { taskId: '2', reportId: '1', userId: '9' },
    } as Job<GenerateReportPayload>;

    const result = await processor.process(job);

    expect(storage.put).toHaveBeenCalledWith(
      'reports/9/2/采购合同_审查报告_20261023.docx',
      Buffer.from('docx-data'),
      expect.objectContaining({
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    expect(prisma.reviewReport.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: expect.objectContaining({
        status: 'SUCCESS',
        errorMessage: null,
        summaryJson: expect.objectContaining({
          statistics: expect.objectContaining({ total: 1, high: 1 }),
        }),
      }),
    });
    expect(result).toMatchObject({
      reportId: '1',
      status: 'SUCCESS',
      findingCount: 1,
    });
  });
});
