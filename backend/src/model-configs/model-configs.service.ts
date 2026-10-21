import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { getPagination, toPage } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateModelConfigDto } from './dto/create-model-config.dto.js';
import { UpdateModelConfigDto } from './dto/update-model-config.dto.js';

@Injectable()
export class ModelConfigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async findEnabled() {
    const configs = await this.prisma.modelConfig.findMany({
      where: { enabled: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });

    return configs.map((config) => ({
      id: String(config.id),
      name: config.name,
      modelName: config.modelName,
      sort: config.sort,
    }));
  }

  async findAll(query: PaginationDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const [configs, total] = await this.prisma.$transaction([
      this.prisma.modelConfig.findMany({
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.modelConfig.count(),
    ]);

    return toPage(
      configs.map((config) => this.toSafe(config)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: bigint) {
    const config = await this.requireConfig(id);
    return this.toSafe(config);
  }

  async create(dto: CreateModelConfigDto) {
    const config = await this.prisma.modelConfig.create({
      data: {
        name: dto.name,
        provider: dto.provider,
        baseUrl: dto.baseUrl,
        apiKey: this.cryptoService.encrypt(dto.apiKey),
        modelName: dto.modelName,
        maxTokens: dto.maxTokens ?? 2048,
        temperature: dto.temperature ?? 0.7,
        enabled: dto.enabled ?? 1,
        sort: dto.sort ?? 0,
      },
    });

    return this.toSafe(config);
  }

  async update(id: bigint, dto: UpdateModelConfigDto) {
    const existing = await this.requireConfig(id);

    const apiKey =
      dto.apiKey === undefined
        ? undefined
        : dto.apiKey
          ? this.cryptoService.encrypt(dto.apiKey)
          : existing.apiKey;

    const config = await this.prisma.modelConfig.update({
      where: { id },
      data: {
        name: dto.name,
        provider: dto.provider,
        baseUrl: dto.baseUrl,
        apiKey,
        modelName: dto.modelName,
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
        enabled: dto.enabled,
        sort: dto.sort,
      },
    });

    return this.toSafe(config);
  }

  async remove(id: bigint) {
    await this.requireConfig(id);
    const referencedCount = await this.prisma.conversation.count({ where: { modelConfigId: id } });
    if (referencedCount > 0) {
      throw new BusinessException('模型已被会话引用，不能删除', ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.modelConfig.delete({ where: { id } });
    return null;
  }

  private async requireConfig(id: bigint) {
    const config = await this.prisma.modelConfig.findUnique({ where: { id } });
    if (!config) {
      throw new BusinessException('模型配置不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return config;
  }

  private toSafe(config: Prisma.ModelConfigGetPayload<Record<string, never>>) {
    return {
      id: String(config.id),
      name: config.name,
      provider: config.provider,
      baseUrl: config.baseUrl,
      hasApiKey: Boolean(config.apiKey),
      modelName: config.modelName,
      maxTokens: config.maxTokens,
      temperature: Number(config.temperature),
      enabled: config.enabled,
      sort: config.sort,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}