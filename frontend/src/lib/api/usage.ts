import { api } from './client';

export interface UsageSummary {
  isMember: boolean;
  planName: string | null;
  quota: number | null;
  usedPages: number;
  remainingPages: number | null;
  maxContractPages: number | null;
  activeTasks: number;
  concurrencyLimit: number | null;
}

export function getUsageSummary() {
  return api.get<UsageSummary>('/usage/summary');
}
