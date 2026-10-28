import { api } from './client';
import type { ContractStance, ContractType } from './contracts';

export interface ReviewRuleSetSummary {
  id: string;
  name: string;
  description: string | null;
  contractType: ContractType | null;
  stance: ContractStance;
  version: number;
  ruleCount: number;
}

export function getReviewRuleSets(filters: {
  contractType?: ContractType;
  stance?: ContractStance;
} = {}) {
  const params = new URLSearchParams();
  if (filters.contractType) params.set('contractType', filters.contractType);
  if (filters.stance) params.set('stance', filters.stance);
  const query = params.toString();
  return api.get<ReviewRuleSetSummary[]>(
    `/review-rule-sets${query ? `?${query}` : ''}`,
  );
}
