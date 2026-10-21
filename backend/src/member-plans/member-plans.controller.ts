import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { MemberPlansService } from './member-plans.service.js';

@Public()
@Controller('member-plans')
export class MemberPlansController {
  constructor(private readonly memberPlansService: MemberPlansService) {}

  @Get()
  list() {
    return this.memberPlansService.findEnabled();
  }
}