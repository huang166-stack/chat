import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ModelConfigsService } from './model-configs.service.js';
import { CreateModelConfigDto } from './dto/create-model-config.dto.js';
import { UpdateModelConfigDto } from './dto/update-model-config.dto.js';

@Roles('ADMIN')
@Controller('admin/model-configs')
export class ModelConfigsController {
  constructor(private readonly modelConfigsService: ModelConfigsService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.modelConfigsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modelConfigsService.findOne(BigInt(id));
  }

  @Post()
  create(@Body() dto: CreateModelConfigDto) {
    return this.modelConfigsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModelConfigDto) {
    return this.modelConfigsService.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.modelConfigsService.remove(BigInt(id));
  }
}