import { Injectable } from '@nestjs/common';
import type { RuleType } from '@prisma/client';
import type {
  EvaluationClause,
  KeywordRuleConfig,
  LlmRuleConfig,
  LlmRuleRequest,
  PresenceRuleConfig,
  RegexRuleConfig,
  ReviewFindingDraft,
  ReviewRuleDefinition,
  ReviewRuleHandler,
  RuleEvaluation,
  RuleExecutionContext,
  ThresholdOperator,
  ThresholdRuleConfig,
} from './rules.types.js';

interface ThresholdFieldDefinition {
  label: string;
  context: RegExp;
  pattern: RegExp;
  unit: string;
  transform?: (value: number) => number;
}

interface ThresholdMatch {
  value: number;
  raw: string;
}

const DEFAULT_OPT_OUT_KEYWORDS = [
  '不续约',
  '不再续约',
  '退出',
  '提前通知',
  '书面通知',
  '终止续约',
];

const AUTO_ACCEPTANCE_PATTERN =
  /视为(?:验收)?(?:合格|通过)|自动(?:验收)?通过|逾期未(?:提出异议|回复).{0,10}视为/;

const THRESHOLD_FIELDS: Record<string, ThresholdFieldDefinition> = {
  paymentDays: {
    label: '付款周期',
    context: /付款|支付|货款|价款|账期|结算|发票/,
    pattern: /(\d+(?:\.\d+)?)\s*(?:个)?(?:自然日|工作日|天|日)/g,
    unit: '天',
  },
  acceptanceDays: {
    label: '验收期限',
    context: /验收/,
    pattern: /(\d+(?:\.\d+)?)\s*(?:个)?(?:自然日|工作日|天|日)/g,
    unit: '天',
  },
  penaltyRate: {
    label: '违约金比例',
    context: /违约金|罚金|惩罚性赔偿/,
    pattern: /(\d+(?:\.\d+)?)\s*[%％]/g,
    unit: '%',
    transform: (value) => value / 100,
  },
};

