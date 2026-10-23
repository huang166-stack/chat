'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ApiError } from '@/lib/api/client';
import {
  streamContractChat,
  type ContractChatCitation,
  type ContractChatHistoryMessage,
} from '@/lib/api/contract-chat';
import { TechButton } from '@/components/common/tech-button';

export interface ContractChatPanelProps {
  contractId: string | number;
  modelConfigId?: string;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  onCitationClick?: (citation: ContractChatCitation) => void;
}

type MessageStatus = 'streaming' | 'done' | 'error';

interface LocalMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations: ContractChatCitation[];
  requestId: string;
  status: MessageStatus;
  error?: string;
}

let requestSequence = 0;

function createRequestId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `cc-${uuid}`;

  requestSequence += 1;
  return `cc-${Date.now().toString(36)}-${requestSequence.toString(36)}`;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function toHistory(messages: LocalMessage[]): ContractChatHistoryMessage[] {
  const completed = messages
    .filter((message) => message.status === 'done' && message.content.trim())
    .map((message) => ({ role: message.role, content: message.content }));
  const rounds: ContractChatHistoryMessage[][] = [];

  for (let index = 0; index < completed.length - 1; index += 1) {
    if (
      completed[index].role === 'USER' &&
      completed[index + 1].role === 'ASSISTANT'
    ) {
      rounds.push([completed[index], completed[index + 1]]);
      index += 1;
    }
  }

  return rounds.slice(-5).flat();
}

