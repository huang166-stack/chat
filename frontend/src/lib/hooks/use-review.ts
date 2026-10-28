'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelReview,
  createReview,
  getContractFindings,
  getReviewTask,
  retryReview,
  updateFindingStatus,
  type CreateReviewInput,
  type ReviewFindingFilters,
  type ReviewFindingStatus,
  type ReviewTaskStatus,
} from '@/lib/api/reviews';

const ACTIVE_STATUSES: ReviewTaskStatus[] = [
  'PENDING',
  'PARSING',
  'RULE_CHECK',
  'MODEL_REVIEW',
  'AGGREGATING',
];

export function useReviewTask(taskId: string | null) {
  return useQuery({
    queryKey: ['review-task', taskId],
    queryFn: () => getReviewTask(taskId as string),
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 2000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useCreateReview(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput = {}) => createReview(projectId, input),
    onSuccess: (task) => {
      queryClient.setQueryData(['review-task', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['contract-findings', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['contract-detail', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-overview'] });
    },
  });
}

export function useRetryReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string | number) => retryReview(taskId),
    onSuccess: (task) => {
      queryClient.setQueryData(['review-task', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['contract-detail', task.projectId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-overview'] });
    },
  });
}

export function useCancelReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string | number) => cancelReview(taskId),
    onSuccess: (task) => {
      queryClient.setQueryData(['review-task', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['contract-detail', task.projectId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-overview'] });
    },
  });
}

export function useContractFindings(
  projectId: string | number | null,
  filters: ReviewFindingFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ['contract-findings', projectId, filters],
    queryFn: () => getContractFindings(projectId as string | number, filters),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useUpdateFindingStatus(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, status }: { findingId: string | number; status: ReviewFindingStatus }) =>
      updateFindingStatus(findingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-findings', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['contract-detail', String(projectId)] });
      queryClient.invalidateQueries({ queryKey: ['contract-overview'] });
    },
  });
}
