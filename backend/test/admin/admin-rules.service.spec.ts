import { AdminRulesService } from '../../src/admin/rules/admin-rules.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { RuleConfigValidator } from '../../src/rules/rule-config.validator.js';

describe('AdminRulesService', () => {
  it('adds a new rule to the selected rule set in the same transaction', async () => {
    const rule = {
      id: 5n,
      code: 'MISSING_ACCEPTANCE',
      name: '缺少验收标准',
      category: '验收',
      severity: 'MEDIUM',
      ruleType: 'PRESENCE',
      description: '检查合同是否约定验收标准',
      configJson: {
        match: { keywords: ['验收标准'], mode: 'ANY' },
        expect: 'PRESENT',
      },
      prompt: null,
      enabled: 1,
      version: 1,
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
      updatedAt: new Date('2026-10-28T00:00:00.000Z'),
    };
    const tx = {
      reviewRule: { create: vi.fn().mockResolvedValue(rule) },
      reviewRuleSet: { findUnique: vi.fn().mockResolvedValue({ id: 3n }) },
      reviewRuleSetItem: {
        aggregate: vi.fn().mockResolvedValue({ _max: { sort: 4 } }),
        create: vi.fn().mockResolvedValue({ id: 8n }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new AdminRulesService(
      prisma as unknown as PrismaService,
      new RuleConfigValidator(),
    );

    const result = await service.create({
      code: 'MISSING_ACCEPTANCE',
      name: '缺少验收标准',
      category: '验收',
      severity: 'MEDIUM',
      ruleType: 'PRESENCE',
      description: '检查合同是否约定验收标准',
      configJson: {
        match: { keywords: ['验收标准'], mode: 'ANY' },
        expect: 'PRESENT',
      },
      enabled: 1,
      version: 1,
      ruleSetId: '3',
    });

    expect(tx.reviewRuleSetItem.create).toHaveBeenCalledWith({
      data: {
        ruleSetId: 3n,
        ruleId: 5n,
        enabled: 1,
        sort: 5,
      },
    });
    expect(result).toMatchObject({
      id: '5',
      code: 'MISSING_ACCEPTANCE',
      enabled: 1,
    });
  });
});
