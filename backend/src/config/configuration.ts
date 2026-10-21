import { resolve } from 'node:path';
import type {
  StorageConfig,
  StorageDriverName,
} from '../storage/storage.types.js';

const DEV_SIGNING_SECRET = 'dev-storage-signing-secret-change-me';

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }

  throw new Error(`${name} must be a boolean`);
}

function readStorageDriver(): StorageDriverName {
  const value = (process.env.STORAGE_DRIVER ?? 'local').trim().toLowerCase();
  if (value !== 'local' && value !== 's3') {
    throw new Error('STORAGE_DRIVER must be either "local" or "s3"');
  }

  return value;
}

function readSigningSecret(nodeEnv: string): string {
  const secret = process.env.STORAGE_SIGNING_SECRET ?? DEV_SIGNING_SECRET;
  if (
    nodeEnv === 'production' &&
    (secret === DEV_SIGNING_SECRET || secret.length < 32)
  ) {
    throw new Error(
      'STORAGE_SIGNING_SECRET must be set to a value of at least 32 characters in production',
    );
  }

  return secret;
}

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const storageDriver = readStorageDriver();

  if (storageDriver === 's3') {
    const required = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
    }
  }

  const publicOrigin = (
    process.env.PUBLIC_ORIGIN ?? 'http://localhost:3001'
  ).replace(/\/+$/, '');
  const publicBaseUrl = (
    process.env.STORAGE_PUBLIC_BASE_URL ?? `${publicOrigin}/api`
  ).replace(/\/+$/, '');
  const queuePrefix = process.env.QUEUE_PREFIX || 'contract:';

  const storage: StorageConfig = {
    driver: storageDriver,
    localDir:
      process.env.STORAGE_LOCAL_DIR ?? resolve(process.cwd(), 'uploads'),
    publicBaseUrl,
    signingSecret: readSigningSecret(nodeEnv),
    signedUrlTtlSeconds: readPositiveInt('STORAGE_SIGNED_URL_TTL_SECONDS', 600),
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? '',
      region: process.env.S3_REGION ?? 'us-east-1',
      bucket: process.env.S3_BUCKET ?? '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      forcePathStyle: readBoolean('S3_FORCE_PATH_STYLE', false),
    },
  };

  return {
    port: readPositiveInt('PORT', 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    encryptionKey: process.env.APP_ENCRYPTION_KEY ?? '',
    jwt: {
      accessSecret:
        process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '2h',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    redis: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'chat:',
    },
    queue: {
      prefix: queuePrefix,
    },
    storage,
  };
};
