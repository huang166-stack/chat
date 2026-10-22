import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParsingModule } from '../parsing/parsing.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { CONTRACT_QUEUE } from './queue.constants.js';
import { ParseProcessor } from './processors/parse.processor.js';
import { ContractQueueService } from './queue.service.js';
import { ContractQueueWorker } from './queue.worker.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>('redis.url') ?? 'redis://localhost:6379',
          maxRetriesPerRequest: null,
        },
        prefix: configService.get<string>('queue.prefix') ?? 'contract:',
      }),
    }),
    BullModule.registerQueue({ name: CONTRACT_QUEUE }),
    ParsingModule,
    forwardRef(() => ReviewsModule),
  ],
  providers: [ContractQueueService, ParseProcessor, ContractQueueWorker],
  exports: [ContractQueueService],
})
export class QueueModule {}
