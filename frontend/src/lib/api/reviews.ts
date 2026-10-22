import type { PageResult } from '@/types/api';
import { api } from './client';

export type ReviewTaskStatus =
  | 'PENDING'
  | 'PARSING'
  | 'RULE_CHECK'
  | 'MODEL_REVIEW'
  | 'AGGREGATING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export type ReviewRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReviewFindingStatus = 'OPEN' | 'ACCEPTED' | 'IGNORED' | 'NEEDS_REVIEW';
export type ReviewFindingSource = 'RULE' | 'MODEL';

export interface ReviewFindingCounts {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReviewTask {
  id: string;
  documentId: string;
  projectId: string;
  projectName: string;
  filename: string;
  pageCount: number;
  ruleSetId: string | null;
  ruleSetName: string | null;
  ruleSetVersion: number | null;
  modelConfigId: string | null;
  modelName: string | null;
  stance: string;
  status: ReviewTaskStatus;
  progress: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  findingCounts: ReviewFindingCounts;
}

export interface ReviewFinding {
  id: string;
  taskId: string;
  clauseId: string | null;
  clauseOrder: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  source: ReviewFindingSource;
  ruleCode: string | null;
  category: string;
  riskLevel: ReviewRiskLevel;
  title: string;
  analysis: string;
  suggestion: string | null;
  legalBasis: string | null;
  evidence: string | null;
  confidence: number | null;
  status: ReviewFindingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  ruleSetId?: string;
  modelConfigId?: string;
  stance?: 'PARTY_A' | 'PARTY_B' | 'NEUTRAL';
}

export interface ReviewFindingFilters {
  riskLevel?: ReviewRiskLevel;
  source?: ReviewFindingSource;
  status?: ReviewFindingStatus;
  category?: string;
  taskId?: string;
  page?: number;
  pageSize?: number;
}

export function createReview(projectId: string | number, input: CreateReviewInput = {}) {
  return api.post<ReviewTask>(`/contracts/${projectId}/review`, input);
}

export function getReviewTask(taskId: string | number) {
  return api.get<ReviewTask>(`/review-tasks/${taskId}`);
}

export function retryReview(taskId: string | number) {
  return api.post<ReviewTask>(`/review-tasks/${taskId}/retry`);
}

export function cancelReview(taskId: string | number) {
  return api.post<ReviewTask>(`/review-tasks/${taskId}/cancel`);
}

export function getContractFindings(
  projectId: string | number,
  filters: ReviewFindingFilters = {},
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return api.get<PageResult<ReviewFinding>>(
    `/contracts/${projectId}/findings${query ? `?${query}` : ''}`,
  );
}

export function updateFindingStatus(
  findingId: string | number,
  status: ReviewFindingStatus,
) {
  return api.patch<{ id: string; status: ReviewFindingStatus; updatedAt: string }>(
    `/findings/${findingId}`,
    { status },
  );
}
