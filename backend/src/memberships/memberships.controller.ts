import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { MembershipsService } from './memberships.service.js';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.membershipsService.getMembership(user.userId);
  }
}