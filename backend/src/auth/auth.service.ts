import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { RedisService } from '../common/services/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthUser } from './auth-user.interface.js';
import { JwtRefreshPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async checkUsername(username: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) {
      return { username, available: true, suggestions: [] };
    }

    return {
      username,
      available: false,
      suggestions: [
        `${username}${randomBytes(2).toString('hex')}`,
        `${username}_${randomBytes(2).toString('hex')}`,
      ],
    };
  }

  async register(dto: { username: string; password: string; confirmPassword: string }) {
    if (dto.password !== dto.confirmPassword) {
      throw new BusinessException('两次密码不一致', ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BusinessException('用户名已存在', ErrorCodes.USERNAME_EXISTS, HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: dto.username,
          passwordHash,
          role: 'USER',
        },
      });

      await tx.userMembership.create({
        data: {
          userId: created.id,
          expireAt: new Date(0),
        },
      });

      return created;
    });

    return this.issueTokens(user);
  }

  async login(dto: { username: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user || user.status !== 1) {
      throw new BusinessException('用户名或密码错误', ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new BusinessException('用户名或密码错误', ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret') ?? 'dev-refresh-secret-change-me',
      });
    } catch {
      throw new BusinessException('Refresh Token 无效或已过期', ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    if (payload.type !== 'refresh') {
      throw new BusinessException('Refresh Token 无效', ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const storedToken = await this.redis.get(this.refreshKey(payload.sub));
    if (!storedToken || storedToken !== refreshToken) {
      throw new BusinessException('Refresh Token 已失效', ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({ where: { id: BigInt(payload.sub) } });
    if (!user || user.status !== 1) {
      throw new BusinessException('用户不存在或已禁用', ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    await this.redis.del(this.refreshKey(payload.sub));
    return this.issueTokens(user);
  }

  async logout(user: AuthUser) {
    await this.redis.del(this.refreshKey(String(user.userId)));
    return null;
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwtService.signAsync({
      sub: String(user.id),
      username: user.username,
      role: user.role,
      type: 'access',
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: String(user.id),
        type: 'refresh',
        jti: randomBytes(16).toString('hex'),
      },
      {
        secret: this.configService.get<string>('jwt.refreshSecret') ?? 'dev-refresh-secret-change-me',
        expiresIn: (this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d') as any,
      },
    );

    await this.redis.set(
      this.refreshKey(String(user.id)),
      refreshToken,
      this.parseSeconds(this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d'),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: String(user.id),
        username: user.username,
        role: user.role,
      },
    };
  }

  private refreshKey(userId: string): string {
    return `refresh_token:${userId}`;
  }

  private parseSeconds(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === 's') return amount;
    if (unit === 'm') return amount * 60;
    if (unit === 'h') return amount * 60 * 60;
    return amount * 24 * 60 * 60;
  }
}


