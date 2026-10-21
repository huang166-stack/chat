import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto.js';

@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.adminOrdersService.findAll(query);
  }

  @Get(':orderNo')
  findOne(@Param('orderNo') orderNo: string) {
    return this.adminOrdersService.findOne(orderNo);
  }
}
