import type { Job } from 'bullmq';
import type { ContractJobData } from './queue.types.js';
import type { ParseProcessor } from './processors/parse.processor.js';
import type { ReviewProcessor } from './processors/review.processor.js';
import { ContractQueueWorker } from './queue.worker.js';

describe('ContractQueueWorker', () => {
  const parseProcessor = { process: vi.fn() };
  const reviewProcessor = { process: vi.fn() };
  const worker = new ContractQueueWorker(
    parseProcessor as unknown as ParseProcessor,
    reviewProcessor as unknown as ReviewProcessor,
  );

  it('accepts every declared contract job type', async () => {
    const job = {
      id: 'job-1',
      name: 'cleanup',
      data: { scope: 'orphan-files', before: '2026-10-21T00:00:00.000Z' },
    } as Job<ContractJobData>;

    await expect(worker.process(job)).resolves.toEqual({
      accepted: true,
      jobId: 'job-1',
      type: 'cleanup',
    });
  });

  it('throws for an unknown job type so BullMQ can retry and fail it', async () => {
    const job = {
      id: 'job-2',
      name: 'unknown',
      data: {},
    } as Job<ContractJobData>;

    await expect(worker.process(job)).rejects.toThrow(
      'Unknown contract job type: unknown',
    );
  });

  it('delegates parse jobs to the parse processor', async () => {
    const result = {
      documentId: '1',
      clauseCount: 3,
      skipped: false,
    };
    parseProcessor.process.mockResolvedValue(result);
    const job = {
      id: 'job-3',
      name: 'parse-document',
      data: { documentId: '1', projectId: '2', userId: '3' },
    } as Job<ContractJobData>;

    await expect(worker.process(job)).resolves.toEqual(result);
    expect(parseProcessor.process).toHaveBeenCalledWith(job);
  });

  it('delegates review jobs to the review processor', async () => {
    const result = { taskId: '4', status: 'SUCCESS', findingCount: 3 };
    reviewProcessor.process.mockResolvedValue(result);
    const job = {
      id: 'job-4',
      name: 'review-document',
      data: { taskId: '4', documentId: '5', userId: '6' },
    } as Job<ContractJobData>;

    await expect(worker.process(job)).resolves.toEqual(result);
    expect(reviewProcessor.process).toHaveBeenCalledWith(job);
  });
});
