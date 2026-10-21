import { createHmac, timingSafeEqual } from 'node:crypto';

export function createStorageSignature(
  secret: string,
  key: string,
  expires: number,
): string {
  return createHmac('sha256', secret)
    .update(`${key}:${expires}`)
    .digest('base64url');
}

export function verifyStorageSignature(
  secret: string,
  key: string,
  expires: number,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!Number.isSafeInteger(expires) || expires <= nowSeconds) {
    return false;
  }

  const expected = Buffer.from(
    createStorageSignature(secret, key, expires),
    'base64url',
  );
  const actual = Buffer.from(signature, 'base64url');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
