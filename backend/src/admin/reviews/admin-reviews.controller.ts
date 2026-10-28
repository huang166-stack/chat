import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth-user.interface.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto.js';

@Roles('ADMIN')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly adminReviewsService: AdminReviewsService) {}

  @Get()
  findAll(@Query() query: AdminReviewQueryDto) {
    return this.adminReviewsService.findAll(query);
  }

  @Post(':id/retry')
  retry(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminReviewsService.retry(BigInt(id), user.userId);
  }
}
