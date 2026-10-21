import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { contentTypeForKey } from './storage-content-type.js';
import { normalizeStorageKey } from './storage-key.js';
import {
  createStorageSignature,
  verifyStorageSignature,
} from './storage-signature.js';
import { StorageService, type StorageData } from './storage.service.js';
import type {
  PutObjectOptions,
  StorageConfig,
  StoredObject,
} from './storage.types.js';

@Injectable()
export class LocalStorageDriver extends StorageService {
  private readonly rootDir: string;

  constructor(private readonly config: StorageConfig) {
    super();
    this.rootDir = resolve(config.localDir);
  }

  async put(
    key: string,
    data: StorageData,
    _options?: PutObjectOptions,
  ): Promise<void> {
    const target = this.resolvePath(normalizeStorageKey(key));
    await mkdir(dirname(target), { recursive: true });

    const temporaryPath = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, data);
      await rename(temporaryPath, target);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  async get(key: string): Promise<StoredObject> {
    const normalized = normalizeStorageKey(key);
    const target = this.resolvePath(normalized);

    try {
      const file = await stat(target);
      if (!file.isFile()) {
        throw new NotFoundException('Storage object not found');
      }

      return {
        body: await readFile(target),
        contentType: contentTypeForKey(normalized),
        size: file.size,
      };
    } catch (error) {
      if (isEnoent(error)) {
        throw new NotFoundException('Storage object not found');
      }
      throw error;
    }
  }

  async signedUrl(
    key: string,
    expiresInSeconds = this.config.signedUrlTtlSeconds,
  ): Promise<string> {
    const normalized = normalizeStorageKey(key);
    const ttl = Math.max(1, Math.floor(expiresInSeconds));
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const signature = createStorageSignature(
      this.config.signingSecret,
      normalized,
      expires,
    );
    const params = new URLSearchParams({
      key: normalized,
      expires: String(expires),
      signature,
    });

    return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/storage/local?${params.toString()}`;
  }

  async delete(key: string): Promise<void> {
    const target = this.resolvePath(normalizeStorageKey(key));
    try {
      await unlink(target);
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
    }
  }

  override verifySignedUrl(
    key: string,
    expires: number,
    signature: string,
  ): boolean {
    try {
      return verifyStorageSignature(
        this.config.signingSecret,
        normalizeStorageKey(key),
        expires,
        signature,
      );
    } catch {
      return false;
    }
  }

  private resolvePath(key: string): string {
    const target = resolve(this.rootDir, key);
    const root = this.rootDir.endsWith(sep)
      ? this.rootDir
      : `${this.rootDir}${sep}`;
    if (!target.toLowerCase().startsWith(root.toLowerCase())) {
      throw new Error('Invalid storage key');
    }
    return target;
  }
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
