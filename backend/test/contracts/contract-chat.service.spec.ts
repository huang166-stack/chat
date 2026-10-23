import type { AiClientService } from '../../src/ai/ai-client.service.js';
import type { CryptoService } from '../../src/common/services/crypto.service.js';
import type { RedisService } from '../../src/common/services/redis.service.js';
import {
  ContractChatService,
  selectRelevantClauses,
  type ContractClauseSnapshot,
} from '../../src/contracts/contract-chat.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

function clause(
  orderNo: number,
  clauseType: string,
  heading: string,
  content: string,
): ContractClauseSnapshot {
  return {
    id: BigInt(orderNo),
    orderNo,
    clauseType,
    heading,
    content,
    pageStart: 1,
    pageEnd: 1,
  };
}

const clauses = [
  clause(
    1,
    'PAYMENT',
    '付款方式',
    '买方应在验收后三十日内支付货款，逾期按日万分之五支付违约金。',
  ),
  clause(
    2,
    'CONFIDENTIALITY',
    '保密义务',
    '双方应对商业秘密承担保密义务，未经书面同意不得披露。',
  ),
  clause(
    3,
    'DISPUTE_RESOLUTION',
    '争议解决',
    '因本合同产生争议，由甲方所在地人民法院管辖。',
  ),
];

function createService() {
  const project = {
    id: 10n,
    name: '测试采购合同',
    contractType: 'SALES',
    stance: 'PARTY_A',
    documents: [
      {
        filename: 'contract.docx',
        pageCount: 2,
        parseStatus: 'SUCCESS',
        clauses,
      },
    ],
  };
  const prisma = {
    contractProject: { findFirst: vi.fn().mockResolvedValue(project) },
    userMembership: {
      findUnique: vi.fn().mockResolvedValue({
        expireAt: new Date(Date.now() + 86_400_000),
      }),
    },
    modelConfig: {
      findFirst: vi.fn().mockResolvedValue({
        id: 5n,
        baseUrl: 'http://model.local/v1',
        apiKey: 'encrypted',
        modelName: 'test-model',
        maxTokens: 2048,
        temperature: 0.2,
      }),
    },
    usageLedger: { create: vi.fn().mockResolvedValue({}) },
  };
  const values = new Map<string, string>();
  const redis = {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      values.delete(key);
      return 1;
    }),
  };
  const aiClient = {
    streamChat: vi.fn(
      async (
        _params: unknown,
        _messages: unknown,
        _signal: AbortSignal,
        onDelta: (content: string) => void,
      ) => {
        onDelta('根据[第1条]，');
        onDelta('买方应在验收后三十日内付款。');
        return '根据[第1条]，买方应在验收后三十日内付款。';
      },
    ),
  };
  const crypto = { decrypt: vi.fn().mockReturnValue('api-key') };
  const service = new ContractChatService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
    crypto as unknown as CryptoService,
    aiClient as unknown as AiClientService,
  );

  return { service, prisma, redis, aiClient, crypto, project };
}

function dto(overrides: Record<string, unknown> = {}) {
  return {
    content: '付款期限是多长？',
    requestId: 'req-12345678',
    ...overrides,
  };
}

describe('contract clause retrieval', () => {
  it('prioritizes explicit clause references', () => {
    const selected = selectRelevantClauses('第十二条和第三条分别约定了什么？', [
      ...clauses,
      clause(12, 'OTHER', '附件', '附件内容'),
    ]);

    expect(selected.map((item) => item.orderNo)).toEqual([3, 12]);
  });

  it('matches clause type and keywords within the top eight', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      clause(index + 1, 'PAYMENT', '付款条款', `付款约定 ${index + 1}`),
    );
    many.push(clauses[1]);

    const selected = selectRelevantClauses('付款约定有哪些？', many);

    expect(selected).toHaveLength(8);
    expect(selected.every((item) => item.clauseType === 'PAYMENT')).toBe(true);
  });

  it('returns no context for an unrelated question', () => {
    expect(selectRelevantClauses('火星殖民地由谁管理？', clauses)).toEqual([]);
  });
});

