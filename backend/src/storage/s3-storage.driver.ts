import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, NotFoundException } from '@nestjs/common';
import { contentTypeForKey } from './storage-content-type.js';
import { normalizeStorageKey } from './storage-key.js';
import { StorageService, type StorageData } from './storage.service.js';
import type {
  PutObjectOptions,
  StorageConfig,
  StoredObject,
} from './storage.types.js';

@Injectable()
export class S3StorageDriver extends StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    super();
    this.client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint || undefined,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });
  }

  async put(
    key: string,
    data: StorageData,
    options?: PutObjectOptions,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: normalizeStorageKey(key),
        Body: data,
        ContentType: options?.contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredObject> {
    const normalized = normalizeStorageKey(key);

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: normalized,
        }),
      );

      if (!response.Body) {
        throw new NotFoundException('Storage object not found');
      }

      const body = Buffer.from(await response.Body.transformToByteArray());
      return {
        body,
        contentType: response.ContentType ?? contentTypeForKey(normalized),
        size: response.ContentLength ?? body.byteLength,
      };
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Storage object not found');
      }
      throw error;
    }
  }

  async signedUrl(
    key: string,
    expiresInSeconds = this.config.signedUrlTtlSeconds,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: normalizeStorageKey(key),
      }),
      { expiresIn: Math.max(1, Math.floor(expiresInSeconds)) },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: normalizeStorageKey(key),
      }),
    );
  }
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
