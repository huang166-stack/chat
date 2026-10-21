import type { Queue } from 'bullmq';
import { ContractQueueService } from './queue.service.js';

describe('ContractQueueService', () => {
  it('enqueues a job with retry and deduplication options', async () => {
    const add = vi.fn().mockResolvedValue({ id: 'job-1' });
    const service = new ContractQueueService({ add } as unknown as Queue);

    const jobId = await service.enqueue(
      'parse-document',
      { documentId: 'document-1', projectId: 'project-1', userId: 'user-1' },
      { jobId: 'document-1' },
    );

    expect(jobId).toBe('job-1');
    expect(add).toHaveBeenCalledWith(
      'parse-document',
      { documentId: 'document-1', projectId: 'project-1', userId: 'user-1' },
      expect.objectContaining({
        jobId: 'document-1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    );
  });
});
