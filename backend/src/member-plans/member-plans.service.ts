import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MemberPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findEnabled() {
    const plans = await this.prisma.memberPlan.findMany({
      where: { enabled: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });

    return plans.map((plan) => ({
      id: String(plan.id),
      name: plan.name,
      price: Number(plan.price),
      durationType: plan.durationType,
      durationDays: plan.durationDays,
      description: plan.description,
      sort: plan.sort,
    }));
  }
}