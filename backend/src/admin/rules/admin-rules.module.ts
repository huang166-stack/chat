import { Module } from '@nestjs/common';
import { RulesModule } from '../../rules/rules.module.js';
import { AdminRulesController } from './admin-rules.controller.js';
import { AdminRulesService } from './admin-rules.service.js';

@Module({
  imports: [RulesModule],
  controllers: [AdminRulesController],
  providers: [AdminRulesService],
})
export class AdminRulesModule {}
