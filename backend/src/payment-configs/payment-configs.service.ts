import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { getPagination, toPage } from '../common/utils/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentConfigDto } from './dto/create-payment-config.dto.js';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto.js';

@Injectable()
export class PaymentConfigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async findAll(query: PaginationDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const [configs, total] = await this.prisma.$transaction([
      this.prisma.paymentConfig.findMany({
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.paymentConfig.count(),
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

  async create(dto: CreatePaymentConfigDto) {
    const config = await this.prisma.paymentConfig.create({
      data: {
        name: dto.name,
        provider: dto.provider,
        merchantId: dto.merchantId,
        appId: dto.appId,
        appSecret: this.cryptoService.encrypt(dto.appSecret),
        apiKey: this.cryptoService.encrypt(dto.apiKey),
        gatewayUrl: dto.gatewayUrl,
        notifyUrl: dto.notifyUrl,
        returnUrl: dto.returnUrl,
        enabled: dto.enabled ?? 1,
      },
    });

    return this.toSafe(config);
  }

  async update(id: bigint, dto: UpdatePaymentConfigDto) {
    const existing = await this.requireConfig(id);

    const appSecret =
      dto.appSecret === undefined
        ? undefined
        : dto.appSecret
          ? this.cryptoService.encrypt(dto.appSecret)
          : existing.appSecret;

    const apiKey =
      dto.apiKey === undefined
        ? undefined
        : dto.apiKey
          ? this.cryptoService.encrypt(dto.apiKey)
          : existing.apiKey;

    const config = await this.prisma.paymentConfig.update({
      where: { id },
      data: {
        name: dto.name,
        provider: dto.provider,
        merchantId: dto.merchantId,
        appId: dto.appId,
        appSecret,
        apiKey,
        gatewayUrl: dto.gatewayUrl,
        notifyUrl: dto.notifyUrl,
        returnUrl: dto.returnUrl,
        enabled: dto.enabled,
      },
    });

    return this.toSafe(config);
  }

  async remove(id: bigint) {
    await this.requireConfig(id);
    await this.prisma.paymentConfig.delete({ where: { id } });
    return null;
  }

  private async requireConfig(id: bigint) {
    const config = await this.prisma.paymentConfig.findUnique({ where: { id } });
    if (!config) {
      throw new BusinessException('支付配置不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return config;
  }

  private toSafe(config: Prisma.PaymentConfigGetPayload<Record<string, never>>) {
    return {
      id: String(config.id),
      name: config.name,
      provider: config.provider,
      merchantId: config.merchantId,
      appId: config.appId,
      hasAppSecret: Boolean(config.appSecret),
      hasApiKey: Boolean(config.apiKey),
      gatewayUrl: config.gatewayUrl,
      notifyUrl: config.notifyUrl,
      returnUrl: config.returnUrl,
      enabled: config.enabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}