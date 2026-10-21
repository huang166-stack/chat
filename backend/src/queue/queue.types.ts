export interface ParseDocumentPayload {
  documentId: string;
  projectId: string;
  userId: string;
}

export interface ReviewDocumentPayload {
  taskId: string;
  documentId: string;
  userId: string;
}

export interface GenerateReportPayload {
  taskId: string;
  reportId: string;
  userId: string;
}

export interface CleanupPayload {
  scope: 'expired-contracts' | 'orphan-files';
  before: string;
}

export interface ContractJobPayloadMap {
  'parse-document': ParseDocumentPayload;
  'review-document': ReviewDocumentPayload;
  'generate-report': GenerateReportPayload;
  cleanup: CleanupPayload;
}

export type ContractJobName = keyof ContractJobPayloadMap;
export type ContractJobData = ContractJobPayloadMap[ContractJobName];
