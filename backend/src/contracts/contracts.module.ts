import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ContractChatController } from './contract-chat.controller.js';
import { ContractChatService } from './contract-chat.service.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';

@Module({
  imports: [StorageModule, QueueModule, AiModule],
  controllers: [ContractsController, ContractChatController],
  providers: [ContractsService, ContractChatService],
})
export class ContractsModule {}
