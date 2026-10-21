import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../auth/auth-user.interface.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto.js';

@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query() query: AdminUserQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.findOne(BigInt(id));
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminUsersService.update(BigInt(id), dto, user.userId);
  }

  @Delete(':id')
  disable(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.adminUsersService.disable(BigInt(id), user.userId);
  }
}