describe('ContractChatService', () => {
  it('streams a grounded answer and records token usage', async () => {
    const { service, prisma, aiClient, redis } = createService();
    const starts: unknown[] = [];
    const deltas: string[] = [];

    const result = await service.sendMessage(1n, 'USER', 10n, dto(), {
      signal: AbortSignal.timeout(5000),
      onStart: (start) => starts.push(start),
      onDelta: (content) => deltas.push(content),
    });

    expect(result.content).toContain('[第1条]');
    expect(result.citations).toEqual([
      expect.objectContaining({ orderNo: 1, clauseId: '1' }),
    ]);
    expect(starts).toHaveLength(1);
    expect(deltas.join('')).toBe(result.content);
    expect(prisma.usageLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1n,
        kind: 'MODEL_CALL',
        credits: 0,
      }),
    });
    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(aiClient.streamChat).toHaveBeenCalledTimes(1);
  });

  it('replays a completed request idempotently without another model call', async () => {
    const { service, aiClient, prisma } = createService();
    const callbacks = () => ({
      signal: AbortSignal.timeout(5000),
      onStart: vi.fn(),
      onDelta: vi.fn(),
    });

    const first = await service.sendMessage(
      1n,
      'USER',
      10n,
      dto(),
      callbacks(),
    );
    const replayed = await service.sendMessage(
      1n,
      'USER',
      10n,
      dto(),
      callbacks(),
    );

    expect(replayed).toEqual(first);
    expect(aiClient.streamChat).toHaveBeenCalledTimes(1);
    expect(prisma.usageLedger.create).toHaveBeenCalledTimes(1);
  });

  it('answers deterministically when no relevant clause exists', async () => {
    const { service, prisma, aiClient } = createService();
    const onStart = vi.fn();
    const onDelta = vi.fn();

    const result = await service.sendMessage(
      1n,
      'USER',
      10n,
      dto({ content: '火星殖民地由谁管理？', requestId: 'req-no-match-1' }),
      {
        signal: AbortSignal.timeout(5000),
        onStart,
        onDelta,
      },
    );

    expect(result.content).toContain('合同中未找到');
    expect(result.citations).toEqual([]);
    expect(aiClient.streamChat).not.toHaveBeenCalled();
    expect(prisma.usageLedger.create).not.toHaveBeenCalled();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onDelta).toHaveBeenCalledWith(result.content);
  });

  it('keeps only the five most recent conversation rounds', async () => {
    const { service, aiClient } = createService();
    const history = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
      content: `历史消息${index + 1}`,
    }));

    await service.sendMessage(
      1n,
      'USER',
      10n,
      dto({ history, requestId: 'req-history-1' }),
      { signal: AbortSignal.timeout(5000) },
    );

    const messages = aiClient.streamChat.mock.calls[0][1] as Array<{
      role: string;
      content: string;
    }>;
    const historyMessages = messages.slice(1, -1);
    expect(historyMessages).toHaveLength(10);
    expect(historyMessages[0].content).toBe('历史消息3');
    expect(historyMessages[9].content).toBe('历史消息12');
  });

  it('scopes contract access to the current user and enforces membership', async () => {
    const { service, prisma } = createService();
    await expect(
      service.sendMessage(1n, 'USER', 10n, dto(), {
        signal: AbortSignal.timeout(5000),
      }),
    ).resolves.toMatchObject({ contractId: '10' });

    expect(prisma.contractProject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 10n, userId: 1n }),
      }),
    );

    prisma.userMembership.findUnique.mockResolvedValue({
      expireAt: new Date(0),
    });
    await expect(
      service.sendMessage(1n, 'USER', 10n, dto({ requestId: 'req-member-1' }), {
        signal: AbortSignal.timeout(5000),
      }),
    ).rejects.toThrow('请先开通会员');
  });
});
