import JSZip from 'jszip';
import { ReportDocumentService } from '../../src/reports/report-document.service.js';
import type { ReportSnapshot } from '../../src/reports/report.types.js';

const snapshot: ReportSnapshot = {
  version: 1,
  generatedAt: '2026-10-23T04:00:00.000Z',
  reportFilename: '测试采购合同_审查报告_20261023.docx',
  contract: {
    id: '10',
    name: '测试采购合同',
    contractType: 'PURCHASE',
    stance: 'PARTY_A',
    counterparty: '示例供应商',
    documentFilename: 'contract.docx',
    pageCount: 8,
  },
  review: {
    taskId: '20',
    status: 'SUCCESS',
    ruleSetName: '采购合同规则集',
    ruleSetVersion: 2,
    modelName: 'test-model',
    completedAt: '2026-10-23T03:50:00.000Z',
  },
  statistics: {
    total: 2,
    high: 1,
    medium: 1,
    low: 0,
    open: 1,
    accepted: 1,
    ignored: 0,
    needsReview: 0,
  },
  findings: [
    {
      id: '1',
      clauseOrder: 3,
      pageStart: 2,
      pageEnd: 2,
      source: 'RULE',
      category: '付款',
      riskLevel: 'HIGH',
      title: '付款期限不明确',
      analysis: '合同未明确验收后付款的具体期限。',
      suggestion: '补充明确的付款天数与逾期责任。',
      legalBasis: '应保证价款支付条件清晰可执行。',
      evidence: '买方应在验收后尽快付款。',
      status: 'OPEN',
      updatedAt: '2026-10-23T03:40:00.000Z',
    },
    {
      id: '2',
      clauseOrder: null,
      pageStart: null,
      pageEnd: null,
      source: 'MODEL',
      category: '保密',
      riskLevel: 'MEDIUM',
      title: '缺少保密条款',
      analysis: '合同未约定商业秘密保护义务。',
      suggestion: '增加保密信息范围、期限和违约责任。',
      legalBasis: null,
      evidence: null,
      status: 'ACCEPTED',
      updatedAt: '2026-10-23T03:45:00.000Z',
    },
  ],
};

describe('ReportDocumentService', () => {
  it('generates a DOCX with all required sections and Chinese content', async () => {
    const service = new ReportDocumentService();

    const buffer = await service.generate(snapshot);
    const zip = await JSZip.loadAsync(buffer);
    const documentFile = zip.file('word/document.xml');

    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(documentFile).not.toBeNull();

    const xml = await documentFile!.async('string');
    for (const heading of [
      '审查范围与免责声明',
      '风险统计',
      '风险明细',
      '缺失条款与提示',
      '处理记录',
    ]) {
      expect(xml).toContain(heading);
    }
    expect(xml).toContain('测试采购合同');
    expect(xml).toContain('付款期限不明确');
    expect(xml).toContain('缺少保密条款');
    expect(xml).toContain('不构成正式法律意见');
    expect(xml).toContain('<w:tbl>');
  });
});
