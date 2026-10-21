import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembership(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });

    if (!user) {
      return { isMember: false, expireAt: null };
    }

    const isMember = user.role === 'ADMIN' || (user.membership && user.membership.expireAt.getTime() > Date.now());

    return {
      isMember,
      expireAt: user.membership?.expireAt ?? null,
    };
  }
}