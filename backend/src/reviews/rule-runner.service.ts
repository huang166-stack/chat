import { Injectable } from '@nestjs/common';
import type { RiskLevel } from '@prisma/client';
import { RuleHandlersService } from '../rules/rule-handlers.service.js';
import { RuleSetService } from '../rules/rule-set.service.js';
import type {
  EvaluationClause,
  LlmRuleRequest,
  ReviewFindingDraft,
  RuleRunInput,
  RuleRunResult,
} from '../rules/rules.types.js';

const RISK_ORDER: Record<RiskLevel, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

@Injectable()
export class RuleRunnerService {
  constructor(
    private readonly ruleSets: RuleSetService,
    private readonly handlers: RuleHandlersService,
  ) {}

  async run(input: RuleRunInput): Promise<RuleRunResult> {
    const ruleSet = await this.ruleSets.load({
      ruleSetId: input.ruleSetId,
      contractType: input.contractType,
      stance: input.stance,
    });
    const stance = input.stance ?? ruleSet.stance;
    const findings = new Map<string, ReviewFindingDraft>();
    const llmRequests = new Map<string, LlmRuleRequest>();

    for (const rule of ruleSet.rules) {
      const result = this.handlers.execute(rule, {
        clauses: input.clauses,
        stance,
      });

      for (const finding of result.findings) {
        const key = `${finding.ruleCode}:${finding.clauseId ?? 'document'}`;
        const existing = findings.get(key);
        if (!existing || finding.confidence > existing.confidence) {
          findings.set(key, finding);
        }
      }

      for (const request of result.llmRequests) {
        llmRequests.set(request.ruleCode, request);
      }
    }

    return {
      ruleSetId: String(ruleSet.id),
      ruleSetVersion: ruleSet.version,
      findings: sortFindings([...findings.values()], input.clauses),
      llmRequests: [...llmRequests.values()],
    };
  }
}

function sortFindings(
  findings: ReviewFindingDraft[],
  clauses: EvaluationClause[],
) {
  const clauseOrder = new Map(
    clauses.map((clause) => [String(clause.id), clause.orderNo]),
  );

  return findings.sort((left, right) => {
    const riskDelta = RISK_ORDER[left.riskLevel] - RISK_ORDER[right.riskLevel];
    if (riskDelta !== 0) {
      return riskDelta;
    }

    const leftOrder = left.clauseId
      ? (clauseOrder.get(String(left.clauseId)) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER - 1;
    const rightOrder = right.clauseId
      ? (clauseOrder.get(String(right.clauseId)) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER - 1;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.ruleCode.localeCompare(right.ruleCode);
  });
}