const CATEGORY_CLAUSE_TYPES: Record<string, string[]> = {
  争议解决: ['DISPUTE_RESOLUTION'],
  知识产权: ['INTELLECTUAL_PROPERTY'],
  保密: ['CONFIDENTIALITY'],
  付款: ['PAYMENT'],
  违约: ['BREACH'],
  终止: ['TERMINATION'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  争议解决: ['争议', '仲裁', '诉讼', '管辖', '法院'],
  知识产权: ['知识产权', '著作权', '专利', '商标', '软件'],
  保密: ['保密', '商业秘密', '机密'],
  付款: ['付款', '支付', '价款', '货款'],
  违约: ['违约', '赔偿', '违约金'],
  终止: ['终止', '解除', '到期'],
};

@Injectable()
export class RuleHandlersService {
  private readonly handlers: Record<RuleType, ReviewRuleHandler>;

  constructor() {
    this.handlers = {
      PRESENCE: new PresenceRuleHandler(),
      REGEX: new RegexRuleHandler(),
      KEYWORD: new KeywordRuleHandler(),
      THRESHOLD: new ThresholdRuleHandler(),
      LLM: new LlmRuleHandler(),
    };
  }

  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation {
    const handler = this.handlers[rule.ruleType];
    if (!handler) {
      throw new Error(`不支持的规则类型：${rule.ruleType}`);
    }
    return handler.execute(rule, context);
  }
}

class PresenceRuleHandler implements ReviewRuleHandler {
  readonly type = 'PRESENCE' as const;

  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation {
    const config = rule.config as PresenceRuleConfig;
    const keywords = config.match.keywords;
    const matchedKeywords = keywords.filter((keyword) =>
      context.clauses.some((clause) => clauseContains(clause, keyword)),
    );
    const found =
      config.match.mode === 'ANY'
        ? matchedKeywords.length > 0
        : matchedKeywords.length === keywords.length;

    if (config.expect === 'PRESENT') {
      return found
        ? emptyEvaluation()
        : evaluationWithFinding(
            missingFinding(
              rule,
              `未在合同中找到包含“${keywords.join('、')}”的约定。`,
              `建议补充“${keywords.join('、')}”相关条款，明确双方权利义务。`,
            ),
          );
    }

    if (!found) {
      return emptyEvaluation();
    }

    const findings = uniqueClauses(
      context.clauses.filter((clause) =>
        keywords.some((keyword) => clauseContains(clause, keyword)),
      ),
    ).map((clause) =>
      findingForClause(
        rule,
        clause,
        `条款中出现规则禁止缺失的表述，匹配关键词：${matchedKeywords.join('、')}。`,
      ),
    );

    return { findings, llmRequests: [] };
  }
}

class KeywordRuleHandler implements ReviewRuleHandler {
  readonly type = 'KEYWORD' as const;

  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation {
    const config = rule.config as KeywordRuleConfig;
    const keywords = config.match.keywords;
    const matchedKeywords = keywords.filter((keyword) =>
      context.clauses.some((clause) => clauseContains(clause, keyword)),
    );
    const found =
      config.match.mode === 'ANY'
        ? matchedKeywords.length > 0
        : matchedKeywords.length === keywords.length;

    if (config.expect === 'PRESENT' && !found) {
      return evaluationWithFinding(
        missingFinding(
          rule,
          `未在合同中找到关键词：${keywords.join('、')}。`,
          `建议补充“${keywords.join('、')}”相关约定。`,
        ),
      );
    }

    if (config.expect === 'PRESENT' || !found) {
      return emptyEvaluation();
    }

    if (config.requiresOptOut) {
      const optOutKeywords = config.optOutKeywords ?? DEFAULT_OPT_OUT_KEYWORDS;
      const hasOptOut = context.clauses.some((clause) =>
        optOutKeywords.some((keyword) => clauseContains(clause, keyword)),
      );
      if (hasOptOut) {
        return emptyEvaluation();
      }
    }

    const findings = uniqueClauses(
      context.clauses.filter((clause) =>
        keywords.some((keyword) => clauseContains(clause, keyword)),
      ),
    ).map((clause) =>
      findingForClause(
        rule,
        clause,
        `命中风险关键词：${matchedKeywords.join('、')}。`,
      ),
    );

    return { findings, llmRequests: [] };
  }
}

class RegexRuleHandler implements ReviewRuleHandler {
  readonly type = 'REGEX' as const;

  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation {
    const config = rule.config as RegexRuleConfig;
    const expectation = config.expect ?? 'MATCH';
    const regex = new RegExp(config.pattern, config.flags ?? '');

    if ((config.scope ?? 'CLAUSE') === 'DOCUMENT') {
      const documentText = context.clauses
        .map((clause) => `${clause.heading ?? ''}\n${clause.content}`)
        .join('\n');
      const match = documentText.match(regex);

      if (expectation === 'NO_MATCH' && !match) {
        return evaluationWithFinding(
          missingFinding(
            rule,
            `合同文本未匹配正则：${config.pattern}。`,
            '建议按规则要求补充或调整对应约定。',
          ),
        );
      }

      if (expectation === 'MATCH' && match) {
        const clause =
          context.clauses.find((item) => item.content.match(regex)) ?? null;
        return evaluationWithFinding(
          findingForClause(
            rule,
            clause,
            `合同文本匹配正则：${config.pattern}。`,
            match[0],
          ),
        );
      }

      return emptyEvaluation();
    }

    const matches = context.clauses
      .map((clause) => ({ clause, match: clause.content.match(regex) }))
      .filter(
        (item): item is { clause: EvaluationClause; match: RegExpMatchArray } =>
          Boolean(item.match),
      );

    if (expectation === 'NO_MATCH' && matches.length === 0) {
      return evaluationWithFinding(
        missingFinding(
          rule,
          `合同条款未匹配正则：${config.pattern}。`,
          '建议按规则要求补充或调整对应约定。',
        ),
      );
    }

    if (expectation === 'NO_MATCH') {
      return emptyEvaluation();
    }

    return {
      findings: matches.map(({ clause, match }) =>
        findingForClause(
          rule,
          clause,
          `条款匹配正则：${config.pattern}。`,
          match[0],
        ),
      ),
      llmRequests: [],
    };
  }
}

class ThresholdRuleHandler implements ReviewRuleHandler {
  readonly type = 'THRESHOLD' as const;

  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation {
    const config = rule.config as ThresholdRuleConfig;
    const field = THRESHOLD_FIELDS[config.field];
    if (!field) {
      throw new Error(`不支持的阈值字段：${config.field}`);
    }

    const findings: ReviewFindingDraft[] = [];
    for (const clause of context.clauses) {
      if (!field.context.test(clause.content)) {
        continue;
      }

      if (config.autoPass && AUTO_ACCEPTANCE_PATTERN.test(clause.content)) {
        findings.push(
          findingForClause(
            rule,
            clause,
            '条款包含视为自动通过或自动验收的约定。',
            matchAutoPassText(clause.content),
          ),
        );
        continue;
      }

      const matches = extractThresholdMatches(clause.content, field);
      const hit = matches.find((match) =>
        compareThreshold(match.value, config.operator, config.value),
      );
      if (!hit) {
        continue;
      }

      findings.push(
        findingForClause(
          rule,
          clause,
          `检测到${field.label}为 ${hit.raw}，触发阈值条件 ${config.operator} ${formatThreshold(config)}。`,
          hit.raw,
        ),
      );
    }

    return { findings, llmRequests: [] };
  }
}

class LlmRuleHandler implements ReviewRuleHandler {
  readonly type = 'LLM' as const;

  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation {
    const config = rule.config as LlmRuleConfig;
    if (config.requiresStance && !context.stance.trim()) {
      return emptyEvaluation();
    }

    const clauseTypes =
      config.clauseTypes ?? CATEGORY_CLAUSE_TYPES[rule.category] ?? [];
    const keywords = config.keywords ?? CATEGORY_KEYWORDS[rule.category] ?? [];
    const candidates = context.clauses
      .filter((clause) => {
        if (clauseTypes.length === 0 && keywords.length === 0) {
          return true;
        }
        return (
          (clause.clauseType !== null &&
            clauseTypes.includes(clause.clauseType)) ||
          keywords.some((keyword) => clauseContains(clause, keyword))
        );
      })
      .slice(0, config.maxClauses ?? 10);

    if (candidates.length === 0) {
      return emptyEvaluation();
    }

    const request: LlmRuleRequest = {
      ruleCode: rule.code,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      prompt:
        rule.prompt?.trim() || '请根据规则说明审查相关条款并输出风险结论。',
      stance: context.stance,
      clauses: candidates,
    };

    return { findings: [], llmRequests: [request] };
  }
}

function emptyEvaluation(): RuleEvaluation {
  return { findings: [], llmRequests: [] };
}

function evaluationWithFinding(finding: ReviewFindingDraft): RuleEvaluation {
  return { findings: [finding], llmRequests: [] };
}

function missingFinding(
  rule: ReviewRuleDefinition,
  analysis: string,
  suggestion: string,
): ReviewFindingDraft {
  return {
    clauseId: null,
    source: 'RULE',
    ruleCode: rule.code,
    category: rule.category,
    riskLevel: rule.severity,
    title: rule.name,
    analysis,
    suggestion,
    legalBasis: null,
    evidence: null,
    confidence: 1,
  };
}

function findingForClause(
  rule: ReviewRuleDefinition,
  clause: EvaluationClause | null,
  analysis: string,
  quote?: string,
): ReviewFindingDraft {
  return {
    clauseId: clause?.id ?? null,
    source: 'RULE',
    ruleCode: rule.code,
    category: rule.category,
    riskLevel: rule.severity,
    title: rule.name,
    analysis,
    suggestion: rule.description ?? null,
    legalBasis: null,
    evidence: clause ? clauseEvidence(clause, quote) : null,
    confidence: 1,
  };
}

function clauseEvidence(clause: EvaluationClause, quote?: string) {
  const page = clause.pageStart ? `第 ${clause.pageStart} 页` : '页码未知';
  const excerpt = (quote ?? clause.content)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  return `第 ${clause.orderNo} 条（${page}）：${excerpt}`;
}

function clauseContains(clause: EvaluationClause, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return `${clause.heading ?? ''}\n${clause.content}`
    .toLowerCase()
    .includes(normalized);
}

function uniqueClauses(clauses: EvaluationClause[]) {
  return [
    ...new Map(clauses.map((clause) => [String(clause.id), clause])).values(),
  ];
}

function extractThresholdMatches(
  text: string,
  field: ThresholdFieldDefinition,
): ThresholdMatch[] {
  const regex = new RegExp(field.pattern.source, 'g');
  return [...text.matchAll(regex)]
    .map((match) => {
      const numeric = Number(match[1]);
      return {
        value: field.transform ? field.transform(numeric) : numeric,
        raw: match[0].trim(),
      };
    })
    .filter((match) => Number.isFinite(match.value));
}

function compareThreshold(
  actual: number,
  operator: ThresholdOperator,
  expected: number,
) {
  const epsilon = 1e-9;
  switch (operator) {
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case '<':
      return actual < expected;
    case '<=':
      return actual <= expected;
    case '==':
      return Math.abs(actual - expected) < epsilon;
    case '!=':
      return Math.abs(actual - expected) >= epsilon;
  }
}

function formatThreshold(config: ThresholdRuleConfig) {
  const field = THRESHOLD_FIELDS[config.field];
  if (config.field === 'penaltyRate') {
    return `${config.value * 100}%`;
  }
  return `${config.value}${config.unit ?? field?.unit ?? ''}`;
}

function matchAutoPassText(text: string) {
  return text.match(AUTO_ACCEPTANCE_PATTERN)?.[0] ?? '视为自动通过';
}
