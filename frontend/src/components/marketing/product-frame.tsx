import type { HTMLAttributes, ReactNode } from 'react';

export interface ProductFrameProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  children: ReactNode;
}

export function ProductFrame({
  label = 'Review Workspace',
  className = '',
  children,
  ...props
}: ProductFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-brand-500/45 bg-ink-900 shadow-frame ${className}`}
      {...props}
    >
      <div className="flex h-9 items-center justify-between border-b border-line bg-ink-900 px-3.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-line-bright" />
          <span className="h-1.5 w-1.5 rounded-full bg-line-bright" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-brand-400">
          {label}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-copy-subtle">
          Live preview
        </span>
      </div>
      <div className="bg-ink-950/50 p-2 sm:p-3">{children}</div>
    </div>
  );
}
