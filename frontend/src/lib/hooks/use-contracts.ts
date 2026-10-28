'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getContract,
  getContractOverview,
  getContracts,
  type ContractFilters,
} from '@/lib/api/contracts';

const ACTIVE_TASK_STATUSES = [
  'PENDING',
  'PARSING',
  'RULE_CHECK',
  'MODEL_REVIEW',
  'AGGREGATING',
];

export function useContracts(filters: ContractFilters = {}) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => getContracts(filters),
    placeholderData: (previous) => previous,
  });
}

export function useContract(projectId: string) {
  return useQuery({
    queryKey: ['contract-detail', projectId],
    queryFn: () => getContract(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const contract = query.state.data;
      if (!contract) return false;
      const parsePending =
        contract.document?.parseStatus === 'PENDING' ||
        contract.document?.parseStatus === 'PROCESSING';
      const reviewPending =
        contract.latestTask?.status !== undefined &&
        ACTIVE_TASK_STATUSES.includes(contract.latestTask.status);
      return parsePending || reviewPending ? 2000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useContractOverview() {
  return useQuery({
    queryKey: ['contract-overview'],
    queryFn: getContractOverview,
  });
}
