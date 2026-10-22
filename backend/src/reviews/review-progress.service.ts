import { Injectable, Logger } from '@nestjs/common';
import type { ReviewStatus } from '@prisma/client';
import { RedisService } from '../common/services/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const PROGRESS_TTL_SECONDS = 60 * 60;

@Injectable()
export class ReviewProgressService {
  private readonly logger = new Logger(ReviewProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async set(taskId: bigint, status: ReviewStatus, progress: number) {
    const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
    await this.prisma.reviewTask.updateMany({
      where: { id: taskId, status: { not: 'CANCELLED' } },
      data: { status, progress: safeProgress },
    });

    try {
      await this.redis.set(
        this.progressKey(taskId),
        JSON.stringify({
          status,
          progress: safeProgress,
          updatedAt: Date.now(),
        }),
        PROGRESS_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn('Failed to write review progress to Redis', error);
    }
  }

  async isCancelled(taskId: bigint): Promise<boolean> {
    try {
      if (await this.redis.get(this.cancelKey(taskId))) {
        return true;
      }
    } catch (error) {
      this.logger.warn('Failed to read review cancellation flag', error);
    }

    const task = await this.prisma.reviewTask.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    return task?.status === 'CANCELLED';
  }

  async markCancelled(taskId: bigint) {
    try {
      await this.redis.set(this.cancelKey(taskId), '1', PROGRESS_TTL_SECONDS);
    } catch (error) {
      this.logger.warn('Failed to write review cancellation flag', error);
    }
  }

  async clearCancellation(taskId: bigint) {
    try {
      await this.redis.del(this.cancelKey(taskId));
    } catch (error) {
      this.logger.warn('Failed to clear review cancellation flag', error);
    }
  }

  private progressKey(taskId: bigint) {
    return `review:progress:${String(taskId)}`;
  }

  private cancelKey(taskId: bigint) {
    return `review:cancel:${String(taskId)}`;
  }
}
