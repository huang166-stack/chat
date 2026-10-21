import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-card border border-line bg-ink-800/60 px-6 py-12 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/40 text-brand-400">
        {icon ?? <span className="h-2 w-2 rounded-full bg-brand-500" />}
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-medium text-white">{title}</p>
        {description ? <p className="text-sm text-zinc-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}