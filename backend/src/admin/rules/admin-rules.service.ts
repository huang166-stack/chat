import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { getPagination, toPage } from '../../common/utils/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RuleConfigValidator } from '../../rules/rule-config.validator.js';
import {
  AdminRuleQueryDto,
  CreateRuleDto,
  UpdateRuleDto,
} from './dto/admin-rule.dto.js';

@Injectable()
export class AdminRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configValidator: RuleConfigValidator,
  ) {}

  async findAll(query: AdminRuleQueryDto) {
    const { page, pageSize, skip, take } = getPagination(
      query.page,
      query.pageSize,
    );
    const where: Prisma.ReviewRuleWhereInput = {
      ...(query.ruleType ? { ruleType: query.ruleType } : {}),
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword } },
              { name: { contains: query.keyword } },
            ],
          }
        : {}),
    };

    const [rules, total] = await this.prisma.$transaction([
      this.prisma.reviewRule.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }, { version: 'desc' }],
        skip,
        take,
      }),
      this.prisma.reviewRule.count({ where }),
    ]);

    return toPage(
      rules.map((rule) => this.serialize(rule)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: bigint) {
    return this.serialize(await this.requireRule(id));
  }

  async create(dto: CreateRuleDto) {
    const config = this.configValidator.validate(dto.ruleType, dto.configJson);
    this.assertLlmPrompt(dto.ruleType, dto.prompt);

    try {
      const rule = await this.prisma.reviewRule.create({
        data: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
          severity: dto.severity,
          ruleType: dto.ruleType,
          description: dto.description,
          configJson: config as Prisma.InputJsonValue,
          prompt: dto.prompt,
          enabled: dto.enabled ?? 1,
          version: dto.version ?? 1,
        },
      });
      return this.serialize(rule);
    } catch (error) {
      this.throwIfUniqueConflict(error);
      throw error;
    }
  }

  async update(id: bigint, dto: UpdateRuleDto) {
    const existing = await this.requireRule(id);
    const ruleType = dto.ruleType ?? existing.ruleType;
    const rawConfig =
      dto.configJson ?? (dto.ruleType ? existing.configJson : undefined);
    const config =
      rawConfig === undefined
        ? undefined
        : this.configValidator.validate(ruleType, rawConfig);
    const prompt = dto.prompt ?? existing.prompt;
    this.assertLlmPrompt(ruleType, prompt);

    try {
      const rule = await this.prisma.reviewRule.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
          severity: dto.severity,
          ruleType: dto.ruleType,
          description: dto.description,
          ...(config === undefined
            ? {}
            : { configJson: config as Prisma.InputJsonValue }),
          prompt: prompt ?? undefined,
          enabled: dto.enabled,
          version: dto.version,
        },
      });
      return this.serialize(rule);
    } catch (error) {
      this.throwIfUniqueConflict(error);
      throw error;
    }
  }

  async remove(id: bigint) {
    await this.requireRule(id);
    const referencedCount = await this.prisma.reviewRuleSetItem.count({
      where: { ruleId: id },
    });
    if (referencedCount > 0) {
      throw new BusinessException(
        '规则已被规则集引用，请先停用或移除规则集项',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.reviewRule.delete({ where: { id } });
    return null;
  }

  private async requireRule(id: bigint) {
    const rule = await this.prisma.reviewRule.findUnique({ where: { id } });
    if (!rule) {
      throw new BusinessException(
        '审查规则不存在',
        ErrorCodes.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return rule;
  }

  private assertLlmPrompt(ruleType: string, prompt: string | null | undefined) {
    if (ruleType === 'LLM' && !prompt?.trim()) {
      throw new BusinessException(
        'LLM 规则必须填写提示词',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private throwIfUniqueConflict(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new BusinessException(
        '规则编码与版本已存在',
        ErrorCodes.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private serialize(rule: Prisma.ReviewRuleGetPayload<Record<string, never>>) {
    return {
      id: String(rule.id),
      code: rule.code,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      ruleType: rule.ruleType,
      description: rule.description,
      configJson: rule.configJson,
      prompt: rule.prompt,
      enabled: rule.enabled,
      version: rule.version,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
