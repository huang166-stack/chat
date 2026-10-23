export type ReportRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReportFindingStatus =
  'OPEN' | 'ACCEPTED' | 'IGNORED' | 'NEEDS_REVIEW';
export type ReportFindingSource = 'RULE' | 'MODEL';

export interface ReportFindingSnapshot {
  id: string;
  clauseOrder: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  source: ReportFindingSource;
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

export interface ReportStatistics {
  total: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  accepted: number;
  ignored: number;
  needsReview: number;
}

export interface ReportSnapshot {
  version: 1;
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
  statistics: ReportStatistics;
  findings: ReportFindingSnapshot[];
}
