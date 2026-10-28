import { Controller, Get, Query } from '@nestjs/common';
import { ReviewRuleSetQueryDto } from './dto/review-rule-set-query.dto.js';
import { RuleSetService } from './rule-set.service.js';

@Controller('review-rule-sets')
export class RuleSetsController {
  constructor(private readonly ruleSetService: RuleSetService) {}

  @Get()
  findAll(@Query() query: ReviewRuleSetQueryDto) {
    return this.ruleSetService.list(query);
  }
}
