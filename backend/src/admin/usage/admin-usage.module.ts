import { Module } from '@nestjs/common';
import { AdminUsageController } from './admin-usage.controller.js';
import { AdminUsageService } from './admin-usage.service.js';

@Module({
  controllers: [AdminUsageController],
  providers: [AdminUsageService],
})
export class AdminUsageModule {}
