import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type {
  ReportFindingSnapshot,
  ReportRiskLevel,
  ReportSnapshot,
} from './report.types.js';
import { stripControlCharacters } from './report-text.js';

const FONT_FAMILY = 'Microsoft YaHei';
const BODY_COLOR = '263233';
const MUTED_COLOR = '667273';
const BRAND_COLOR = '008F7A';
const LINE_COLOR = 'DCE4E4';

const RISK_LABELS: Record<ReportRiskLevel, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

const RISK_COLORS: Record<ReportRiskLevel, string> = {
  HIGH: 'C0392B',
  MEDIUM: 'A66A12',
  LOW: '1C6D9B',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: '待处理',
  ACCEPTED: '已采纳',
  IGNORED: '已忽略',
  NEEDS_REVIEW: '需复核',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SALES: '销售合同',
  PURCHASE: '采购合同',
  NDA: '保密协议',
  EMPLOYMENT: '劳动合同',
  LEASE: '租赁合同',
  SERVICE: '服务合同',
  OTHER: '其他合同',
};

const STANCE_LABELS: Record<string, string> = {
  PARTY_A: '甲方立场',
  PARTY_B: '乙方立场',
  NEUTRAL: '中立立场',
};

const SOURCE_LABELS: Record<string, string> = {
  RULE: '规则检查',
  MODEL: '模型审查',
};

