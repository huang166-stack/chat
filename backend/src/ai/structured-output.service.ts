import { Injectable } from '@nestjs/common';
import type { ZodType } from 'zod';
import {
  AiClientService,
  type AiMessage,
  type AiModelParams,
  type AiTokenUsage,
} from './ai-client.service.js';

export interface StructuredOutputResult<T> {
  data: T;
  usage: AiTokenUsage;
  attempts: number;
}

@Injectable()
export class StructuredOutputService {
  constructor(private readonly aiClient: AiClientService) {}

  async complete<T>(
    params: AiModelParams,
    messages: AiMessage[],
    schema: ZodType<T>,
    signal: AbortSignal,
    maxAttempts = 2,
  ): Promise<StructuredOutputResult<T>> {
    let requestMessages = messages;
    let usage: AiTokenUsage = { tokensIn: 0, tokensOut: 0 };
    let lastError = '模型未返回有效 JSON';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const completion = await this.aiClient.completeChatWithUsage(
        params,
        requestMessages,
        signal,
      );
      usage = {
        tokensIn: usage.tokensIn + completion.usage.tokensIn,
        tokensOut: usage.tokensOut + completion.usage.tokensOut,
      };

      const parsed = this.parseJson(completion.content);
      if (parsed !== undefined) {
        const validated = schema.safeParse(parsed);
        if (validated.success) {
          return { data: validated.data, usage, attempts: attempt };
        }
        lastError = validated.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join('.') || '/'} ${issue.message}`)
          .join('; ');
      } else {
        lastError = '返回内容不是合法 JSON';
      }

      requestMessages = [
        ...messages,
        {
          role: 'user',
          content: `上一次输出未通过校验：${lastError}。请只输出一个符合要求的 JSON 对象，不要包含 Markdown 代码块或额外说明。`,
        },
      ];
    }

    throw new Error(`模型结构化输出校验失败：${lastError}`);
  }

  private parseJson(content: string): unknown {
    const normalized = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const candidates = [normalized];
    const objectStart = normalized.indexOf('{');
    const objectEnd = normalized.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      candidates.push(normalized.slice(objectStart, objectEnd + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as unknown;
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
