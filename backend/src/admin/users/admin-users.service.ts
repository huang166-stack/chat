import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes.js';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { getPagination, toPage } from '../../common/utils/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto.js';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminUserQueryDto) {
    const { page, pageSize, skip, take } = getPagination(query.page, query.pageSize);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword } },
              { nickname: { contains: query.keyword } },
            ],
          }
        : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { membership: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return toPage(
      users.map((user) => this.serialize(user)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { membership: true },
    });

    if (!user) {
      throw new BusinessException('用户不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return this.serialize(user);
  }

  async update(id: bigint, dto: UpdateAdminUserDto, currentUserId: bigint) {
    const target = await this.requireUser(id);
    this.guardSelfMutation(target.id, currentUserId, dto.role, dto.status);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        status: dto.status,
      },
      include: { membership: true },
    });

    return this.serialize(updated);
  }

  async disable(id: bigint, currentUserId: bigint) {
    const target = await this.requireUser(id);
    this.guardSelfMutation(target.id, currentUserId, target.role, 0);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 0 },
      include: { membership: true },
    });

    return this.serialize(updated);
  }

  private async requireUser(id: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BusinessException('用户不存在', ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private guardSelfMutation(
    targetId: bigint,
    currentUserId: bigint,
    nextRole?: 'USER' | 'ADMIN',
    nextStatus?: number,
  ) {
    if (targetId !== currentUserId) {
      return;
    }

    if ((nextRole && nextRole !== 'ADMIN') || nextStatus === 0) {
      throw new BusinessException('不能修改自己的管理员角色或禁用自己', ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }
  }

  private serialize(user: Prisma.UserGetPayload<{ include: { membership: true } }>) {
    return {
      id: String(user.id),
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      membershipExpireAt: user.membership?.expireAt ?? null,
    };
  }
}