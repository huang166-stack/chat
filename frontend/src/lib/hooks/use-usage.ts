'use client';

import { useQuery } from '@tanstack/react-query';
import { getUsageSummary } from '@/lib/api/usage';

export function useUsageSummary() {
  return useQuery({
    queryKey: ['usage-summary'],
    queryFn: getUsageSummary,
  });
}
