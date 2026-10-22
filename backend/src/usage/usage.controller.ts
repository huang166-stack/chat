import { Controller, Get } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UsageService } from './usage.service.js';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser) {
    return this.usageService.getSummary(user.userId, user.role);
  }
}