export function ContractChatPanel({
  contractId,
  modelConfigId,
  disabled = false,
  disabledReason = '当前合同暂不可问答',
  className = '',
  onCitationClick,
}: ContractChatPanelProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, streaming]);

  const runChat = async (
    requestId: string,
    content: string,
    history: ContractChatHistoryMessage[],
    retry = false,
  ) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setError(null);

    if (retry) {
      setMessages((current) =>
        current.map((message) =>
          message.requestId === requestId && message.role === 'ASSISTANT'
            ? {
                ...message,
                content: '',
                citations: [],
                status: 'streaming',
                error: undefined,
              }
            : message,
        ),
      );
    } else {
      setMessages((current) => [
        ...current,
        {
          id: `temp-user-${requestId}`,
          role: 'USER',
          content,
          citations: [],
          requestId,
          status: 'done',
        },
        {
          id: `temp-assistant-${requestId}`,
          role: 'ASSISTANT',
          content: '',
          citations: [],
          requestId,
          status: 'streaming',
        },
      ]);
    }

    try {
      await streamContractChat(
        contractId,
        {
          content,
          requestId,
          ...(modelConfigId ? { modelConfigId } : {}),
          history,
        },
        {
          onStart: (event) => {
            setMessages((current) =>
              current.map((message) => {
                if (message.requestId !== requestId) return message;
                if (message.role === 'USER') {
                  return { ...message, id: event.userMessageId };
                }
                return { ...message, citations: event.citations };
              }),
            );
          },
          onDelta: (delta) => {
            setMessages((current) =>
              current.map((message) =>
                message.requestId === requestId &&
                message.role === 'ASSISTANT'
                  ? {
                      ...message,
                      content: message.content + delta,
                      status: 'streaming',
                    }
                  : message,
              ),
            );
          },
          onDone: (event) => {
            setMessages((current) =>
              current.map((message) => {
                if (message.requestId !== requestId) return message;
                if (message.role === 'USER') {
                  return { ...message, status: 'done' };
                }
                return {
                  ...message,
                  id: event.assistantMessageId,
                  citations: event.citations,
                  status: 'done',
                  error: undefined,
                };
              }),
            );
          },
          onError: (code, message) => {
            void code;
            setError(message);
            setMessages((current) =>
              current.map((item) =>
                item.requestId === requestId && item.role === 'ASSISTANT'
                  ? { ...item, status: 'error', error: message }
                  : item,
              ),
            );
          },
        },
        controller.signal,
      );
    } catch (reason) {
      if (isAbortError(reason)) {
        setMessages((current) =>
          current.map((message) => {
            if (message.requestId !== requestId || message.role !== 'ASSISTANT') {
              return message;
            }
            return message.content
              ? { ...message, status: 'done', error: undefined }
              : { ...message, status: 'error', error: '已停止生成' };
          }),
        );
      } else {
        const message =
          reason instanceof ApiError
            ? reason.message
            : '合同问答请求失败，请稍后重试';
        setError(message);
        setMessages((current) =>
          current.map((item) =>
            item.requestId === requestId && item.role === 'ASSISTANT'
              ? { ...item, status: 'error', error: message }
              : item,
          ),
        );
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setStreaming(false);
    }
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content || streaming || disabled) return;

    const requestId = createRequestId();
    const history = toHistory(messages);
    setInput('');
    void runChat(requestId, content, history);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleRetry = (assistantMessage: LocalMessage) => {
    if (streaming || disabled) return;
    const messageIndex = messages.findIndex(
      (message) =>
        message.requestId === assistantMessage.requestId &&
        message.role === 'USER',
    );
    if (messageIndex < 0) return;

    const userMessage = messages[messageIndex];
    void runChat(
      userMessage.requestId,
      userMessage.content,
      toHistory(messages.slice(0, messageIndex)),
      true,
    );
  };

  const canSend = !disabled && !streaming && input.trim().length > 0;

  const renderContent = (message: LocalMessage) => {
    const segments = message.content.split(/(\[第\s*\d+\s*条\])/g);

    return segments.map((segment, index) => {
      const match = /^\[第\s*(\d+)\s*条\]$/.exec(segment);
      if (!match) {
        return <span key={`${message.id}-text-${index}`}>{segment}</span>;
      }

      const orderNo = Number(match[1]);
      const citation = message.citations.find(
        (item) => item.orderNo === orderNo,
      );
      const citationClass =
        'mx-0.5 inline-flex rounded-[2px] border border-brand-500/40 bg-brand-500/10 px-1 font-mono text-xs text-brand-400';

      if (!citation || !onCitationClick) {
        return (
          <span key={`${message.id}-citation-${index}`} className={citationClass}>
            {segment}
          </span>
        );
      }

      return (
        <button
          key={`${message.id}-citation-${index}`}
          type="button"
          className={`${citationClass} transition hover:bg-brand-500/20`}
          title={citation.heading ?? `定位到第${orderNo}条`}
          onClick={() => onCitationClick(citation)}
        >
          {segment}
        </button>
      );
    });
  };

  return (
    <section
      className={`flex min-h-[32rem] flex-col overflow-hidden rounded-card border border-line bg-ink-900 ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-brand-400">
            Contract Q&amp;A
          </p>
          <h2 className="mt-1 text-lg font-semibold">合同内问答</h2>
          <p className="mt-1 text-sm opacity-60">
            回答仅依据当前合同条款，点击引用可定位原文。
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs opacity-70">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              streaming ? 'animate-pulse bg-brand-400' : 'bg-success'
            }`}
          />
          {streaming ? '生成中' : disabled ? '不可用' : '就绪'}
        </span>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5"
        aria-live="polite"
        aria-busy={streaming}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center">
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-brand-400">
              Grounded Context
            </span>
            <p className="text-base font-medium">围绕这份合同继续追问</p>
            <p className="max-w-sm text-sm leading-6 opacity-55">
              可以询问付款、交付、违约责任或具体条款，例如“第 3 条约定了什么？”
            </p>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === 'USER';
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-card border px-4 py-3 ${
                  isUser
                    ? 'border-brand-500/30 bg-brand-500/10'
                    : 'border-line bg-ink-800'
                }`}
              >
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] opacity-45">
                  {isUser ? 'You' : 'Contract Assistant'}
                </p>
                {isUser ? (
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {message.content}
                  </p>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-7">
                    {renderContent(message)}
                    {message.status === 'streaming' ? (
                      <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-brand-400 align-middle" />
                    ) : null}
                  </div>
                )}

                {!isUser && message.status === 'streaming' && !message.content ? (
                  <p className="flex items-center gap-2 text-sm opacity-55">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
                    正在检索条款并生成回答...
                  </p>
                ) : null}

                {!isUser &&
                message.status === 'error' &&
                message.error ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-2">
                    <span className="text-sm text-risk-high">{message.error}</span>
                    <TechButton
                      size="sm"
                      variant="ghost"
                      disabled={streaming || disabled}
                      onClick={() => handleRetry(message)}
                    >
                      重试
                    </TechButton>
                  </div>
                ) : null}

                {!isUser &&
                message.status === 'done' &&
                message.citations.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-2">
                    {message.citations.map((citation) => (
                      <button
                        key={`${message.id}-chip-${citation.clauseId}`}
                        type="button"
                        disabled={!onCitationClick}
                        className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] opacity-70 transition hover:border-brand-500/50 hover:text-brand-400 disabled:cursor-default"
                        title={citation.heading ?? '定位到合同条款'}
                        onClick={() => onCitationClick?.(citation)}
                      >
                        第{citation.orderNo}条
                        {citation.heading ? ` · ${citation.heading}` : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="mx-4 mb-3 rounded-[2px] border border-risk-high/40 bg-risk-high/10 px-3 py-2 text-sm text-risk-high"
        >
          {error}
        </p>
      ) : null}

      <footer className="border-t border-line bg-ink-950/50 p-4">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || streaming}
          maxLength={2000}
          rows={3}
          placeholder={
            disabled ? disabledReason : '输入针对当前合同的问题，Enter 发送'
          }
          className="min-h-24 w-full resize-none rounded-card border border-line bg-ink-900 px-3 py-2.5 text-sm leading-7 caret-brand-400 outline-none transition placeholder:opacity-35 focus:border-brand-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] opacity-40">
            {input.length} / 2000
          </span>
          {streaming ? (
            <TechButton
              variant="secondary"
              size="sm"
              onClick={() => abortRef.current?.abort()}
            >
              停止生成
            </TechButton>
          ) : (
            <TechButton size="sm" disabled={!canSend} onClick={handleSend}>
              发送问题
            </TechButton>
          )}
        </div>
      </footer>
    </section>
  );
}
