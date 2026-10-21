import type { PutObjectOptions, StoredObject } from './storage.types.js';

export type StorageData = Buffer | Uint8Array | string;

export abstract class StorageService {
  abstract put(
    key: string,
    data: StorageData,
    options?: PutObjectOptions,
  ): Promise<void>;

  abstract get(key: string): Promise<StoredObject>;

  abstract signedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  abstract delete(key: string): Promise<void>;

  verifySignedUrl(_key: string, _expires: number, _signature: string): boolean {
    return false;
  }
}
