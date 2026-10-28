import { ClauseSplitterService } from '../../src/parsing/clause-splitter.service.js';
import { RuleHandlersService } from '../../src/rules/rule-handlers.service.js';
import type {
  EvaluationClause,
  ReviewRuleDefinition,
  RuleConfig,
} from '../../src/rules/rules.types.js';

interface SyntheticContractCase {
  expectedClauseTypes: string[];
  expectedRiskCodes: string[];
  id: string;
  text: string;
}

const rules = createRules();
const splitter = new ClauseSplitterService();
const handlers = new RuleHandlersService();
const cases = createSyntheticCases();

describe('20 synthetic contract regression', () => {
  it('keeps clause boundaries and risk hits stable across the sample set', () => {
    let correctClauseSamples = 0;
    let expectedRiskHits = 0;
    let actualRiskHits = 0;
    let matchedRiskHits = 0;

    for (const sample of cases) {
      const clauses = splitter.split({
        text: sample.text,
        pages: [],
        pageCount: 0,
      });
      const actualTypes = clauses.map((clause) => clause.clauseType);
      const clauseMatch =
        clauses.length === sample.expectedClauseTypes.length &&
        actualTypes.every(
          (type, index) => type === sample.expectedClauseTypes[index],
        );
      if (clauseMatch) {
        correctClauseSamples += 1;
      }

      const evaluationClauses = clauses.map(toEvaluationClause);
      const findings = rules
        .flatMap(
          (rule) =>
            handlers.execute(rule, {
              clauses: evaluationClauses,
              stance: 'NEUTRAL',
            }).findings,
        )
        .map((finding) => finding.ruleCode)
        .filter((code): code is string => Boolean(code));
      const expected = new Set(sample.expectedRiskCodes);
      const actual = new Set(findings);
      const matched = [...actual].filter((code) => expected.has(code)).length;

      expectedRiskHits += expected.size;
      actualRiskHits += actual.size;
      matchedRiskHits += matched;

      console.info(
        `[regression] ${sample.id} clauses=${clauses.length}/${sample.expectedClauseTypes.length} risks=${[...actual].join(',') || 'none'} expected=${sample.expectedRiskCodes.join(',') || 'none'}`,
      );

      expect(clauseMatch, `${sample.id} clause split mismatch`).toBe(true);
      expect([...actual].sort(), `${sample.id} risk codes mismatch`).toEqual(
        [...expected].sort(),
      );
    }

    const clauseAccuracy = correctClauseSamples / cases.length;
    const riskRecall =
      expectedRiskHits === 0 ? 1 : matchedRiskHits / expectedRiskHits;
    const riskPrecision =
      actualRiskHits === 0 ? 1 : matchedRiskHits / actualRiskHits;
    console.info(
      `[regression] samples=${cases.length} clause-accuracy=${clauseAccuracy.toFixed(2)} risk-recall=${riskRecall.toFixed(2)} risk-precision=${riskPrecision.toFixed(2)}`,
    );

    expect(cases).toHaveLength(20);
    expect(clauseAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(riskRecall).toBeGreaterThanOrEqual(0.95);
    expect(riskPrecision).toBeGreaterThanOrEqual(0.95);
  });
});

function createSyntheticCases(): SyntheticContractCase[] {
  return Array.from({ length: 20 }, (_, index) => {
    const scenario = index % 4;
    const paymentDays = scenario === 0 ? 90 : 30;
    const missingConfidentiality = scenario === 1;
    const unilateralTermination = scenario === 2;
    const lines = [
      '第一条 付款方式',
      `乙方应在收到发票后 ${paymentDays} 日内支付全部价款，并开具等额发票。`,
    ];

    if (missingConfidentiality) {
      lines.push('第二条 通知送达');
      lines.push('合同通知应通过书面方式送达双方确认的地址，送达后视为完成通知义务。');
    } else {
      lines.push('第二条 保密义务');
      lines.push('双方应对履约过程中知悉的商业秘密承担保密义务，未经书面同意不得披露。');
    }

    lines.push('第三条 合同解除');
    lines.push(
      unilateralTermination
        ? '甲方有权随时单方解除本合同且无需承担任何责任，乙方不得提出异议。'
        : '任何一方解除合同应提前三十日书面通知对方，并完成已发生权利义务的结算。',
    );
    lines.push('第四条 数据保护');
    lines.push('双方应遵守个人信息保护和数据安全要求，发生数据泄露时应及时补救。');
    lines.push('第五条 争议解决');
    lines.push('因本合同产生的争议，双方应协商解决；协商不成的提交合同签订地法院管辖。');

    return {
      expectedClauseTypes: [
        'PAYMENT',
        missingConfidentiality ? 'OTHER' : 'CONFIDENTIALITY',
        'TERMINATION',
        'OTHER',
        'DISPUTE_RESOLUTION',
      ],
      expectedRiskCodes:
        scenario === 0
          ? ['PAYMENT_TERM_LONG']
          : scenario === 1
            ? ['CONFIDENTIALITY_MISSING']
            : scenario === 2
              ? ['UNILATERAL_TERMINATION']
              : [],
      id: `sample-${String(index + 1).padStart(2, '0')}-scenario-${scenario}`,
      text: lines.join('\n'),
    };
  });
}

function createRules(): ReviewRuleDefinition[] {
  return [
    rule(1n, 'CONFIDENTIALITY_MISSING', '保密', 'HIGH', 'PRESENCE', {
      match: { keywords: ['保密义务'], mode: 'ANY' },
      expect: 'PRESENT',
    }),
    rule(2n, 'PAYMENT_TERM_LONG', '付款', 'MEDIUM', 'THRESHOLD', {
      field: 'paymentDays',
      operator: '>',
      value: 60,
    }),
    rule(3n, 'UNILATERAL_TERMINATION', '终止', 'HIGH', 'KEYWORD', {
      match: { keywords: ['随时单方解除'], mode: 'ANY' },
      expect: 'ABSENT',
    }),
  ];
}

function rule(
  id: bigint,
  code: string,
  category: string,
  severity: 'HIGH' | 'MEDIUM' | 'LOW',
  ruleType: 'PRESENCE' | 'KEYWORD' | 'THRESHOLD',
  config: RuleConfig,
): ReviewRuleDefinition {
  return {
    id,
    code,
    name: code,
    category,
    severity,
    ruleType,
    description: null,
    config,
    prompt: null,
    version: 1,
  };
}

function toEvaluationClause(
  clause: ReturnType<ClauseSplitterService['split']>[number],
  index: number,
): EvaluationClause {
  return {
    id: BigInt(index + 1),
    orderNo: clause.orderNo,
    clauseType: clause.clauseType,
    heading: clause.heading,
    content: clause.content,
    pageStart: clause.pageStart,
    pageEnd: clause.pageEnd,
    charStart: clause.charStart,
    charEnd: clause.charEnd,
  };
}
