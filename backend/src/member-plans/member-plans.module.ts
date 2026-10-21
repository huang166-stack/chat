import { Module } from '@nestjs/common';
import { MemberPlansController } from './member-plans.controller.js';
import { MemberPlansService } from './member-plans.service.js';

@Module({
  controllers: [MemberPlansController],
  providers: [MemberPlansService],
  exports: [MemberPlansService],
})
export class MemberPlansModule {}