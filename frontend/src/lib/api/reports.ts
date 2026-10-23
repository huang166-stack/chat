import { api } from './client';

export type ReviewReportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED';

export type ReportRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReportFindingStatus =
  | 'OPEN'
  | 'ACCEPTED'
  | 'IGNORED'
  | 'NEEDS_REVIEW';

export interface ReportFindingSummary {
  id: string;
  clauseOrder: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  source: 'RULE' | 'MODEL';
  category: string;
  riskLevel: ReportRiskLevel;
  title: string;
  analysis: string;
  suggestion: string | null;
  legalBasis: string | null;
  evidence: string | null;
  status: ReportFindingStatus;
  updatedAt: string;
}

export interface ReportSummary {
  version: number;
  generatedAt: string;
  reportFilename: string;
  contract: {
    id: string;
    name: string;
    contractType: string;
    stance: string;
    counterparty: string | null;
    documentFilename: string;
    pageCount: number;
  };
  review: {
    taskId: string;
    status: string;
    ruleSetName: string | null;
    ruleSetVersion: number | null;
    modelName: string | null;
    completedAt: string | null;
  };
  statistics: {
    total: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    accepted: number;
    ignored: number;
    needsReview: number;
  };
  findings: ReportFindingSummary[];
}

export interface ReviewReport {
  id: string;
  taskId: string;
  format: 'DOCX' | 'PDF';
  status: ReviewReportStatus;
  errorMessage: string | null;
  summary: ReportSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDownload {
  url: string;
  filename: string;
  format: 'DOCX' | 'PDF';
  expiresAt: string;
}

export function generateReport(projectId: string | number) {
  return api.post<ReviewReport>(`/contracts/${projectId}/report`);
}

export function getLatestReport(projectId: string | number) {
  return api.get<ReviewReport | null>(`/contracts/${projectId}/report`);
}

export function getReport(reportId: string | number) {
  return api.get<ReviewReport>(`/reports/${reportId}`);
}

export function getReportDownload(reportId: string | number) {
  return api.get<ReportDownload>(`/reports/${reportId}/download`);
}
