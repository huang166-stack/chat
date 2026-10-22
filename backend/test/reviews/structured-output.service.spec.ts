import { z } from 'zod';
import type { AiClientService } from '../../src/ai/ai-client.service.js';
import { StructuredOutputService } from '../../src/ai/structured-output.service.js';

describe('StructuredOutputService', () => {
  it('retries invalid JSON and returns the schema-validated result', async () => {
    const aiClient = {
      completeChatWithUsage: vi
        .fn()
        .mockResolvedValueOnce({
          content: 'not json',
          usage: { tokensIn: 10, tokensOut: 2 },
        })
        .mockResolvedValueOnce({
          content: ['```json', JSON.stringify({ findings: [] }), '```'].join(
            '\n',
          ),
          usage: { tokensIn: 12, tokensOut: 3 },
        }),
    };
    const service = new StructuredOutputService(
      aiClient as unknown as AiClientService,
    );

    const result = await service.complete(
      {
        baseUrl: 'http://model.local/v1',
        apiKey: 'key',
        modelName: 'test-model',
        maxTokens: 1024,
        temperature: 0.1,
      },
      [{ role: 'user', content: 'review' }],
      z.object({ findings: z.array(z.unknown()) }),
      AbortSignal.timeout(5000),
    );

    expect(result.data).toEqual({ findings: [] });
    expect(result.attempts).toBe(2);
    expect(result.usage).toEqual({ tokensIn: 22, tokensOut: 5 });
    expect(aiClient.completeChatWithUsage).toHaveBeenCalledTimes(2);
  });

  it('throws after all model responses fail schema validation', async () => {
    const aiClient = {
      completeChatWithUsage: vi.fn().mockResolvedValue({
        content: '{findings:invalid}',
        usage: { tokensIn: 1, tokensOut: 1 },
      }),
    };
    const service = new StructuredOutputService(
      aiClient as unknown as AiClientService,
    );

    await expect(
      service.complete(
        {
          baseUrl: 'http://model.local/v1',
          apiKey: null,
          modelName: 'test-model',
          maxTokens: 1024,
          temperature: 0.1,
        },
        [{ role: 'user', content: 'review' }],
        z.object({ findings: z.array(z.unknown()) }),
        AbortSignal.timeout(5000),
        2,
      ),
    ).rejects.toThrow('模型结构化输出校验失败');
  });
});
