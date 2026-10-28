import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { ReviewProcessor } from '../queue/processors/review.processor.js';
import { QueueModule } from '../queue/queue.module.js';
import { RulesModule } from '../rules/rules.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { ReviewModelService } from './review-model.service.js';
import { ReviewProgressService } from './review-progress.service.js';
import {
  ContractReviewsController,
  ReviewFindingsController,
  ReviewTasksController,
} from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [forwardRef(() => QueueModule), RulesModule, AiModule, UsageModule],
  controllers: [
    ContractReviewsController,
    ReviewTasksController,
    ReviewFindingsController,
  ],
  providers: [
    ReviewsService,
    ReviewProgressService,
    ReviewModelService,
    ReviewProcessor,
  ],
  exports: [ReviewsService, ReviewProcessor],
})
export class ReviewsModule {}
