'use client';

import type { Conversation } from '@/types/chat';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  onCreate: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  disabled?: boolean;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  disabled = false,
}: ConversationSidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={onCreate}
          disabled={disabled}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          新建会话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-zinc-400">暂无会话</p>
        )}
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`group mb-1 cursor-pointer rounded-lg px-3 py-2 transition ${
              activeId === conversation.id
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.title}</p>
              <div className="hidden gap-1 group-hover:flex">
                <button
                  type="button"
                  aria-label="重命名会话"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRename(conversation);
                  }}
                  className="rounded px-1.5 text-xs text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  改名
                </button>
                <button
                  type="button"
                  aria-label="删除会话"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(conversation);
                  }}
                  className="rounded px-1.5 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  删除
                </button>
              </div>
            </div>
            {conversation.modelName && (
              <p className="mt-1 truncate text-xs text-zinc-400">{conversation.modelName}</p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
