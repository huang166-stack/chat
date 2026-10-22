import { Module } from '@nestjs/common';
import { AiClientService } from './ai-client.service.js';
import { StructuredOutputService } from './structured-output.service.js';

@Module({
  providers: [AiClientService, StructuredOutputService],
  exports: [AiClientService, StructuredOutputService],
})
export class AiModule {}
