import { Injectable } from '@nestjs/common';
import type { ContractType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RuleConfigValidator } from './rule-config.validator.js';
import type { LoadedRuleSet, ReviewRuleDefinition } from './rules.types.js';

export interface RuleSetSelection {
  ruleSetId?: bigint;
  contractType?: string;
  stance?: string;
}

@Injectable()
export class RuleSetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configValidator: RuleConfigValidator,
  ) {}

  async load(selection: RuleSetSelection): Promise<LoadedRuleSet> {
    const stance = selection.stance ?? 'NEUTRAL';
    const where: Prisma.ReviewRuleSetWhereInput = selection.ruleSetId
      ? { id: selection.ruleSetId, enabled: 1 }
      : {
          enabled: 1,
          stance,
          ...(selection.contractType
            ? {
                OR: [
                  { contractType: selection.contractType as ContractType },
                  { contractType: null },
                ],
              }
            : { contractType: null }),
        };

    const ruleSet = await this.prisma.reviewRuleSet.findFirst({
      where,
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      include: {
        items: {
          where: { enabled: 1 },
          orderBy: [{ sort: 'asc' }, { id: 'asc' }],
          include: { rule: true },
        },
      },
    });

    if (!ruleSet) {
      throw new Error('审查规则集不存在或已停用');
    }

    const rules: ReviewRuleDefinition[] = [];
    for (const item of ruleSet.items) {
      if (item.enabled !== 1 || item.rule.enabled !== 1) {
        continue;
      }

      const config = mergeJson(item.rule.configJson, item.configOverride);
      rules.push({
        id: item.rule.id,
        code: item.rule.code,
        name: item.rule.name,
        category: item.rule.category,
        severity: item.severity ?? item.rule.severity,
        ruleType: item.rule.ruleType,
        description: item.rule.description,
        config: this.configValidator.validate(item.rule.ruleType, config),
        prompt: item.rule.prompt,
        version: item.rule.version,
      });
    }

    return {
      id: ruleSet.id,
      name: ruleSet.name,
      version: ruleSet.version,
      stance: ruleSet.stance,
      contractType: ruleSet.contractType,
      rules,
    };
  }
}

function mergeJson(
  base: Prisma.JsonValue | null,
  override: Prisma.JsonValue | null,
) {
  if (override === null || override === undefined) {
    return base;
  }
  return mergeValue(base, override);
}

function mergeValue(base: unknown, override: unknown): unknown {
  if (isJsonObject(base) && isJsonObject(override)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      merged[key] = key in merged ? mergeValue(merged[key], value) : value;
    }
    return merged;
  }
  return override;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
