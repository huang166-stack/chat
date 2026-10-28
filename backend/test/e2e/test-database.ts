import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);

export interface TestDatabaseContext {
  adminUrl: string;
  created: boolean;
  name: string;
  url: string;
}

export async function createTestDatabase(): Promise<TestDatabaseContext> {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }

  const configuredUrl = process.env.E2E_DATABASE_URL?.trim();
  if (configuredUrl) {
    const url = new URL(configuredUrl);
    process.env.DATABASE_URL = configuredUrl;
    return {
      adminUrl: configuredUrl,
      created: false,
      name: url.pathname.replace(/^\//, ''),
      url: configuredUrl,
    };
  }

  const adminUrl = process.env.DATABASE_URL;
  if (!adminUrl) {
    throw new Error('DATABASE_URL or E2E_DATABASE_URL is required for e2e tests');
  }

  const databaseUrl = new URL(adminUrl);
  const name = `chat_e2e_${process.pid}_${Date.now()}`;
  databaseUrl.pathname = `/${name}`;
  const url = databaseUrl.toString();
  const admin = new PrismaClient({
    datasources: { db: { url: adminUrl } },
  });

  try {
    await admin.$executeRawUnsafe(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await admin.$disconnect();
  }

  try {
    const prismaCli = require.resolve('prisma/build/index.js');
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
      timeout: 180_000,
    });
  } catch (error) {
    await dropDatabase(adminUrl, name);
    throw new Error(
      `E2E database migration failed: ${sanitizeCommandError(error)}`,
    );
  }

  process.env.DATABASE_URL = url;
  return { adminUrl, created: true, name, url };
}

export async function dropTestDatabase(
  context: TestDatabaseContext | undefined,
) {
  if (!context?.created) {
    return;
  }

  await dropDatabase(context.adminUrl, context.name);
}

async function dropDatabase(adminUrl: string, name: string) {
  if (!/^chat_e2e_[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Refusing to drop unexpected database: ${name}`);
  }

  const admin = new PrismaClient({
    datasources: { db: { url: adminUrl } },
  });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
  } finally {
    await admin.$disconnect();
  }
}

function sanitizeCommandError(error: unknown) {
  const value = error as {
    message?: string;
    stderr?: Buffer | string;
  };
  const raw = value.stderr
    ? Buffer.isBuffer(value.stderr)
      ? value.stderr.toString('utf8')
      : value.stderr
    : (value.message ?? String(error));
  return raw
    .replace(/mysql:\/\/[^\s]+/g, 'mysql://***')
    .replace(/\s+/g, ' ')
    .slice(0, 1000);
}
