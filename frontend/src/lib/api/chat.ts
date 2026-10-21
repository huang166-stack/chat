import { useAuthStore } from '@/lib/stores/auth-store';
import type { Conversation, MessagePage, ModelOption, SseChatEvent } from '@/types/chat';
import type { PageResult } from '@/types/api';
import { ApiError } from './client';
import { api } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export function getModels() {
  return api.get<ModelOption[]>('/models');
}

export function getConversations(page = 1, pageSize = 50) {
  return api.get<PageResult<Conversation>>(`/conversations?page=${page}&pageSize=${pageSize}`);
}

export function createConversation(modelConfigId: string | number, title = '新对话') {
  return api.post<Conversation>('/conversations', { modelConfigId, title });
}

export function renameConversation(id: string | number, title: string) {
  return api.put<Conversation>(`/conversations/${id}`, { title });
}

export function deleteConversation(id: string | number) {
  return api.delete<null>(`/conversations/${id}`);
}

export function getMessages(conversationId: string | number, limit = 50, beforeId?: string | null) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeId) params.set('beforeId', beforeId);
  return api.get<MessagePage>(`/conversations/${conversationId}/messages?${params.toString()}`);
}

export interface StreamHandlers {
  onStart?: (userMessageId: string) => void;
  onDelta?: (content: string) => void;
  onDone?: (assistantMessageId: string, modelName: string, tokenCount: number) => void;
  onError?: (code: number, message: string) => void;
}

export async function streamMessage(
  conversationId: string | number,
  content: string,
  handlers: StreamHandlers,
): Promise<void> {
  const accessToken = useAuthStore.getState().accessToken;
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { code?: number; message?: string } | null;
    throw new ApiError(payload?.message ?? '消息发送失败', payload?.code ?? 50000, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ApiError('无法读取流式响应', 50000, response.status);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const processBlock = (block: string) => {
    const dataLine = block
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('data:'));
    if (!dataLine) return;

    const json = dataLine.slice(5).trim();
    if (!json) return;

    try {
      const event = JSON.parse(json) as SseChatEvent;
      if (event.type === 'start') handlers.onStart?.(event.userMessageId);
      if (event.type === 'delta') handlers.onDelta?.(event.content);
      if (event.type === 'done') handlers.onDone?.(event.assistantMessageId, event.modelName, event.tokenCount);
      if (event.type === 'error') handlers.onError?.(event.code, event.message);
    } catch {
      // Ignore malformed upstream frames.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      processBlock(block);
      boundary = buffer.indexOf('\n\n');
    }
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }
}
