import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CONTRACT_QUEUE } from './queue.constants.js';
import type {
  ContractJobData,
  ContractJobName,
  ParseDocumentPayload,
  ReviewDocumentPayload,
} from './queue.types.js';
import { ParseProcessor } from './processors/parse.processor.js';
import { ReviewProcessor } from './processors/review.processor.js';

@Processor(CONTRACT_QUEUE, { concurrency: 2 })
export class ContractQueueWorker extends WorkerHost {
  private readonly logger = new Logger(ContractQueueWorker.name);

  constructor(
    private readonly parseProcessor: ParseProcessor,
    private readonly reviewProcessor: ReviewProcessor,
  ) {
    super();
  }

  async process(job: Job<ContractJobData>): Promise<unknown> {
    const jobName = job.name as ContractJobName;

    switch (jobName) {
      case 'parse-document':
        return this.parseProcessor.process(job as Job<ParseDocumentPayload>);
      case 'review-document':
        return this.reviewProcessor.process(job as Job<ReviewDocumentPayload>);
      case 'generate-report':
      case 'cleanup':
        this.logger.log(`Consumed ${jobName} job ${job.id ?? 'unknown'}`);
        return { accepted: true, jobId: job.id, type: jobName };
      default:
        throw new Error(`Unknown contract job type: ${job.name}`);
    }
  }
}
