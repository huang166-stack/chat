import type { RiskLevel, RuleType } from '@prisma/client';

export type RuleMatchMode = 'ANY' | 'ALL';
export type RuleExpectation = 'PRESENT' | 'ABSENT';
export type RegexExpectation = 'MATCH' | 'NO_MATCH';
export type ThresholdOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';

export interface PresenceRuleConfig {
  match: {
    keywords: string[];
    mode: RuleMatchMode;
  };
  expect: RuleExpectation;
}

export interface KeywordRuleConfig extends PresenceRuleConfig {
  requiresOptOut?: boolean;
  optOutKeywords?: string[];
}

export interface RegexRuleConfig {
  pattern: string;
  flags?: string;
  expect?: RegexExpectation;
  scope?: 'CLAUSE' | 'DOCUMENT';
}

export interface ThresholdRuleConfig {
  field: 'paymentDays' | 'acceptanceDays' | 'penaltyRate';
  operator: ThresholdOperator;
  value: number;
  unit?: string;
  autoPass?: boolean;
}

export interface LlmRuleConfig {
  requiresStance?: boolean;
  clauseTypes?: string[];
  keywords?: string[];
  maxClauses?: number;
}

export type RuleConfig =
  | PresenceRuleConfig
  | KeywordRuleConfig
  | RegexRuleConfig
  | ThresholdRuleConfig
  | LlmRuleConfig;

export interface EvaluationClause {
  id: bigint;
  orderNo: number;
  clauseType: string | null;
  heading: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  charStart: number;
  charEnd: number;
}

export interface ReviewRuleDefinition {
  id: bigint;
  code: string;
  name: string;
  category: string;
  severity: RiskLevel;
  ruleType: RuleType;
  description: string | null;
  config: RuleConfig;
  prompt: string | null;
  version: number;
}

export interface LoadedRuleSet {
  id: bigint;
  name: string;
  version: number;
  stance: string;
  contractType: string | null;
  rules: ReviewRuleDefinition[];
}

export interface RuleExecutionContext {
  clauses: EvaluationClause[];
  stance: string;
}

export interface ReviewFindingDraft {
  clauseId: bigint | null;
  source: 'RULE';
  ruleCode: string;
  category: string;
  riskLevel: RiskLevel;
  title: string;
  analysis: string;
  suggestion: string | null;
  legalBasis: string | null;
  evidence: string | null;
  confidence: number;
}

export interface LlmRuleRequest {
  ruleCode: string;
  ruleName: string;
  category: string;
  severity: RiskLevel;
  prompt: string;
  stance: string;
  clauses: EvaluationClause[];
}

export interface RuleEvaluation {
  findings: ReviewFindingDraft[];
  llmRequests: LlmRuleRequest[];
}

export interface ReviewRuleHandler {
  readonly type: RuleType;
  execute(
    rule: ReviewRuleDefinition,
    context: RuleExecutionContext,
  ): RuleEvaluation;
}

export interface RuleRunInput {
  clauses: EvaluationClause[];
  ruleSetId?: bigint;
  contractType?: string;
  stance?: string;
}

export interface RuleRunResult {
  ruleSetId: string;
  ruleSetVersion: number;
  findings: ReviewFindingDraft[];
  llmRequests: LlmRuleRequest[];
}
