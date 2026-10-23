import type { ReactNode } from 'react';

export type StatusTone = 'high' | 'medium' | 'low' | 'success' | 'info' | 'neutral' | 'processing';

const tones: Record<StatusTone, { label: string; className: string; dotClassName: string }> = {
  high: {
    label: '高风险',
    className: 'border-risk-high/30 bg-risk-high/10 text-risk-high',
    dotClassName: 'bg-risk-high',
  },
  medium: {
    label: '中风险',
    className: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium',
    dotClassName: 'bg-risk-medium',
  },
  low: {
    label: '低风险',
    className: 'border-risk-low/30 bg-risk-low/10 text-risk-low',
    dotClassName: 'bg-risk-low',
  },
  success: {
    label: '已完成',
    className: 'border-brand-500/30 bg-brand-500/10 text-brand-400',
    dotClassName: 'bg-brand-500',
  },
  info: {
    label: '提示',
    className: 'border-info-500/30 bg-info-500/10 text-info-500',
    dotClassName: 'bg-info-500',
  },
  neutral: {
    label: '未处理',
    className: 'border-line-strong bg-line text-copy-muted',
    dotClassName: 'bg-copy-subtle',
  },
  processing: {
    label: '处理中',
    className: 'border-brand-500/30 bg-brand-500/10 text-brand-400',
    dotClassName: 'bg-brand-400 animate-pulse',
  },
};

export interface StatusTagProps {
  tone: StatusTone;
  children?: ReactNode;
  className?: string;
}

export function StatusTag({ tone, children, className = '' }: StatusTagProps) {
  const config = tones[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClassName}`} />
      {children ?? config.label}
    </span>
  );
}
