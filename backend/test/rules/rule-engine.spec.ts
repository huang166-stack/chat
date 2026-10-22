import type { RiskLevel, RuleType } from '@prisma/client';
import { RuleRunnerService } from '../../src/reviews/rule-runner.service.js';
import { RuleConfigValidator } from '../../src/rules/rule-config.validator.js';
import { RuleHandlersService } from '../../src/rules/rule-handlers.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { RuleSetService } from '../../src/rules/rule-set.service.js';
import type {
  EvaluationClause,
  LoadedRuleSet,
  ReviewRuleDefinition,
} from '../../src/rules/rules.types.js';

interface SeedRule {
  code: string;
  name: string;
  category: string;
  severity: RiskLevel;
  ruleType: RuleType;
  description: string;
  configJson: Record<string, unknown>;
  prompt?: string;
}

interface RuleScenario {
  hit: EvaluationClause[];
  miss: EvaluationClause[];
}

const { DEFAULT_RULES } =
  (await import('../../prisma/seed-review-rules.js')) as {
    DEFAULT_RULES: SeedRule[];
  };

const validator = new RuleConfigValidator();
const handlers = new RuleHandlersService();

function clause(
  content: string,
  orderNo = 1,
  clauseType = 'OTHER',
): EvaluationClause {
  const heading = content.split('\n')[0];
  return {
    id: BigInt(orderNo),
    orderNo,
    clauseType,
    heading,
    content,
    pageStart: 1,
    pageEnd: 1,
    charStart: 0,
    charEnd: content.length,
  };
}

const SCENARIOS: Record<string, RuleScenario> = {
  CONFIDENTIALITY_MISSING: {
    hit: [clause('第一条 付款\n买方应在验收后支付货款。')],
    miss: [clause('第一条 保密义务\n双方应对商业秘密承担保密义务。')],
  },
  LIABILITY_CAP_MISSING: {
    hit: [clause('第一条 合同履行\n双方应按约定履行义务。')],
    miss: [clause('第一条 责任\n赔偿责任限额为合同总额。')],
  },
  UNILATERAL_TERMINATION: {
    hit: [clause('第一条 合同终止\n甲方有权随时单方解除合同。')],
    miss: [clause('第一条 合同终止\n任何一方提前三十日书面通知后可解除合同。')],
  },
  PAYMENT_TERM_LONG: {
    hit: [clause('第一条 付款\n买方应在收到发票后90日内支付货款。')],
    miss: [clause('第一条 付款\n买方应在收到发票后30日内支付货款。')],
  },
  AUTO_RENEWAL: {
    hit: [clause('第一条 续约\n本合同期满自动续约。')],
    miss: [
      clause(
        '第一条 续约\n本合同期满自动续约，任何一方可提前三十日书面通知不续约。',
      ),
    ],
  },
  JURISDICTION_UNFAVORABLE: {
    hit: [
      clause(
        '第一条 争议解决\n因本合同产生的争议提交上海仲裁委员会仲裁。',
        1,
        'DISPUTE_RESOLUTION',
      ),
    ],
    miss: [clause('第一条 合同履行\n双方应按约定履行义务。')],
  },
  IP_TRANSFER_ALL: {
    hit: [clause('第一条 知识产权\n项目成果的全部知识产权归甲方所有。')],
    miss: [clause('第一条 知识产权\n知识产权归属由双方另行协商。')],
  },
  DATA_PROTECTION_MISSING: {
    hit: [clause('第一条 服务内容\n乙方提供软件维护服务。')],
    miss: [clause('第一条 数据保护\n双方应遵守个人信息保护和数据安全要求。')],
  },
  ACCEPTANCE_TOO_SHORT: {
    hit: [clause('第一条 验收\n买方应在1日内完成验收。')],
    miss: [clause('第一条 验收\n买方应在10日内完成验收。')],
  },
  PENALTY_TOO_HIGH: {
    hit: [clause('第一条 违约责任\n违约金比例为合同总额的40%。')],
    miss: [clause('第一条 违约责任\n违约金比例为合同总额的10%。')],
  },
};

function definition(seed: SeedRule, index: number): ReviewRuleDefinition {
  return {
    id: BigInt(index + 1),
    code: seed.code,
    name: seed.name,
    category: seed.category,
    severity: seed.severity,
    ruleType: seed.ruleType,
    description: seed.description,
    config: validator.validate(seed.ruleType, seed.configJson),
    prompt: seed.prompt ?? null,
    version: 1,
  };
}

describe('rule configuration validation', () => {
  it.each(DEFAULT_RULES)('accepts built-in rule $code', (seed) => {
    expect(() =>
      validator.validate(seed.ruleType, seed.configJson),
    ).not.toThrow();
  });

  it('rejects invalid keyword configuration', () => {
    expect(() =>
      validator.validate('KEYWORD', {
        match: { keywords: ['无限责任'] },
        expect: 'ABSENT',
      }),
    ).toThrow('规则配置无效');
  });

  it('rejects invalid regular expressions', () => {
    expect(() =>
      validator.validate('REGEX', { pattern: '[', expect: 'MATCH' }),
    ).toThrow('正则表达式无效');
  });
});

