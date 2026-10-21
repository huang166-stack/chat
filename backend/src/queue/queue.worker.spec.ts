import type { Job } from 'bullmq';
import type { ContractJobData } from './queue.types.js';
import { ContractQueueWorker } from './queue.worker.js';

describe('ContractQueueWorker', () => {
  it('accepts every declared contract job type', async () => {
    const worker = new ContractQueueWorker();
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
    const worker = new ContractQueueWorker();
    const job = {
      id: 'job-2',
      name: 'unknown',
      data: {},
    } as Job<ContractJobData>;

    await expect(worker.process(job)).rejects.toThrow(
      'Unknown contract job type: unknown',
    );
  });
});
