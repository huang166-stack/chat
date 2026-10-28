import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { REDIS_CLIENT } from './config/redis.module.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]) },
        },
        {
          provide: REDIS_CLIENT,
          useValue: { ping: vi.fn().mockResolvedValue('PONG') },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('reports healthy dependencies', async () => {
      await expect(appController.getHealth()).resolves.toMatchObject({
        status: 'ok',
        dependencies: { database: 'up', redis: 'up' },
      });
    });
  });
});
