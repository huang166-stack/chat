import { api } from './client';
import type { ReviewFindingCounts, ReviewTaskStatus } from './reviews';

export type ContractType =
  'SALES' | 'PURCHASE' | 'NDA' | 'EMPLOYMENT' | 'LEASE' | 'SERVICE' | 'OTHER';

export type ContractStance = 'PARTY_A' | 'PARTY_B' | 'NEUTRAL';

export type ContractStatus =
  'PARSING' | 'READY' | 'REVIEWING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

export type ParseStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface UploadContractInput {
  file: File;
  contractType: ContractType;
  name?: string;
  stance?: ContractStance;
}

export interface UploadContractResult {
  projectId: string;
  documentId: string;
  duplicate: boolean;
  status: ContractStatus;
  parseStatus: ParseStatus;
}

export interface ContractDocumentSummary {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  pageCount: number;
  parseStatus: ParseStatus;
  parseError: string | null;
  createdAt: string;
}

export interface ContractTaskSummary {
  id: string;
  status: ReviewTaskStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  ruleSetName: string | null;
  ruleSetVersion: number | null;
  modelName: string | null;
  findingCounts: ReviewFindingCounts;
}

export interface ContractListItem {
  id: string;
  name: string;
  contractType: ContractType;
  counterparty: string | null;
  stance: ContractStance;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  document: ContractDocumentSummary | null;
  latestTask: ContractTaskSummary | null;
}

export interface ContractClause {
  id: string;
  orderNo: number;
  clauseType: string | null;
  heading: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
}

export interface ContractDetail extends Omit<ContractListItem, 'document'> {
  document: (ContractDocumentSummary & { clauses: ContractClause[] }) | null;
}

export interface ContractOverview {
  contracts: number;
  reviewedThisMonth: number;
  activeReviews: number;
  findings: number;
  highFindings: number;
  reports: number;
}

export interface ContractFilters {
  page?: number;
  pageSize?: number;
  keyword?: string;
  contractType?: ContractType;
  status?: ContractStatus;
}

export function uploadContract(input: UploadContractInput) {
  const body = new FormData();
  body.append('file', input.file);
  body.append('contractType', input.contractType);

  const name = input.name?.trim();
  if (name) {
    body.append('name', name);
  }

  if (input.stance) {
    body.append('stance', input.stance);
  }

  return api.post<UploadContractResult>('/contracts', body);
}

export function getContracts(filters: ContractFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return api.get<import('@/types/api').PageResult<ContractListItem>>(
    `/contracts${query ? `?${query}` : ''}`,
  );
}

export function getContractOverview() {
  return api.get<ContractOverview>('/contracts/overview');
}

export function getContract(projectId: string | number) {
  return api.get<ContractDetail>(`/contracts/${projectId}`);
}
