import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminUsageService } from './admin-usage.service.js';
import { AdminUsageQueryDto } from './dto/admin-usage-query.dto.js';

@Roles('ADMIN')
@Controller('admin/usage')
export class AdminUsageController {
  constructor(private readonly adminUsageService: AdminUsageService) {}

  @Get()
  getSummary(@Query() query: AdminUsageQueryDto) {
    return this.adminUsageService.getSummary(query);
  }
}
