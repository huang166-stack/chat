import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderQueryDto } from './dto/order-query.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.userId, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.ordersService.findMine(user.userId, query);
  }

  @Get(':orderNo')
  findOne(@CurrentUser() user: AuthUser, @Param('orderNo') orderNo: string) {
    return this.ordersService.findOne(orderNo, user);
  }
}
