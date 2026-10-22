export const CLAUSE_TYPES = [
  'PAYMENT',
  'BREACH',
  'TERMINATION',
  'CONFIDENTIALITY',
  'INTELLECTUAL_PROPERTY',
  'DISPUTE_RESOLUTION',
  'OTHER',
] as const;

export type ClauseType = (typeof CLAUSE_TYPES)[number];

export interface ParsedPage {
  pageNumber: number;
  text: string;
  charStart: number;
  charEnd: number;
}

export interface ParsedDocument {
  text: string;
  pages: ParsedPage[];
  pageCount: number;
}

export interface ParsedClause {
  orderNo: number;
  clauseType: ClauseType;
  heading: string | null;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  charStart: number;
  charEnd: number;
}

export interface ParseResult {
  documentId: string;
  clauseCount: number;
  skipped: boolean;
}
