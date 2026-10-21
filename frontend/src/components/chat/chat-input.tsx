'use client';

import type { ModelOption } from '@/types/chat';

interface ChatInputProps {
  value: string;
  models: ModelOption[];
  selectedModelId: string;
  disabled: boolean;
  streaming: boolean;
  onValueChange: (value: string) => void;
  onModelChange: (modelId: string) => void;
  onSend: () => void;
}

export function ChatInput({
  value,
  models,
  selectedModelId,
  disabled,
  streaming,
  onValueChange,
  onModelChange,
  onSend,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !streaming && !disabled;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-3">
        <label htmlFor="model-select" className="text-sm text-zinc-500">
          模型
        </label>
        <select
          id="model-select"
          value={selectedModelId}
          onChange={(event) => onModelChange(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-3">
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
          placeholder={disabled ? '开通会员后可发送消息' : '输入消息，Enter 发送，Shift+Enter 换行'}
          className="min-h-[72px] flex-1 resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:disabled:bg-zinc-800"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {streaming ? '生成中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
