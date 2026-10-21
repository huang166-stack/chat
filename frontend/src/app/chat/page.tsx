'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { streamMessage } from '@/lib/api/chat';
import { logout } from '@/lib/api/auth';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
  useModels,
  useRenameConversation,
} from '@/lib/hooks/use-chat';
import { useMembership } from '@/lib/hooks/use-membership';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ChatInput } from '@/components/chat/chat-input';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { MessageList } from '@/components/chat/message-list';
import type { ChatMessage, Conversation } from '@/types/chat';

export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const membershipQuery = useMembership();
  const modelsQuery = useModels();
  const conversationsQuery = useConversations();
  const messagesQuery = useMessages(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const createConversationMutation = useCreateConversation();
  const renameConversationMutation = useRenameConversation();
  const deleteConversationMutation = useDeleteConversation();

  const models = modelsQuery.data ?? [];
  const conversations = conversationsQuery.data?.list ?? [];
  const isMember = membershipQuery.data?.isMember ?? false;

  const activeMessagesQuery = useMessages(activeConversationId);
  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;

  useEffect(() => {
    if (models.length > 0 && (!selectedModelId || !models.some((model) => model.id === selectedModelId))) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  const displayMessages = useMemo(
    () => [...(activeMessagesQuery.data?.list ?? []), ...pendingMessages],
    [activeMessagesQuery.data, pendingMessages],
  );

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setSelectedModelId(conversation.modelConfigId);
    setInputValue('');
    setPendingMessages([]);
    setStreamError(null);
    setStreaming(false);
  };

  const handleNewConversation = () => {
    if (!isMember || !selectedModelId) return;
    createConversationMutation.mutate(
      { modelConfigId: selectedModelId, title: '新对话' },
      {
        onSuccess: (conversation) => {
          setActiveConversationId(conversation.id);
          setSelectedModelId(conversation.modelConfigId);
          setPendingMessages([]);
          setStreamError(null);
        },
      },
    );
  };

  const handleRename = (conversation: Conversation) => {
    const title = window.prompt('请输入新会话名称', conversation.title);
    if (title?.trim()) {
      renameConversationMutation.mutate({ id: conversation.id, title: title.trim() });
    }
  };

  const handleDelete = (conversation: Conversation) => {
    if (!window.confirm(`确定删除会话「${conversation.title}」吗？`)) return;
    deleteConversationMutation.mutate(conversation.id, {
      onSuccess: () => {
        if (activeConversationId === conversation.id) {
          setActiveConversationId(null);
          setPendingMessages([]);
          setInputValue('');
          setStreamError(null);
        }
      },
    });
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!activeConversationId || !content || streaming || !isMember) return;

    const tempUser: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    const tempAssistant: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setInputValue('');
    setPendingMessages([tempUser, tempAssistant]);
    setStreaming(true);
    setStreamError(null);

    try {
      await streamMessage(activeConversationId, content, {
        onStart: (userMessageId) => {
          setPendingMessages((prev) =>
            prev.map((message) => (message.id === tempUser.id ? { ...message, id: userMessageId } : message)),
          );
        },
        onDelta: (delta) => {
          setPendingMessages((prev) =>
            prev.map((message) =>
              message.id === tempAssistant.id ? { ...message, content: message.content + delta } : message,
            ),
          );
        },
        onDone: (assistantMessageId, modelName, tokenCount) => {
          setPendingMessages((prev) =>
            prev.map((message) =>
              message.id === tempAssistant.id
                ? { ...message, id: assistantMessageId, modelName, tokenCount }
                : message,
            ),
          );
        },
        onError: (_code, message) => {
          setStreamError(message);
        },
      });
    } catch (error) {
      setStreamError(error instanceof ApiError ? error.message : '消息发送失败');
    } finally {
      setStreaming(false);
      setPendingMessages([]);
      await Promise.all([activeMessagesQuery.refetch(), conversationsQuery.refetch()]);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

  return (
    <main className="flex h-screen min-h-0 bg-zinc-50 dark:bg-zinc-950">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onCreate={handleNewConversation}
        onRename={handleRename}
        onDelete={handleDelete}
        disabled={!isMember || !selectedModelId}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {activeConversation?.title ?? '选择或新建会话'}
            </h1>
            {activeConversation?.modelName && (
              <p className="truncate text-xs text-zinc-400">{activeConversation.modelName}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{user?.username}</span>
            <Link href="/membership" className="text-sm text-blue-600 hover:underline">
              会员中心
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              退出
            </button>
          </div>
        </header>

        {!isMember && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            普通用户暂不能发送消息，请先
            <Link href="/membership" className="ml-1 font-medium underline">
              开通会员
            </Link>
            。
          </div>
        )}

        {streamError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {streamError}
          </div>
        )}

        <div className="min-h-0 flex-1">
          {!activeConversationId ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              请选择左侧会话，或新建一个会话
            </div>
          ) : activeMessagesQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              正在加载消息...
            </div>
          ) : (
            <MessageList messages={displayMessages} streaming={streaming} />
          )}
        </div>

        <ChatInput
          value={inputValue}
          models={models}
          selectedModelId={selectedModelId}
          disabled={!isMember || !activeConversationId}
          streaming={streaming}
          onValueChange={setInputValue}
          onModelChange={setSelectedModelId}
          onSend={handleSend}
        />
      </section>
    </main>
  );
}
