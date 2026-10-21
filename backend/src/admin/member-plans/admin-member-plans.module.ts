import { Module } from '@nestjs/common';
import { AdminMemberPlansController } from './admin-member-plans.controller.js';
import { AdminMemberPlansService } from './admin-member-plans.service.js';

@Module({
  controllers: [AdminMemberPlansController],
  providers: [AdminMemberPlansService],
})
export class AdminMemberPlansModule {}