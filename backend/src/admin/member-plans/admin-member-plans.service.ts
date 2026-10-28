import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { getPagination, toPage } from '../../common/utils/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateMemberPlanDto } from './dto/create-member-plan.dto.js';
import { UpdateMemberPlanDto } from './dto/update-member-plan.dto.js';

@Injectable()
export class AdminMemberPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const [plans, total] = await this.prisma.$transaction([
      this.prisma.memberPlan.findMany({
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.memberPlan.count(),
    ]);

    return toPage(
      plans.map((plan) => this.serialize(plan)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: bigint) {
    const plan = await this.requirePlan(id);
    return this.serialize(plan);
  }

  async create(dto: CreateMemberPlanDto) {
    const plan = await this.prisma.memberPlan.create({
      data: {
        name: dto.name,
        price: dto.price,
        durationType: dto.durationType,
        durationDays: dto.durationDays,
        description: dto.description,
        enabled: dto.enabled ?? 1,
        sort: dto.sort ?? 0,
        reviewQuota: dto.reviewQuota ?? 10,
        maxContractPages: dto.maxContractPages ?? 30,
        maxFileSizeMb: dto.maxFileSizeMb ?? 20,
      },
    });

    return this.serialize(plan);
  }

  async update(id: bigint, dto: UpdateMemberPlanDto) {
    await this.requirePlan(id);
    const plan = await this.prisma.memberPlan.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price,
        durationType: dto.durationType,
        durationDays: dto.durationDays,
        description: dto.description,
        enabled: dto.enabled,
        sort: dto.sort,
        reviewQuota: dto.reviewQuota,
        maxContractPages: dto.maxContractPages,
        maxFileSizeMb: dto.maxFileSizeMb,
      },
    });

    return this.serialize(plan);
  }

  async remove(id: bigint) {
    await this.requirePlan(id);
    const referencedCount = await this.prisma.order.count({ where: { planId: id } });
    if (referencedCount > 0) {
      throw new BusinessException('套餐已被订单引用，不能删除', ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.memberPlan.delete({ where: { id } });
    return null;
  }

  private async requirePlan(id: bigint) {
    const plan = await this.prisma.memberPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new BusinessException('套餐不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return plan;
  }

  private serialize(plan: Prisma.MemberPlanGetPayload<Record<string, never>>) {
    return {
      id: String(plan.id),
      name: plan.name,
      price: Number(plan.price),
      durationType: plan.durationType,
      durationDays: plan.durationDays,
      description: plan.description,
      enabled: plan.enabled,
      sort: plan.sort,
      reviewQuota: plan.reviewQuota,
      maxContractPages: plan.maxContractPages,
      maxFileSizeMb: plan.maxFileSizeMb,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
