import { Module } from '@nestjs/common';
import { ReviewsModule } from '../../reviews/reviews.module.js';
import { AdminReviewsController } from './admin-reviews.controller.js';
import { AdminReviewsService } from './admin-reviews.service.js';

@Module({
  imports: [ReviewsModule],
  controllers: [AdminReviewsController],
  providers: [AdminReviewsService],
})
export class AdminReviewsModule {}
