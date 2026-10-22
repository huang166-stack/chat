import { ClauseSplitterService } from '../../src/parsing/clause-splitter.service.js';
import type {
  ClauseType,
  ParsedDocument,
} from '../../src/parsing/parsing.types.js';

interface ExpectedClause {
  heading: string | null;
  type: ClauseType;
  pageStart?: number | null;
}

interface Sample {
  name: string;
  text: string;
  pages?: ParsedDocument['pages'];
  expected: ExpectedClause[];
}

function documentFromPages(pageTexts: string[]): ParsedDocument {
  const pages: ParsedDocument['pages'] = [];
  let text = '';

  pageTexts.forEach((pageText, index) => {
    const separator = text.length > 0 ? '\n\n' : '';
    const charStart = text.length + separator.length;
    text += `${separator}${pageText}`;
    pages.push({
      pageNumber: index + 1,
      text: pageText,
      charStart,
      charEnd: text.length,
    });
  });

  return { text, pages, pageCount: pages.length };
}

const samples: Sample[] = [
  {
    name: 'Chinese article numbering',
    text: [
      '第一条 付款方式',
      '买方应在收到发票后三十日内支付货款。',
      '',
      '第二条 保密义务',
      '双方应对商业秘密承担保密义务。',
      '',
      '第三条 争议解决',
      '争议提交上海仲裁委员会仲裁。',
    ].join('\n'),
    expected: [
      { heading: '第一条 付款方式', type: 'PAYMENT' },
      { heading: '第二条 保密义务', type: 'CONFIDENTIALITY' },
      { heading: '第三条 争议解决', type: 'DISPUTE_RESOLUTION' },
    ],
  },
  {
    name: 'Arabic numbering',
    text: [
      '1. 价款与结算',
      '客户应在验收后支付服务费。',
      '2. 违约责任',
      '逾期付款方应赔偿损失并支付违约金。',
      '3. 合同终止',
      '任一方可提前三十日通知解除合同。',
    ].join('\n'),
    expected: [
      { heading: '1. 价款与结算', type: 'PAYMENT' },
      { heading: '2. 违约责任', type: 'BREACH' },
      { heading: '3. 合同终止', type: 'TERMINATION' },
    ],
  },
  {
    name: 'Parenthesized numbering',
    text: [
      '（一）知识产权',
      '项目成果的著作权归委托方所有。',
      '（二）保密',
      '双方不得披露机密信息。',
      '（三）其他',
      '本补充协议与原合同具有同等效力。',
    ].join('\n'),
    expected: [
      { heading: '（一）知识产权', type: 'INTELLECTUAL_PROPERTY' },
      { heading: '（二）保密', type: 'CONFIDENTIALITY' },
      { heading: '（三）其他', type: 'OTHER' },
    ],
  },
  {
    name: 'Chinese enumeration numbering',
    text: [
      '一、付款安排',
      '甲方按月结算服务费用。',
      '二、争议管辖',
      '由合同签订地人民法院管辖。',
      '三、通知',
      '通知应以书面形式送达。',
    ].join('\n'),
    expected: [
      { heading: '一、付款安排', type: 'PAYMENT' },
      { heading: '二、争议管辖', type: 'DISPUTE_RESOLUTION' },
      { heading: '三、通知', type: 'OTHER' },
    ],
  },
  {
    name: 'Mixed numbering styles',
    text: [
      '第一条 定义',
      '本协议中的关联方指控制或受控于一方的主体。',
      '2. 知识产权归属',
      '软件著作权归乙方所有。',
      '（三）终止',
      '协议到期后自动终止。',
    ].join('\n'),
    expected: [
      { heading: '第一条 定义', type: 'OTHER' },
      { heading: '2. 知识产权归属', type: 'INTELLECTUAL_PROPERTY' },
      { heading: '（三）终止', type: 'TERMINATION' },
    ],
  },
  {
    name: 'Paragraph fallback',
    text: [
      '本合同自双方签署之日起生效。',
      '',
      '甲方应在每月五日前支付服务费。',
      '',
      '任何一方违约应赔偿对方损失。',
    ].join('\n'),
    expected: [
      { heading: null, type: 'OTHER' },
      { heading: null, type: 'PAYMENT' },
      { heading: null, type: 'BREACH' },
    ],
  },
  {
    name: 'Page mapping',
    text: '',
    pages: [],
    expected: [
      { heading: '第一条 付款', type: 'PAYMENT', pageStart: 1 },
      { heading: '第二条 保密', type: 'CONFIDENTIALITY', pageStart: 2 },
    ],
  },
  {
    name: 'Long paragraph splitting',
    text: `${'付款方应在本合同约定的期限内支付全部价款。'.repeat(500)}`,
    expected: [],
  },
  {
    name: 'Character offsets are exact',
    text: [
      '第一条 交付',
      '卖方应于签约后交付全部设备。',
      '',
      '第二条 验收',
      '买方应在十日内完成验收。',
    ].join('\n'),
    expected: [
      { heading: '第一条 交付', type: 'OTHER' },
      { heading: '第二条 验收', type: 'OTHER' },
    ],
  },
  {
    name: 'All clause categories',
    text: [
      '第一条 付款',
      '买方支付价款。',
      '第二条 违约责任',
      '违约方赔偿损失。',
      '第三条 终止',
      '任一方可解除合同。',
      '第四条 保密',
      '不得披露商业秘密。',
      '第五条 知识产权',
      '著作权归甲方。',
      '第六条 争议解决',
      '提交仲裁。',
    ].join('\n'),
    expected: [
      { heading: '第一条 付款', type: 'PAYMENT' },
      { heading: '第二条 违约责任', type: 'BREACH' },
      { heading: '第三条 终止', type: 'TERMINATION' },
      { heading: '第四条 保密', type: 'CONFIDENTIALITY' },
      { heading: '第五条 知识产权', type: 'INTELLECTUAL_PROPERTY' },
      { heading: '第六条 争议解决', type: 'DISPUTE_RESOLUTION' },
    ],
  },
];

