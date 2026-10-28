'use client';

import { useQuery } from '@tanstack/react-query';
import { getReviewRuleSets } from '@/lib/api/rule-sets';
import type { ContractStance, ContractType } from '@/lib/api/contracts';

export function useReviewRuleSets(contractType?: ContractType, stance?: ContractStance) {
  return useQuery({
    queryKey: ['review-rule-sets', contractType ?? null, stance ?? null],
    queryFn: () => getReviewRuleSets({ contractType, stance }),
    placeholderData: (previous) => previous,
  });
}