describe('built-in rule handlers', () => {
  it('covers every seeded built-in rule', () => {
    expect(DEFAULT_RULES).toHaveLength(10);
    expect(Object.keys(SCENARIOS).sort()).toEqual(
      DEFAULT_RULES.map((rule) => rule.code).sort(),
    );
  });

  describe.each(DEFAULT_RULES.map((seed, index) => ({ seed, index })))(
    '$seed.code',
    ({ seed, index }) => {
      const rule = definition(seed, index);
      const scenario = SCENARIOS[seed.code];

      it('hits with a traceable finding or LLM request', () => {
        const result = handlers.execute(rule, {
          clauses: scenario.hit,
          stance: 'BUYER',
        });

        if (seed.ruleType === 'LLM') {
          expect(result.findings).toEqual([]);
          expect(result.llmRequests).toHaveLength(1);
          expect(result.llmRequests[0].clauses[0].content).toContain('仲裁');
          return;
        }

        expect(result.findings.length).toBeGreaterThan(0);
        const finding = result.findings[0];
        expect(finding).toMatchObject({
          source: 'RULE',
          ruleCode: seed.code,
          category: seed.category,
          riskLevel: seed.severity,
          title: seed.name,
        });
        if (finding.clauseId !== null) {
          expect(finding.evidence).toMatch(/^第 \d+ 条（第 1 页）：/);
        } else {
          expect(finding.evidence).toBeNull();
        }
      });

      it('does not produce a conclusion on a safe clause', () => {
        const result = handlers.execute(rule, {
          clauses: scenario.miss,
          stance: 'BUYER',
        });

        expect(result.findings).toEqual([]);
        expect(result.llmRequests).toEqual([]);
      });
    },
  );
});

describe('RuleSetService', () => {
  function createService(ruleSet: unknown) {
    const prisma = {
      reviewRuleSet: {
        findFirst: vi.fn().mockResolvedValue(ruleSet),
      },
    };
    return {
      prisma,
      service: new RuleSetService(
        prisma as unknown as PrismaService,
        validator,
      ),
    };
  }

  it('loads enabled rules with version and config overrides', async () => {
    const seed = DEFAULT_RULES[0];
    const enabledRule = {
      id: 1n,
      code: seed.code,
      name: seed.name,
      category: seed.category,
      severity: seed.severity,
      ruleType: seed.ruleType,
      description: seed.description,
      configJson: seed.configJson,
      prompt: null,
      enabled: 1,
      version: 1,
    };
    const { service, prisma } = createService({
      id: 9n,
      name: '默认规则集',
      version: 3,
      stance: 'NEUTRAL',
      contractType: null,
      enabled: 1,
      items: [
        {
          enabled: 1,
          severity: 'LOW',
          sort: 1,
          configOverride: { expect: 'ABSENT' },
          rule: enabledRule,
        },
        {
          enabled: 1,
          severity: null,
          sort: 2,
          configOverride: null,
          rule: { ...enabledRule, id: 2n, code: 'DISABLED_RULE', enabled: 0 },
        },
        {
          enabled: 0,
          severity: null,
          sort: 3,
          configOverride: null,
          rule: { ...enabledRule, id: 3n, code: 'DISABLED_ITEM' },
        },
      ],
    });

    const loaded = await service.load({ contractType: 'SALES' });

    expect(prisma.reviewRuleSet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ enabled: 1, stance: 'NEUTRAL' }),
      }),
    );
    expect(loaded.version).toBe(3);
    expect(loaded.rules).toHaveLength(1);
    expect(loaded.rules[0]).toMatchObject({
      code: seed.code,
      severity: 'LOW',
      version: 1,
      config: { expect: 'ABSENT' },
    });
    expect((loaded.rules[0].config as { match: unknown }).match).toEqual(
      seed.configJson.match,
    );
  });

  it('rejects a missing or disabled rule set', async () => {
    const { service } = createService(null);
    await expect(service.load({ ruleSetId: 99n })).rejects.toThrow(
      '审查规则集不存在或已停用',
    );
  });

  it('falls back to the neutral rule set when no stance-specific set exists', async () => {
    const neutralRuleSet = {
      id: 9n,
      name: '默认规则集',
      version: 1,
      stance: 'NEUTRAL',
      contractType: null,
      enabled: 1,
      items: [],
    };
    const { service, prisma } = createService(null);
    prisma.reviewRuleSet.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(neutralRuleSet);

    const loaded = await service.load({
      contractType: 'SALES',
      stance: 'PARTY_A',
    });

    expect(prisma.reviewRuleSet.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ stance: 'PARTY_A' }),
      }),
    );
    expect(prisma.reviewRuleSet.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ stance: 'NEUTRAL' }),
      }),
    );
    expect(loaded.stance).toBe('NEUTRAL');
  });
});

describe('RuleRunnerService', () => {
  it('returns the loaded rule-set version and ordered findings', async () => {
    const rule = definition(
      DEFAULT_RULES.find((item) => item.code === 'CONFIDENTIALITY_MISSING')!,
      0,
    );
    const loaded: LoadedRuleSet = {
      id: 9n,
      name: '默认规则集',
      version: 7,
      stance: 'NEUTRAL',
      contractType: null,
      rules: [rule],
    };
    const ruleSets = {
      load: vi.fn().mockResolvedValue(loaded),
    };
    const runner = new RuleRunnerService(
      ruleSets as unknown as RuleSetService,
      handlers,
    );

    const result = await runner.run({
      clauses: [clause('第一条 履行\n双方应按约履行。')],
    });

    expect(result.ruleSetId).toBe('9');
    expect(result.ruleSetVersion).toBe(7);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      source: 'RULE',
      ruleCode: 'CONFIDENTIALITY_MISSING',
      riskLevel: 'HIGH',
    });
  });
});
