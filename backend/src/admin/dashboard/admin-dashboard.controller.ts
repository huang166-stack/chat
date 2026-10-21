import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

@Roles('ADMIN')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  getStats() {
    return this.adminDashboardService.getStats();
  }
}
