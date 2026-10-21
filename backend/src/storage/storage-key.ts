export function normalizeStorageKey(rawKey: string): string {
  const normalized = rawKey.trim().replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) {
    throw new Error('Invalid storage key');
  }

  const segments = normalized.split('/');
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.includes(':'),
    )
  ) {
    throw new Error('Invalid storage key');
  }

  return segments.join('/');
}
