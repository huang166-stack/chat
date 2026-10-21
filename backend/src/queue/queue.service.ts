import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import { CONTRACT_QUEUE } from './queue.constants.js';
import type {
  ContractJobData,
  ContractJobName,
  ContractJobPayloadMap,
} from './queue.types.js';

export interface EnqueueOptions {
  jobId?: string;
  attempts?: number;
  backoffDelayMs?: number;
}

@Injectable()
export class ContractQueueService {
  constructor(
    @InjectQueue(CONTRACT_QUEUE) private readonly queue: Queue<ContractJobData>,
  ) {}

  async enqueue<K extends ContractJobName>(
    name: K,
    payload: ContractJobPayloadMap[K],
    options: EnqueueOptions = {},
  ): Promise<string> {
    const jobOptions: JobsOptions = {
      attempts: options.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: options.backoffDelayMs ?? 2000,
      },
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 5000 },
    };

    if (options.jobId) {
      jobOptions.jobId = options.jobId;
    }

    const job = await this.queue.add(name, payload, jobOptions);
    if (!job.id) {
      throw new Error('Queue did not return a job id');
    }

    return job.id;
  }
}
