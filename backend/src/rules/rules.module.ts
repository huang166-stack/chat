import { Module } from '@nestjs/common';
import { RuleRunnerService } from '../reviews/rule-runner.service.js';
import { RuleConfigValidator } from './rule-config.validator.js';
import { RuleHandlersService } from './rule-handlers.service.js';
import { RuleSetService } from './rule-set.service.js';

@Module({
  providers: [
    RuleConfigValidator,
    RuleHandlersService,
    RuleSetService,
    RuleRunnerService,
  ],
  exports: [
    RuleConfigValidator,
    RuleHandlersService,
    RuleSetService,
    RuleRunnerService,
  ],
})
export class RulesModule {}