export class ReportDocumentService {
  async generate(snapshot: ReportSnapshot): Promise<Buffer> {
    const document = new Document({
      creator: '合同审查助手',
      title: snapshot.reportFilename,
      description: `${snapshot.contract.name}审查报告`,
      styles: {
        default: {
          document: {
            run: {
              font: FONT_FAMILY,
              size: 21,
              color: BODY_COLOR,
            },
            paragraph: {
              spacing: { line: 330, after: 100 },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 160 },
                  children: [
                    new TextRun({
                      text: '本报告由合同审查助手生成 · 不构成法律意见',
                      font: FONT_FAMILY,
                      size: 16,
                      color: MUTED_COLOR,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: this.buildChildren(snapshot),
        },
      ],
    });

    return Packer.toBuffer(document);
  }

  private buildChildren(snapshot: ReportSnapshot) {
    return [
      ...this.buildCover(snapshot),
      ...this.buildScope(snapshot),
      ...this.buildStatistics(snapshot),
      ...this.buildFindings(snapshot.findings),
      ...this.buildMissingClauses(snapshot.findings),
      ...this.buildProcessingRecords(snapshot.findings),
    ];
  }

  private buildCover(snapshot: ReportSnapshot) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2100, after: 260 },
        children: [
          new TextRun({
            text: 'CONFIDENTIAL · CONTRACT REVIEW',
            font: FONT_FAMILY,
            size: 18,
            color: BRAND_COLOR,
            characterSpacing: 60,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 },
        children: [
          new TextRun({
            text: '合同审查报告',
            font: FONT_FAMILY,
            size: 52,
            bold: true,
            color: '102020',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [
          new TextRun({
            text: cleanText(snapshot.contract.name),
            font: FONT_FAMILY,
            size: 30,
            color: BODY_COLOR,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `报告日期：${formatDate(snapshot.generatedAt)}`,
            font: FONT_FAMILY,
            size: 20,
            color: MUTED_COLOR,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [
          new TextRun({
            text: `审查任务编号：${snapshot.review.taskId}`,
            font: FONT_FAMILY,
            size: 18,
            color: MUTED_COLOR,
          }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    ];
  }

  private buildScope(snapshot: ReportSnapshot) {
    return [
      this.heading('审查范围与免责声明'),
      this.paragraph(
        '本报告依据用户提交的合同文本及系统审查结果生成，重点列示条款风险、缺失约定与处理状态，供内部审阅和修改合同使用。',
      ),
      this.metadataTable([
        ['合同名称', snapshot.contract.name],
        [
          '合同类型',
          CONTRACT_TYPE_LABELS[snapshot.contract.contractType] ??
            snapshot.contract.contractType,
        ],
        [
          '审查立场',
          STANCE_LABELS[snapshot.contract.stance] ?? snapshot.contract.stance,
        ],
        ['合同文件', snapshot.contract.documentFilename],
        ['合同页数', String(snapshot.contract.pageCount)],
        ['相对方', snapshot.contract.counterparty ?? '未填写'],
        ['规则集', snapshot.review.ruleSetName ?? '默认规则集'],
        ['模型', snapshot.review.modelName ?? '未使用模型审查'],
        ['审查完成时间', formatDateTime(snapshot.review.completedAt)],
      ]),
      this.subheading('免责声明'),
      this.paragraph(
        '本报告由自动化工具生成，不构成正式法律意见，也不替代律师对具体交易背景、证据和适用法律的审查。用户应结合业务事实与专业法律意见作出最终决定。',
      ),
      this.paragraph(
        '报告展示的风险等级、分析、建议和处理状态均来自生成时的审查快照。合同后续修改或风险项状态变化不会自动回溯更新本文件。',
      ),
    ];
  }

  private buildStatistics(snapshot: ReportSnapshot) {
    const stats = snapshot.statistics;
    return [
      this.heading('风险统计'),
      this.paragraph(
        `本次审查共识别 ${stats.total} 项问题，其中高风险 ${stats.high} 项、中风险 ${stats.medium} 项、低风险 ${stats.low} 项。`,
      ),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: this.tableBorders(),
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              this.cell('风险等级', 25, true, 'EAF5F2'),
              this.cell('数量', 25, true, 'EAF5F2'),
              this.cell('占比', 25, true, 'EAF5F2'),
              this.cell('说明', 25, true, 'EAF5F2'),
            ],
          }),
          this.statRow('高风险', stats.high, stats.total, '优先处理或复核'),
          this.statRow('中风险', stats.medium, stats.total, '建议修改后复核'),
          this.statRow('低风险', stats.low, stats.total, '结合业务判断'),
          this.statRow('合计', stats.total, stats.total, '全部审查发现'),
        ],
      }),
      this.paragraph(
        `处理状态：待处理 ${stats.open} 项，已采纳 ${stats.accepted} 项，已忽略 ${stats.ignored} 项，需复核 ${stats.needsReview} 项。`,
      ),
    ];
  }

  private buildFindings(findings: ReportFindingSnapshot[]) {
    const children = [this.heading('风险明细')];
    if (findings.length === 0) {
      children.push(this.paragraph('本次审查未发现问题。'));
      return children;
    }

    for (const [index, finding] of findings.entries()) {
      const riskLabel = RISK_LABELS[finding.riskLevel];
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: index === 0 ? 120 : 280, after: 80 },
          children: [
            new TextRun({
              text: `${index + 1}. ${cleanText(finding.title)}`,
              font: FONT_FAMILY,
              size: 26,
              bold: true,
              color: RISK_COLORS[finding.riskLevel],
            }),
          ],
        }),
        this.paragraph(
          `${riskLabel} · ${cleanText(finding.category)} · ${SOURCE_LABELS[finding.source] ?? finding.source} · ${STATUS_LABELS[finding.status] ?? finding.status}`,
          MUTED_COLOR,
        ),
        this.paragraph(`定位：${clauseLocation(finding)}`, MUTED_COLOR),
        this.labeledParagraph('问题分析', finding.analysis),
      );

      if (finding.suggestion) {
        children.push(this.labeledParagraph('修改建议', finding.suggestion));
      }
      if (finding.legalBasis) {
        children.push(this.labeledParagraph('法律依据', finding.legalBasis));
      }
      if (finding.evidence) {
        children.push(
          this.labeledParagraph('合同原文', finding.evidence, 1200),
        );
      }
    }

    return children;
  }

  private buildMissingClauses(findings: ReportFindingSnapshot[]) {
    const missing = findings.filter(
      (finding) =>
        !finding.clauseOrder ||
        /缺失|未约定|未明确|缺少|不具备/.test(finding.title),
    );
    const children = [this.heading('缺失条款与提示')];

    if (missing.length === 0) {
      children.push(
        this.paragraph(
          '本次审查未单独识别缺失条款；请结合风险明细中的修改建议核对合同完整性。',
        ),
      );
      return children;
    }

    for (const finding of missing) {
      children.push(
        this.paragraph(`· ${cleanText(finding.title)}`, BODY_COLOR, true),
        this.paragraph(cleanText(finding.analysis), MUTED_COLOR),
      );
      if (finding.suggestion) {
        children.push(
          this.paragraph(`建议：${cleanText(finding.suggestion)}`, MUTED_COLOR),
        );
      }
    }
    return children;
  }

  private buildProcessingRecords(findings: ReportFindingSnapshot[]) {
    const children = [this.heading('处理记录')];
    if (findings.length === 0) {
      children.push(this.paragraph('暂无需要记录的处理事项。'));
      return children;
    }

    for (const finding of findings) {
      children.push(
        this.paragraph(
          `· ${cleanText(finding.title)}：${STATUS_LABELS[finding.status] ?? finding.status}，最后更新 ${formatDateTime(finding.updatedAt)}`,
        ),
      );
    }
    return children;
  }

  private heading(text: string) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 180 },
      children: [
        new TextRun({
          text,
          font: FONT_FAMILY,
          size: 32,
          bold: true,
          color: '102020',
        }),
      ],
    });
  }

  private subheading(text: string) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 100 },
      children: [
        new TextRun({
          text,
          font: FONT_FAMILY,
          size: 25,
          bold: true,
          color: BRAND_COLOR,
        }),
      ],
    });
  }

  private paragraph(text: string, color = BODY_COLOR, bold = false) {
    return new Paragraph({
      spacing: { after: 110 },
      children: [
        new TextRun({
          text: limitText(cleanText(text), 2400),
          font: FONT_FAMILY,
          size: 21,
          color,
          bold,
        }),
      ],
    });
  }

  private labeledParagraph(label: string, value: string, limit = 2400) {
    return new Paragraph({
      spacing: { after: 110 },
      children: [
        new TextRun({
          text: `${label}：`,
          font: FONT_FAMILY,
          size: 21,
          bold: true,
          color: BODY_COLOR,
        }),
        new TextRun({
          text: limitText(cleanText(value), limit),
          font: FONT_FAMILY,
          size: 21,
          color: BODY_COLOR,
        }),
      ],
    });
  }

  private metadataTable(rows: Array<[string, string]>) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: this.tableBorders(),
      rows: rows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              this.cell(label, 24, true, 'F1F6F5'),
              this.cell(value, 76),
            ],
          }),
      ),
    });
  }

  private statRow(
    label: string,
    count: number,
    total: number,
    description: string,
  ) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return new TableRow({
      children: [
        this.cell(label, 25, true),
        this.cell(String(count), 25),
        this.cell(`${percentage}%`, 25),
        this.cell(description, 25),
      ],
    });
  }

  private cell(text: string, width: number, bold = false, fill?: string) {
    return new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      margins: { top: 90, bottom: 90, left: 110, right: 110 },
      shading: fill ? { fill } : undefined,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: limitText(cleanText(text), 600),
              font: FONT_FAMILY,
              size: 19,
              color: BODY_COLOR,
              bold,
            }),
          ],
        }),
      ],
    });
  }

  private tableBorders() {
    const border = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: LINE_COLOR,
    };
    return {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    };
  }
}

function clauseLocation(finding: ReportFindingSnapshot) {
  if (!finding.clauseOrder) {
    return '合同整体 / 未定位到具体条款';
  }
  const pages =
    finding.pageStart && finding.pageEnd
      ? finding.pageStart === finding.pageEnd
        ? `第 ${finding.pageStart} 页`
        : `第 ${finding.pageStart}-${finding.pageEnd} 页`
      : null;
  return `第 ${finding.clauseOrder} 条${pages ? ` · ${pages}` : ''}`;
}

function cleanText(value: string) {
  return stripControlCharacters(value).replace(/\s+/g, ' ').trim();
}

function limitText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return '未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
