import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateReviewDto,
  ReviewFindingQueryDto,
  UpdateFindingDto,
} from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller('contracts')
export class ContractReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':id/review')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.userId, user.role, BigInt(id), dto);
  }

  @Get(':id/findings')
  findings(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReviewFindingQueryDto,
  ) {
    return this.reviewsService.findFindings(
      BigInt(id),
      user.userId,
      user.role,
      query,
    );
  }
}

@Controller('review-tasks')
export class ReviewTasksController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewsService.getTask(BigInt(id), user.userId, user.role);
  }

  @Post(':id/retry')
  retry(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.retry(BigInt(id), user.userId, user.role);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.cancel(BigInt(id), user.userId, user.role);
  }
}

@Controller('findings')
export class ReviewFindingsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFindingDto,
  ) {
    return this.reviewsService.updateFinding(
      BigInt(id),
      user.userId,
      user.role,
      dto,
    );
  }
}
