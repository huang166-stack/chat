import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PaymentConfigsService } from './payment-configs.service.js';
import { CreatePaymentConfigDto } from './dto/create-payment-config.dto.js';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto.js';

@Roles('ADMIN')
@Controller('admin/payment-configs')
export class PaymentConfigsController {
  constructor(private readonly paymentConfigsService: PaymentConfigsService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.paymentConfigsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentConfigsService.findOne(BigInt(id));
  }

  @Post()
  create(@Body() dto: CreatePaymentConfigDto) {
    return this.paymentConfigsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentConfigDto) {
    return this.paymentConfigsService.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentConfigsService.remove(BigInt(id));
  }
}