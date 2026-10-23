import { useAuthStore } from '@/lib/stores/auth-store';
import { ApiError } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export type ContractChatRole = 'USER' | 'ASSISTANT';

export interface ContractChatHistoryMessage {
  role: ContractChatRole;
  content: string;
}

export interface ContractChatCitation {
  clauseId: string;
  orderNo: number;
  heading: string | null;
  pageStart: number | null;
  pageEnd: number | null;
}

export interface ContractChatStartEvent {
  type: 'start';
  contractId: string;
  requestId: string;
  userMessageId: string;
  citations: ContractChatCitation[];
}

export interface ContractChatDeltaEvent {
  type: 'delta';
  content: string;
}

export interface ContractChatDoneEvent {
  type: 'done';
  contractId: string;
  requestId: string;
  assistantMessageId: string;
  citations: ContractChatCitation[];
  modelName: string | null;
  tokensIn: number;
  tokensOut: number;
}

export interface ContractChatErrorEvent {
  type: 'error';
  code: number;
  message: string;
}

export type ContractChatSseEvent =
  | ContractChatStartEvent
  | ContractChatDeltaEvent
  | ContractChatDoneEvent
  | ContractChatErrorEvent;

export interface ContractChatStreamHandlers {
  onStart?: (event: ContractChatStartEvent) => void;
  onDelta?: (content: string) => void;
  onDone?: (event: ContractChatDoneEvent) => void;
  onError?: (code: number, message: string) => void;
}

export interface StreamContractChatInput {
  content: string;
  requestId: string;
  modelConfigId?: string;
  history?: ContractChatHistoryMessage[];
}

export async function streamContractChat(
  contractId: string | number,
  input: StreamContractChatInput,
  handlers: ContractChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const accessToken = useAuthStore.getState().accessToken;
  const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: number;
      message?: string;
    } | null;
    throw new ApiError(
      payload?.message ?? '合同问答请求失败',
      payload?.code ?? 50000,
      response.status,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ApiError('无法读取流式响应', 50000, response.status);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const processBlock = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();
    if (!data) return;

    try {
      const event = JSON.parse(data) as ContractChatSseEvent;
      if (event.type === 'start') handlers.onStart?.(event);
      if (event.type === 'delta') handlers.onDelta?.(event.content);
      if (event.type === 'done') handlers.onDone?.(event);
      if (event.type === 'error') handlers.onError?.(event.code, event.message);
    } catch {
      // Ignore malformed frames so one bad chunk does not discard the stream.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = /\r?\n\r?\n/.exec(buffer);
    while (boundary) {
      processBlock(buffer.slice(0, boundary.index));
      buffer = buffer.slice(boundary.index + boundary[0].length);
      boundary = /\r?\n\r?\n/.exec(buffer);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    processBlock(buffer);
  }
}
