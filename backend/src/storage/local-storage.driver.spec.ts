import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageDriver } from './local-storage.driver.js';
import {
  createStorageSignature,
  verifyStorageSignature,
} from './storage-signature.js';
import type { StorageConfig } from './storage.types.js';

describe('LocalStorageDriver', () => {
  let rootDir: string;
  let driver: LocalStorageDriver;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'chat-storage-'));
    const config: StorageConfig = {
      driver: 'local',
      localDir: rootDir,
      publicBaseUrl: 'http://localhost:3001/api',
      signingSecret: 'test-storage-signing-secret-123456',
      signedUrlTtlSeconds: 600,
      s3: {
        endpoint: '',
        region: 'us-east-1',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        forcePathStyle: false,
      },
    };
    driver = new LocalStorageDriver(config);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('stores and reads an object', async () => {
    await driver.put('contracts/1/sample.txt', 'hello contract');

    const object = await driver.get('contracts/1/sample.txt');

    expect(object.body.toString('utf8')).toBe('hello contract');
    expect(object.contentType).toBe('text/plain; charset=utf-8');
    expect(object.size).toBe(14);
  });

  it('creates a signed url that can be verified', async () => {
    const url = await driver.signedUrl('contracts/1/sample.pdf', 60);
    const parsed = new URL(url);
    const key = parsed.searchParams.get('key') ?? '';
    const expires = Number(parsed.searchParams.get('expires'));
    const signature = parsed.searchParams.get('signature') ?? '';

    expect(parsed.pathname).toBe('/api/storage/local');
    expect(key).toBe('contracts/1/sample.pdf');
    expect(driver.verifySignedUrl(key, expires, signature)).toBe(true);
    expect(driver.verifySignedUrl(key, expires, 'invalid-signature')).toBe(
      false,
    );
  });

  it('rejects expired signatures', () => {
    const now = Math.floor(Date.now() / 1000);
    const signature = createStorageSignature(
      'test-secret',
      'contracts/1/a.pdf',
      now - 1,
    );

    expect(
      verifyStorageSignature(
        'test-secret',
        'contracts/1/a.pdf',
        now - 1,
        signature,
        now,
      ),
    ).toBe(false);
  });

  it('deletes an object idempotently', async () => {
    await driver.put('contracts/1/delete-me.txt', 'bye');
    await driver.delete('contracts/1/delete-me.txt');
    await driver.delete('contracts/1/delete-me.txt');

    await expect(driver.get('contracts/1/delete-me.txt')).rejects.toBeDefined();
  });

  it('rejects path traversal keys', async () => {
    await expect(driver.put('../escape.txt', 'bad')).rejects.toThrow(
      'Invalid storage key',
    );
    await expect(driver.get('contracts/../../escape.txt')).rejects.toThrow(
      'Invalid storage key',
    );
  });
});
