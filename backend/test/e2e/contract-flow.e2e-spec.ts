import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { MemberPlan } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  ReviewModelService,
  type ReviewModelInput,
} from '../../src/reviews/review-model.service.js';
import { createContractDocx } from './contract-docx.js';
import {
  createTestDatabase,
  dropTestDatabase,
  type TestDatabaseContext,
} from './test-database.js';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PASSWORD = 'ContractE2e123';
const runId = `${Date.now()}_${randomBytes(3).toString('hex')}`;

interface Fixtures {
  fileLimitPlan: MemberPlan;
  modelConfigId: string;
  quotaPlan: MemberPlan;
  ruleSetId: string;
  standardPlan: MemberPlan;
}

describe('Contract review flow (e2e)', () => {
  let app: INestApplication;
  let database: TestDatabaseContext | undefined;
  let fixtureData: Fixtures;
  let prisma: PrismaService;
  let storageDir: string;
  let userSequence = 0;
  let activeModelCalls = 0;
  let maxModelCalls = 0;

  const modelStub = {
    review: vi.fn(async (input: ReviewModelInput) => {
      activeModelCalls += 1;
      maxModelCalls = Math.max(maxModelCalls, activeModelCalls);
      await delay(80);
      activeModelCalls -= 1;

      const clause =
        input.clauses.find((item) => item.content.includes('争议解决')) ??
        input.clauses[0];
      return {
        findings: [
          {
            clauseId: clause?.id ?? null,
            source: 'MODEL' as const,
            ruleCode: null,
            category: '争议解决',
            riskLevel: 'HIGH' as const,
            title: '争议解决约定需要复核',
            analysis: '自动化模型桩命中争议解决条款，用于验证模型结果合并。',
            suggestion: '结合我方立场确认管辖法院或仲裁机构。',
            legalBasis: null,
            evidence: clause
              ? `第 ${clause.orderNo} 条：${clause.content.slice(0, 120)}`
              : null,
            confidence: 0.91,
          },
        ],
        usage: { tokensIn: 120, tokensOut: 60, calls: 1 },
        failedCalls: 0,
        attemptedCalls: 1,
      };
    }),
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.JWT_ACCESS_SECRET = `e2e-access-${runId}`;
    process.env.JWT_REFRESH_SECRET = `e2e-refresh-${runId}`;
    process.env.REDIS_KEY_PREFIX = `e2e-${runId}:`;
    process.env.QUEUE_PREFIX = `e2e-${runId}:`;
    process.env.STORAGE_DRIVER = 'local';
    process.env.STORAGE_SIGNING_SECRET = 'e2e-storage-signing-secret-32-chars';
    process.env.STORAGE_PUBLIC_BASE_URL = 'http://e2e.local/api';
    storageDir = join(tmpdir(), `contract-e2e-${runId}`);
    process.env.STORAGE_LOCAL_DIR = storageDir;
    await mkdir(storageDir, { recursive: true });

    database = await createTestDatabase();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ReviewModelService)
      .useValue(modelStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');

    prisma = app.get(PrismaService);
    fixtureData = await seedFixtures(prisma);
  });

  afterAll(async () => {
    await app?.close();
    await dropTestDatabase(database);
    if (storageDir) {
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it('serves health, enforces authentication, and blocks member access to admin APIs', async () => {
    await request(httpServer()).get('/api/health').expect(200);
    await request(httpServer()).get('/api/contracts').expect(401);

    const member = await createMemberUser(fixtureData.standardPlan, 'admin-guard');
    const memberToken = await login(member.username);

    const forbidden = await request(httpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
    expect(forbidden.body.code).toBe(10003);

    const admin = await createAdminUser('admin-check');
    const adminToken = await login(admin.username);
    await request(httpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('completes upload, parse, review, report, and signed download with user isolation', async () => {
    const owner = await createMemberUser(fixtureData.standardPlan, 'owner');
    const ownerToken = await login(owner.username);
    const viewer = await createMemberUser(fixtureData.standardPlan, 'viewer');
    const viewerToken = await login(viewer.username);

    const buffer = await createContractDocx({
      confidentiality: false,
      paymentDays: 90,
      unilateralTermination: true,
    });
    const upload = await uploadContract(ownerToken, buffer, 'full-flow.docx');
    expect(upload.status).toBe(201);

    const projectId = upload.body.data.projectId as string;
    const parsed = await waitForParsed(ownerToken, projectId);
    expect(parsed.document?.clauses.length).toBeGreaterThanOrEqual(4);
    expect(parsed.document?.parseStatus).toBe('SUCCESS');

    const isolated = await request(httpServer())
      .get(`/api/contracts/${projectId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(404);
    expect(isolated.body.code).toBe(10004);

    const reviewResponse = await request(httpServer())
      .post(`/api/contracts/${projectId}/review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        ruleSetId: fixtureData.ruleSetId,
        modelConfigId: fixtureData.modelConfigId,
      });
    expect(reviewResponse.status).toBe(201);
    const task = await waitForTask(
      ownerToken,
      reviewResponse.body.data.id as string,
    );
    expect(task.status).toBe('SUCCESS');
    expect(task.findingCounts.high).toBeGreaterThan(0);

    const findings = await request(httpServer())
      .get(`/api/contracts/${projectId}/findings?pageSize=100`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const findingList = findings.body.data.list as Array<{
      ruleCode: string | null;
      source: string;
    }>;
    const ruleCodes = findingList
      .map((item) => item.ruleCode)
      .filter((code): code is string => Boolean(code));
    expect(ruleCodes).toContain(`E2E_PAYMENT_${runId}`);
    expect(ruleCodes).toContain(`E2E_TERMINATION_${runId}`);
    expect(findingList.some((item) => item.source === 'MODEL')).toBe(true);

    const reportCreate = await request(httpServer())
      .post(`/api/contracts/${projectId}/report`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    const reportId = reportCreate.body.data.id as string;
    const report = await waitForReport(ownerToken, projectId);
    expect(report.id).toBe(reportId);
    expect(report.status).toBe('SUCCESS');

    const download = await request(httpServer())
      .get(`/api/reports/${reportId}/download`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const signedUrl = new URL(download.body.data.url as string);
    const file = await request(httpServer())
      .get(`${signedUrl.pathname}${signedUrl.search}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
        response.on('error', (error) => callback(error, undefined));
      })
      .expect(200);
    expect(file.headers['content-type']).toContain('wordprocessingml');
    expect(file.body.subarray(0, 2).toString()).toBe('PK');
  });

  it('enforces membership, quota, and plan-specific upload limits', async () => {
    const fileLimited = await createMemberUser(
      fixtureData.fileLimitPlan,
      'file-limit',
    );
    const fileToken = await login(fileLimited.username);
    const oversized = await createContractDocx({ paddingBytes: 1_500_000 });
    const rejected = await uploadContract(
      fileToken,
      oversized,
      'oversized.docx',
    );
    expect(rejected.status).toBe(413);
    expect(rejected.body.code).toBe(10013);

    const nonMemberUsername = await createPlainUser('non-member');
    const nonMemberToken = await login(nonMemberUsername);
    const nonMemberProject = await uploadAndParse(
      nonMemberToken,
      'non-member.docx',
    );
    const nonMemberReview = await request(httpServer())
      .post(`/api/contracts/${nonMemberProject}/review`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({ ruleSetId: fixtureData.ruleSetId });
    expect(nonMemberReview.status).toBe(403);
    expect(nonMemberReview.body.code).toBe(10007);

    const quotaUser = await createMemberUser(fixtureData.quotaPlan, 'quota');
    const quotaToken = await login(quotaUser.username);
    const quotaProject = await uploadAndParse(quotaToken, 'quota.docx');
    const quotaReview = await request(httpServer())
      .post(`/api/contracts/${quotaProject}/review`)
      .set('Authorization', `Bearer ${quotaToken}`)
      .send({ ruleSetId: fixtureData.ruleSetId });
    expect(quotaReview.status).toBe(429);
    expect(quotaReview.body.code).toBe(10018);
  });

  it('runs five concurrent review tasks across five users', async () => {
    const users = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createMemberUser(fixtureData.standardPlan, `concurrent-${index + 1}`),
      ),
    );
    const tokens = await Promise.all(users.map((user) => login(user.username)));
    const buffer = await createContractDocx({ paymentDays: 30 });
    const projects = await Promise.all(
      tokens.map((token, index) =>
        uploadAndParse(token, `concurrent-${index + 1}.docx`, buffer),
      ),
    );

    const startedAt = performance.now();
    const created = await Promise.all(
      projects.map((projectId, index) =>
        request(httpServer())
          .post(`/api/contracts/${projectId}/review`)
          .set('Authorization', `Bearer ${tokens[index]}`)
          .send({
            ruleSetId: fixtureData.ruleSetId,
            modelConfigId: fixtureData.modelConfigId,
          }),
      ),
    );
    const taskIds = created.map((response) => {
      expect(response.status).toBe(201);
      return response.body.data.id as string;
    });
    const tasks = await Promise.all(
      taskIds.map((taskId, index) => waitForTask(tokens[index], taskId)),
    );
    const durationMs = Math.round(performance.now() - startedAt);

    expect(tasks.every((task) => task.status === 'SUCCESS')).toBe(true);
    expect(maxModelCalls).toBeLessThanOrEqual(2);
    expect(durationMs).toBeLessThan(60_000);
    console.info(
      `[e2e] 5 concurrent reviews completed in ${durationMs}ms; model concurrency=${maxModelCalls}`,
    );
  });

  function httpServer() {
    return app.getHttpServer();
  }

  async function seedFixtures(client: PrismaService): Promise<Fixtures> {
    const planBase = {
      durationType: 'MONTH_1' as const,
      durationDays: 30,
      enabled: 1,
      price: 0,
      sort: -1000,
    };
    const standardPlan = await client.memberPlan.create({
      data: {
        ...planBase,
        name: `E2E 标准套餐 ${runId}`,
        reviewQuota: 50,
        maxContractPages: 30,
        maxFileSizeMb: 20,
      },
    });
    const quotaPlan = await client.memberPlan.create({
      data: {
        ...planBase,
        name: `E2E 零额度套餐 ${runId}`,
        reviewQuota: 0,
        maxContractPages: 30,
        maxFileSizeMb: 20,
      },
    });
    const fileLimitPlan = await client.memberPlan.create({
      data: {
        ...planBase,
        name: `E2E 小文件套餐 ${runId}`,
        reviewQuota: 10,
        maxContractPages: 30,
        maxFileSizeMb: 1,
      },
    });
    const modelConfig = await client.modelConfig.create({
      data: {
        name: `E2E 模型 ${runId}`,
        provider: 'CUSTOM',
        baseUrl: 'http://127.0.0.1:9/v1',
        modelName: 'e2e-stub',
        enabled: 1,
        sort: -1000,
      },
    });

    const confidentialityRule = await client.reviewRule.create({
      data: {
        code: `E2E_CONFIDENTIALITY_${runId}`,
        name: '缺少保密条款',
        category: '保密',
        severity: 'HIGH',
        ruleType: 'PRESENCE',
        configJson: {
          match: { keywords: ['保密义务'], mode: 'ANY' },
          expect: 'PRESENT',
        },
        enabled: 1,
        version: 1,
      },
    });
    const paymentRule = await client.reviewRule.create({
      data: {
        code: `E2E_PAYMENT_${runId}`,
        name: '付款周期过长',
        category: '付款',
        severity: 'MEDIUM',
        ruleType: 'THRESHOLD',
        configJson: {
          field: 'paymentDays',
          operator: '>',
          value: 60,
        },
        enabled: 1,
        version: 1,
      },
    });
    const terminationRule = await client.reviewRule.create({
      data: {
        code: `E2E_TERMINATION_${runId}`,
        name: '单方无条件解除',
        category: '终止',
        severity: 'HIGH',
        ruleType: 'KEYWORD',
        configJson: {
          match: { keywords: ['随时单方解除'], mode: 'ANY' },
          expect: 'ABSENT',
        },
        enabled: 1,
        version: 1,
      },
    });
    const ruleSet = await client.reviewRuleSet.create({
      data: {
        name: `E2E 规则集 ${runId}`,
        stance: 'NEUTRAL',
        enabled: 1,
        version: 1,
        items: {
          create: [confidentialityRule, paymentRule, terminationRule].map(
            (rule, index) => ({
              ruleId: rule.id,
              enabled: 1,
              sort: index + 1,
            }),
          ),
        },
      },
    });

    return {
      fileLimitPlan,
      modelConfigId: String(modelConfig.id),
      quotaPlan,
      ruleSetId: String(ruleSet.id),
      standardPlan,
    };
  }

  async function createMemberUser(plan: MemberPlan, label: string) {
    const user = await createUser(label, 'USER');
    const now = Date.now();
    await prisma.userMembership.create({
      data: {
        userId: user.id,
        expireAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.order.create({
      data: {
        orderNo: `E2E-${runId}-${user.sequence}`,
        userId: user.id,
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        amount: plan.price,
        status: 'PAID',
        paidAt: new Date(now),
      },
    });
    return user;
  }

  async function createAdminUser(label: string) {
    return createUser(label, 'ADMIN');
  }

  async function createPlainUser(label: string) {
    const user = await createUser(label, 'USER');
    return user.username;
  }

  async function createUser(label: string, role: 'USER' | 'ADMIN') {
    const sequence = ++userSequence;
    const username = `${label}_${runId}_${sequence}`.slice(0, 64);
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const user = await prisma.user.create({
      data: { username, passwordHash, role, status: 1 },
    });
    return { id: user.id, sequence, username, token: '' };
  }

  async function login(username: string): Promise<string> {
    const response = await request(httpServer())
      .post('/api/auth/login')
      .send({ username, password: PASSWORD })
      .expect(201);
    return response.body.data.accessToken as string;
  }

  async function uploadContract(
    token: string,
    buffer: Buffer,
    filename: string,
  ) {
    return request(httpServer())
      .post('/api/contracts')
      .set('Authorization', `Bearer ${token}`)
      .field('contractType', 'SALES')
      .attach('file', buffer, { filename, contentType: DOCX_MIME });
  }

  async function uploadAndParse(
    token: string,
    filename: string,
    buffer?: Buffer,
  ) {
    const response = await uploadContract(
      token,
      buffer ?? (await createContractDocx()),
      filename,
    );
    expect(response.status).toBe(201);
    const projectId = response.body.data.projectId as string;
    await waitForParsed(token, projectId);
    return projectId;
  }

  async function waitForParsed(token: string, projectId: string) {
    return waitFor(
      async () => {
        const response = await request(httpServer())
          .get(`/api/contracts/${projectId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const contract = response.body.data as {
          document: {
            clauses: Array<{ content: string; orderNo: number }>;
            parseError: string | null;
            parseStatus: string;
          } | null;
        };
        if (contract.document?.parseStatus === 'FAILED') {
          throw new Error(
            `Contract parse failed: ${contract.document.parseError ?? 'unknown error'}`,
          );
        }
        return contract;
      },
      (contract) => contract.document?.parseStatus === 'SUCCESS',
      'contract parse',
    );
  }

  async function waitForTask(token: string, taskId: string) {
    const task = await waitFor(
      async () => {
        const response = await request(httpServer())
          .get(`/api/review-tasks/${taskId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        return response.body.data as {
          errorMessage: string | null;
          findingCounts: { high: number };
          status: string;
        };
      },
      (value) => value.status === 'SUCCESS' || value.status === 'FAILED',
      'review task',
    );
    if (task.status === 'FAILED') {
      throw new Error(`Review failed: ${task.errorMessage ?? 'unknown error'}`);
    }
    return task;
  }

  async function waitForReport(token: string, projectId: string) {
    const report = await waitFor(
      async () => {
        const response = await request(httpServer())
          .get(`/api/contracts/${projectId}/report`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        return response.body.data as {
          errorMessage: string | null;
          id: string;
          status: string;
        } | null;
      },
      (value) => value?.status === 'SUCCESS' || value?.status === 'FAILED',
      'review report',
    );
    if (!report || report.status === 'FAILED') {
      throw new Error(
        `Report failed: ${report?.errorMessage ?? 'unknown error'}`,
      );
    }
    return report;
  }
});

async function waitFor<T>(
  read: () => Promise<T>,
  accept: (value: T) => boolean,
  label: string,
  timeoutMs = 30_000,
) {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T | undefined;
  while (Date.now() < deadline) {
    lastValue = await read();
    if (accept(lastValue)) {
      return lastValue;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(lastValue)}`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

