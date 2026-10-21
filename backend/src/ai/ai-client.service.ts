import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCodes } from '../common/constants/error-codes.js';
import { BusinessException } from '../common/exceptions/business.exception.js';

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiModelParams {
  baseUrl: string;
  apiKey: string | null;
  modelName: string;
  maxTokens: number;
  temperature: number;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  async streamChat(
    params: AiModelParams,
    messages: AiMessage[],
    signal: AbortSignal,
    onDelta: (content: string) => void,
  ): Promise<string> {
    const response = await this.request(params, messages, true, signal);
    const reader = response.body?.getReader();
    if (!reader) {
      this.logger.error('Model stream response body is not readable', { modelName: params.modelName });
      throw this.modelCallError();
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) {
            continue;
          }

          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') {
            continue;
          }

          try {
            const payload = JSON.parse(data);
            if (payload.error) {
              this.logger.warn('Model stream chunk contains error', { modelName: params.modelName, chunk: data });
            }
            const delta = payload.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              fullContent += delta;
              onDelta(delta);
            }
          } catch (parseError) {
            this.logger.warn('Failed to parse model stream chunk', { modelName: params.modelName, chunk: data, message: parseError instanceof Error ? parseError.message : String(parseError) });
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.logger.log('Model stream completed', { modelName: params.modelName, contentLength: fullContent.length });
    return fullContent;
  }

  async completeChat(params: AiModelParams, messages: AiMessage[], signal: AbortSignal): Promise<string> {
    const response = await this.request(params, messages, false, signal);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
      this.logger.error('Model response did not include content', { modelName: params.modelName, payload });
      throw this.modelCallError();
    }

    return content;
  }

  private async request(
    params: AiModelParams,
    messages: AiMessage[],
    stream: boolean,
    signal: AbortSignal,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (params.apiKey) {
      headers.Authorization = `Bearer ${params.apiKey}`;
    }

    const url = this.buildUrl(params.baseUrl);
    this.logger.log('Calling model API', { url, model: params.modelName, stream, messageCount: messages.length });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: params.modelName,
          messages,
          stream,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
        }),
        signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Model API request failed', { url, model: params.modelName, message, stack });
      throw this.modelCallError();
    }

    if (!response.ok) {
      const responseText = await this.readResponseText(response);
      this.logger.error('Model API returned error', {
        url,
        model: params.modelName,
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      throw this.modelCallError();
    }

    this.logger.log('Model API responded', { url, model: params.modelName, status: response.status });
    return response;
  }

  private async readResponseText(response: Response): Promise<string> {
    try {
      const text = await response.text();
      return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
    } catch {
      return '<unable to read response body>';
    }
  }

  private buildUrl(baseUrl: string): string {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    return cleanBaseUrl.endsWith('/chat/completions') ? cleanBaseUrl : `${cleanBaseUrl}/chat/completions`;
  }

  private modelCallError(): BusinessException {
    return new BusinessException('模型调用失败', ErrorCodes.MODEL_CALL_FAILED, HttpStatus.BAD_GATEWAY);
  }
}
