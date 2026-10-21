import { extname } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
};

export function contentTypeForKey(key: string): string {
  return (
    CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream'
  );
}
