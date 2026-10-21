export type StorageDriverName = 'local' | 's3';

export interface StorageS3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export interface StorageConfig {
  driver: StorageDriverName;
  localDir: string;
  publicBaseUrl: string;
  signingSecret: string;
  signedUrlTtlSeconds: number;
  s3: StorageS3Config;
}

export interface PutObjectOptions {
  contentType?: string;
}

export interface StoredObject {
  body: Buffer;
  contentType: string;
  size: number;
}
