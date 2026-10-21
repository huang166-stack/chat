export const CONTRACT_TYPES = [
  'SALES',
  'PURCHASE',
  'NDA',
  'EMPLOYMENT',
  'LEASE',
  'SERVICE',
  'OTHER',
] as const;

export type ContractTypeValue = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_STANCES = ['PARTY_A', 'PARTY_B', 'NEUTRAL'] as const;

export type ContractStanceValue = (typeof CONTRACT_STANCES)[number];

export const MAX_CONTRACT_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_CONTRACT_PAGES = 30;

export interface AllowedContractFileType {
  extension: '.pdf' | '.docx';
  mimeType: string;
}

export interface UploadedContractFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const ALLOWED_CONTRACT_FILE_TYPES: Record<
  AllowedContractFileType['extension'],
  AllowedContractFileType
> = {
  '.pdf': {
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
  '.docx': {
    extension: '.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
};
