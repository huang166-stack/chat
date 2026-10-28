import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Public } from './common/decorators/public.decorator.js';
import { AppService } from './app.service.js';
import { REDIS_CLIENT } from './config/redis.module.js';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth() {
    const dependencies = {
      database: 'up',
      redis: 'up',
    };

    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, 3000);
    } catch {
      dependencies.database = 'down';
    }
    try {
      await withTimeout(this.redis.ping(), 3000);
    } catch {
      dependencies.redis = 'down';
    }

    if (dependencies.database === 'down' || dependencies.redis === 'down') {
      throw new ServiceUnavailableException('服务依赖不可用');
    }

    return {
      status: 'ok',
      service: 'chat-backend',
      dependencies,
      time: new Date().toISOString(),
    };
  }
}

function withTimeout<T>(promise: PromiseLike<T>, milliseconds: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('health check timed out')),
      milliseconds,
    );
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
