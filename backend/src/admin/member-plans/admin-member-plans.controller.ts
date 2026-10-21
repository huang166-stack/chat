import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { AdminMemberPlansService } from './admin-member-plans.service.js';
import { CreateMemberPlanDto } from './dto/create-member-plan.dto.js';
import { UpdateMemberPlanDto } from './dto/update-member-plan.dto.js';

@Roles('ADMIN')
@Controller('admin/member-plans')
export class AdminMemberPlansController {
  constructor(private readonly adminMemberPlansService: AdminMemberPlansService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.adminMemberPlansService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminMemberPlansService.findOne(BigInt(id));
  }

  @Post()
  create(@Body() dto: CreateMemberPlanDto) {
    return this.adminMemberPlansService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMemberPlanDto) {
    return this.adminMemberPlansService.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminMemberPlansService.remove(BigInt(id));
  }
}