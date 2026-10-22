import type { Job } from 'bullmq';
import type { ContractJobData } from './queue.types.js';
import type { ParseProcessor } from './processors/parse.processor.js';
import { ContractQueueWorker } from './queue.worker.js';

describe('ContractQueueWorker', () => {
  it('accepts every declared contract job type', async () => {
    const parseProcessor = { process: vi.fn() };
    const worker = new ContractQueueWorker(
      parseProcessor as unknown as ParseProcessor,
    );
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
    const parseProcessor = { process: vi.fn() };
    const worker = new ContractQueueWorker(
      parseProcessor as unknown as ParseProcessor,
    );
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
    const parseProcessor = { process: vi.fn().mockResolvedValue(result) };
    const worker = new ContractQueueWorker(
      parseProcessor as unknown as ParseProcessor,
    );
    const job = {
      id: 'job-3',
      name: 'parse-document',
      data: { documentId: '1', projectId: '2', userId: '3' },
    } as Job<ContractJobData>;

    await expect(worker.process(job)).resolves.toEqual(result);
    expect(parseProcessor.process).toHaveBeenCalledWith(job);
  });
});
