import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }
}