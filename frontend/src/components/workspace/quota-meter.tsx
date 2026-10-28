'use client';

import { useUsageSummary } from '@/lib/hooks/use-usage';

export function QuotaMeter({ compact = false }: { compact?: boolean }) {
  const query = useUsageSummary();

  if (query.isLoading) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-copy-subtle">
        额度加载中
      </span>
    );
  }

  if (query.isError || !query.data) {
    return <span className="text-xs text-copy-subtle">额度暂不可用</span>;
  }

  const summary = query.data;
  if (summary.quota === null || summary.remainingPages === null) {
    return (
      <span className="rounded-[2px] border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-400">
        管理员 · 不限额度
      </span>
    );
  }

  const percent = summary.quota > 0 ? Math.min(100, (summary.usedPages / summary.quota) * 100) : 0;

  return (
    <div className={compact ? 'w-32' : 'w-44'}>
      <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-copy-subtle">
        <span>{summary.planName ?? '基础额度'}</span>
        <span>{summary.remainingPages} / {summary.quota} 页</span>
      </div>
      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="本月审查额度"
        aria-valuemin={0}
        aria-valuemax={summary.quota}
        aria-valuenow={summary.usedPages}
      >
        <div className="h-full bg-brand-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
