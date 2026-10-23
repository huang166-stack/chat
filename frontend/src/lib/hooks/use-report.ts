'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  generateReport,
  getLatestReport,
  type ReviewReport,
  type ReviewReportStatus,
} from '@/lib/api/reports';

const ACTIVE_STATUSES: ReviewReportStatus[] = ['PENDING', 'PROCESSING'];

export function useLatestReport(projectId: string | number) {
  return useQuery({
    queryKey: ['latest-report', String(projectId)],
    queryFn: () => getLatestReport(projectId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 2000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useGenerateReport(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateReport(projectId),
    onSuccess: (report: ReviewReport) => {
      queryClient.setQueryData(['latest-report', String(projectId)], report);
    },
  });
}
