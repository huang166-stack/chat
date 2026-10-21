import { Module } from '@nestjs/common';
import { ModelConfigsController } from './model-configs.controller.js';
import { ModelConfigsService } from './model-configs.service.js';
import { ModelsController } from './models.controller.js';

@Module({
  controllers: [ModelConfigsController, ModelsController],
  providers: [ModelConfigsService],
  exports: [ModelConfigsService],
})
export class ModelConfigsModule {}