describe('ClauseSplitterService', () => {
  const splitter = new ClauseSplitterService();

  describe.each(samples)('$name', (sample) => {
    const document =
      sample.name === 'Page mapping'
        ? documentFromPages([
            '第一条 付款\n买方支付价款。',
            '第二条 保密\n双方应保守商业秘密。',
          ])
        : {
            text: sample.text,
            pages: sample.pages ?? [],
            pageCount: sample.pages?.length ?? 0,
          };
    const clauses = splitter.split(document);

    if (sample.name === 'Long paragraph splitting') {
      it('splits oversized text into traceable chunks', () => {
        expect(clauses.length).toBeGreaterThan(1);
        expect(clauses.every((clause) => clause.content.length <= 6000)).toBe(
          true,
        );
        expect(
          clauses.every(
            (clause) =>
              document.text.slice(clause.charStart, clause.charEnd) ===
              clause.content,
          ),
        ).toBe(true);
        expect(clauses.map((clause) => clause.orderNo)).toEqual(
          clauses.map((_, index) => index + 1),
        );
      });
      return;
    }

    it('keeps clause order and identifies clause types', () => {
      expect(clauses.map((clause) => clause.heading)).toEqual(
        sample.expected.map((clause) => clause.heading),
      );
      expect(clauses.map((clause) => clause.clauseType)).toEqual(
        sample.expected.map((clause) => clause.type),
      );
      if (sample.expected.some((clause) => clause.pageStart !== undefined)) {
        expect(clauses.map((clause) => clause.pageStart)).toEqual(
          sample.expected.map((clause) => clause.pageStart),
        );
      }
    });

    it('preserves source offsets for every clause', () => {
      clauses.forEach((clause) => {
        expect(document.text.slice(clause.charStart, clause.charEnd)).toBe(
          clause.content,
        );
      });
    });
  });
});
