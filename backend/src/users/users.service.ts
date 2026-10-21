import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: { username: string; passwordHash: string; role?: 'USER' | 'ADMIN' }): Promise<User> {
    return this.prisma.user.create({
      data: {
        username: data.username,
        passwordHash: data.passwordHash,
        role: data.role ?? 'USER',
      },
    });
  }

  async getProfile(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });

    if (!user) {
      return null;
    }

    return this.toProfile(user);
  }

  async updateProfile(userId: bigint, data: { nickname?: string; avatarUrl?: string }) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.nickname,
        avatarUrl: data.avatarUrl,
      },
    });

    return this.getProfile(userId);
  }

  private toProfile(user: User & { membership: { expireAt: Date } | null }) {
    const isMember = user.role === 'ADMIN' || (user.membership && user.membership.expireAt.getTime() > Date.now());

    return {
      id: String(user.id),
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      membership: {
        isMember,
        expireAt: user.membership?.expireAt ?? null,
      },
    };
  }
}