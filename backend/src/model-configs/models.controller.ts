import { Controller, Get } from '@nestjs/common';
import { ModelConfigsService } from './model-configs.service.js';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelConfigsService: ModelConfigsService) {}

  @Get()
  list() {
    return this.modelConfigsService.findEnabled();
  }
}