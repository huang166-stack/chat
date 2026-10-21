import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';

@Module({
  imports: [StorageModule, QueueModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
