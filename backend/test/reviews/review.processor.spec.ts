import type { Job } from 'bullmq';
import type { CryptoService } from '../../src/common/services/crypto.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { ReviewProcessor } from '../../src/queue/processors/review.processor.js';
import type { ReviewDocumentPayload } from '../../src/queue/queue.types.js';
import type { ReviewModelService } from '../../src/reviews/review-model.service.js';
import type { ReviewProgressService } from '../../src/reviews/review-progress.service.js';
import type { RuleRunnerService } from '../../src/reviews/rule-runner.service.js';
import type { UsageService } from '../../src/usage/usage.service.js';

function makeTask(modelReview = true) {
  return {
    id: 10n,
    documentId: 20n,
    ruleSetId: 30n,
    modelConfigId: modelReview ? 40n : null,
    stance: 'PARTY_A',
    status: 'PENDING',
    modelConfig: modelReview
      ? {
          name: 'default',
          baseUrl: 'http://model.local/v1',
          apiKey: 'encrypted',
          modelName: 'test-model',
          maxTokens: 1024,
          temperature: 0.1,
        }
      : null,
    document: {
      id: 20n,
      filename: 'contract.pdf',
      parseStatus: 'SUCCESS',
      pageCount: 4,
      parsedText: '',
      projectId: 50n,
      project: {
        name: 'Demo contract',
        contractType: 'SALES',
        stance: 'PARTY_A',
      },
      clauses: [
        {
          id: 60n,
          orderNo: 1,
          clauseType: 'PAYMENT',
          heading: 'Payment',
          content: 'Payment is due after acceptance.',
          pageStart: 1,
          pageEnd: 1,
          charStart: 0,
          charEnd: 40,
        },
      ],
    },
  };
}

function makePrisma(task: ReturnType<typeof makeTask>) {
  const client = {
    reviewTask: {
      findFirst: vi.fn().mockResolvedValue(task),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    reviewFinding: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    contractProject: {
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };

  client.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: typeof client) => Promise<unknown>)(client);
    }
    return Promise.all(input as Array<Promise<unknown>>);
  });

  return client;
}

function makeJob(): Job<ReviewDocumentPayload> {
  return {
    id: 'review-job-1',
    name: 'review-document',
    data: {
      taskId: '10',
      documentId: '20',
      userId: '1',
    },
  } as Job<ReviewDocumentPayload>;
}

function makeRuleResult() {
  return {
    ruleSetId: '30',
    ruleSetVersion: 1,
    rules: [],
    llmRequests: [],
    findings: [
      {
        clauseId: 60n,
        source: 'RULE' as const,
        ruleCode: 'R001',
        category: '付款',
        riskLevel: 'HIGH' as const,
        title: '付款条件风险',
        analysis: '验收后付款缺少明确期限。',
        suggestion: '补充明确付款期限。',
        legalBasis: null,
        evidence: 'Payment is due after acceptance.',
        confidence: 0.95,
      },
    ],
  };
}

describe('ReviewProcessor', () => {
  it('keeps rule findings and succeeds when model review fails', async () => {
    const task = makeTask();
    const prisma = makePrisma(task);
    const progress = {
      set: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockResolvedValue(false),
    };
    const rules = {
      run: vi.fn().mockResolvedValue(makeRuleResult()),
    };
    const model = {
      review: vi.fn().mockRejectedValue(new Error('model unavailable')),
    };
    const usage = {
      ensureReviewCharge: vi.fn().mockResolvedValue(undefined),
      recordModelUsage: vi.fn().mockResolvedValue(undefined),
    };
    const crypto = {
      decrypt: vi.fn().mockReturnValue('decrypted-key'),
    };
    const processor = new ReviewProcessor(
      prisma as unknown as PrismaService,
      progress as unknown as ReviewProgressService,
      rules as unknown as RuleRunnerService,
      model as unknown as ReviewModelService,
      usage as unknown as UsageService,
      crypto as unknown as CryptoService,
    );

    const result = await processor.process(makeJob());

    expect(result).toMatchObject({
      taskId: '10',
      status: 'SUCCESS',
      ruleFindings: 1,
      modelFindings: 0,
      findingCount: 1,
    });
    expect(prisma.reviewFinding.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          taskId: 10n,
          source: 'RULE',
          ruleCode: 'R001',
        }),
      ],
    });
    expect(usage.ensureReviewCharge).toHaveBeenCalledWith(
      expect.anything(),
      10n,
      1n,
      4,
    );
    expect(usage.recordModelUsage).toHaveBeenCalledWith(
      expect.anything(),
      10n,
      1n,
      { tokensIn: 0, tokensOut: 0, calls: 0 },
    );
  });

  it('does not complete or charge when cancelled during aggregation', async () => {
    const task = makeTask(false);
    const prisma = makePrisma(task);
    prisma.reviewTask.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const progress = {
      set: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true),
    };
    const rules = {
      run: vi.fn().mockResolvedValue(makeRuleResult()),
    };
    const model = { review: vi.fn() };
    const usage = {
      ensureReviewCharge: vi.fn(),
      recordModelUsage: vi.fn(),
    };
    const crypto = { decrypt: vi.fn() };
    const processor = new ReviewProcessor(
      prisma as unknown as PrismaService,
      progress as unknown as ReviewProgressService,
      rules as unknown as RuleRunnerService,
      model as unknown as ReviewModelService,
      usage as unknown as UsageService,
      crypto as unknown as CryptoService,
    );

    const result = await processor.process(makeJob());

    expect(result).toEqual({ taskId: '10', cancelled: true });
    expect(prisma.contractProject.update).toHaveBeenCalledTimes(1);
    expect(prisma.contractProject.update).toHaveBeenCalledWith({
      where: { id: 50n },
      data: { status: 'REVIEWING' },
    });
    expect(usage.ensureReviewCharge).not.toHaveBeenCalled();
    expect(usage.recordModelUsage).not.toHaveBeenCalled();
  });

  it('does not restart a task that was cancelled before the worker update', async () => {
    const task = makeTask(false);
    const prisma = makePrisma(task);
    prisma.reviewTask.updateMany.mockResolvedValue({ count: 0 });
    const progress = {
      set: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockResolvedValue(true),
    };
    const rules = { run: vi.fn() };
    const model = { review: vi.fn() };
    const usage = {
      ensureReviewCharge: vi.fn(),
      recordModelUsage: vi.fn(),
    };
    const crypto = { decrypt: vi.fn() };
    const processor = new ReviewProcessor(
      prisma as unknown as PrismaService,
      progress as unknown as ReviewProgressService,
      rules as unknown as RuleRunnerService,
      model as unknown as ReviewModelService,
      usage as unknown as UsageService,
      crypto as unknown as CryptoService,
    );

    const result = await processor.process(makeJob());

    expect(result).toEqual({ taskId: '10', cancelled: true });
    expect(rules.run).not.toHaveBeenCalled();
    expect(prisma.contractProject.update).not.toHaveBeenCalled();
  });
});
