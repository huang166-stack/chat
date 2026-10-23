import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReportsService } from './reports.service.js';

@Controller('contracts')
export class ContractReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post(':id/report')
  create(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.reportsService.create(BigInt(id), user.userId, user.role);
  }

  @Get(':id/report')
  findLatest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportsService.findLatest(BigInt(id), user.userId, user.role);
  }
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportsService.findOne(BigInt(id), user.userId, user.role);
  }

  @Get(':id/download')
  download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportsService.download(BigInt(id), user.userId, user.role);
  }
}
