import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminRulesService } from './admin-rules.service.js';
import {
  AdminRuleQueryDto,
  CreateRuleDto,
  UpdateRuleDto,
} from './dto/admin-rule.dto.js';

@Roles('ADMIN')
@Controller('admin/review-rules')
export class AdminRulesController {
  constructor(private readonly adminRulesService: AdminRulesService) {}

  @Get()
  findAll(@Query() query: AdminRuleQueryDto) {
    return this.adminRulesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminRulesService.findOne(BigInt(id));
  }

  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.adminRulesService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRuleDto) {
    return this.adminRulesService.update(BigInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminRulesService.remove(BigInt(id));
  }
}
