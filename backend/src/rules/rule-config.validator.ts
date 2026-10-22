import { Injectable } from '@nestjs/common';
import type { RuleType } from '@prisma/client';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import type { RuleConfig } from './rules.types.js';

const stringArray = {
  type: 'array',
  minItems: 1,
  items: { type: 'string', minLength: 1 },
} as const;

const matchSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['keywords', 'mode'],
  properties: {
    keywords: stringArray,
    mode: { type: 'string', enum: ['ANY', 'ALL'] },
  },
} as const;

const RULE_CONFIG_SCHEMAS: Record<RuleType, object> = {
  PRESENCE: {
    type: 'object',
    additionalProperties: false,
    required: ['match', 'expect'],
    properties: {
      match: matchSchema,
      expect: { type: 'string', enum: ['PRESENT', 'ABSENT'] },
    },
  },
  REGEX: {
    type: 'object',
    additionalProperties: false,
    required: ['pattern'],
    properties: {
      pattern: { type: 'string', minLength: 1, maxLength: 500 },
      flags: { type: 'string', pattern: '^[imsu]*$' },
      expect: { type: 'string', enum: ['MATCH', 'NO_MATCH'] },
      scope: { type: 'string', enum: ['CLAUSE', 'DOCUMENT'] },
    },
  },
  KEYWORD: {
    type: 'object',
    additionalProperties: false,
    required: ['match', 'expect'],
    properties: {
      match: matchSchema,
      expect: { type: 'string', enum: ['PRESENT', 'ABSENT'] },
      requiresOptOut: { type: 'boolean' },
      optOutKeywords: stringArray,
    },
  },
  THRESHOLD: {
    type: 'object',
    additionalProperties: false,
    required: ['field', 'operator', 'value'],
    properties: {
      field: {
        type: 'string',
        enum: ['paymentDays', 'acceptanceDays', 'penaltyRate'],
      },
      operator: {
        type: 'string',
        enum: ['>', '>=', '<', '<=', '==', '!='],
      },
      value: { type: 'number' },
      unit: { type: 'string', minLength: 1, maxLength: 16 },
      autoPass: { type: 'boolean' },
    },
  },
  LLM: {
    type: 'object',
    additionalProperties: false,
    properties: {
      requiresStance: { type: 'boolean' },
      clauseTypes: stringArray,
      keywords: stringArray,
      maxClauses: { type: 'integer', minimum: 1, maximum: 50 },
    },
  },
};

export class RuleConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = RuleConfigValidationError.name;
  }
}

@Injectable()
export class RuleConfigValidator {
  private readonly validators = new Map<RuleType, ValidateFunction>();

  constructor() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    for (const [type, schema] of Object.entries(RULE_CONFIG_SCHEMAS)) {
      this.validators.set(type as RuleType, ajv.compile(schema));
    }
  }

  validate(type: RuleType, config: unknown): RuleConfig {
    const validator = this.validators.get(type);
    if (!validator) {
      throw new RuleConfigValidationError(`不支持的规则类型：${type}`);
    }

    if (!validator(config)) {
      throw new RuleConfigValidationError(
        `规则配置无效：${this.formatErrors(validator.errors ?? [])}`,
      );
    }

    if (type === 'REGEX') {
      this.assertValidRegex(config as RuleConfig);
    }

    return config as RuleConfig;
  }

  private assertValidRegex(config: RuleConfig) {
    const regexConfig = config as {
      pattern?: unknown;
      flags?: unknown;
    };
    if (typeof regexConfig.pattern !== 'string') {
      return;
    }

    try {
      new RegExp(
        regexConfig.pattern,
        typeof regexConfig.flags === 'string' ? regexConfig.flags : '',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new RuleConfigValidationError(`正则表达式无效：${message}`);
    }
  }

  private formatErrors(errors: ErrorObject[]) {
    return errors
      .map((error) => {
        const path = error.instancePath || '/';
        return `${path} ${error.message ?? '不符合 Schema'}`;
      })
      .join('; ');
  }
}
