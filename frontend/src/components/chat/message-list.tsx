'use client';

import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from '@/types/chat';
import { MarkdownMessage } from './markdown-message';

interface MessageListProps {
  messages: ChatMessage[];
  streaming?: boolean;
}

export function MessageList({ messages, streaming = false }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 6,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, messages[messages.length - 1]?.content, virtualizer]);

  return (
    <div ref={parentRef} className="h-full overflow-y-auto px-4 py-4">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          const isUser = message.role === 'USER';

          return (
            <div
              key={message.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className={`absolute left-0 top-0 w-full py-2 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50'
                }`}
              >
                <MarkdownMessage content={message.content} />
              </div>
            </div>
          );
        })}
      </div>
      {streaming && (
        <div className="mt-2 text-xs text-zinc-400">正在生成回复...</div>
      )}
    </div>
  );
}
