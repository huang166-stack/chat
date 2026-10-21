import { api } from './client';

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
