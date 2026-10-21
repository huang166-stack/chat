export type ChatRole = 'USER' | 'ASSISTANT';

export interface ModelOption {
  id: string;
  name: string;
  modelName: string;
  sort: number;
}

export interface Conversation {
  id: string;
  title: string;
  modelConfigId: string;
  modelName?: string;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  modelName?: string | null;
  tokenCount?: number;
  createdAt: string;
}

export interface MessagePage {
  list: ChatMessage[];
  nextBeforeId: string | null;
}

export type SseChatEvent =
  | { type: 'start'; conversationId: string; userMessageId: string }
  | { type: 'delta'; content: string }
  | { type: 'done'; assistantMessageId: string; modelName: string; tokenCount: number }
  | { type: 'error'; code: number; message: string };
