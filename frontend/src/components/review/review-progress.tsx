import type { ReviewTaskStatus } from '@/lib/api/reviews';
import { TASK_STATUS_LABELS } from '@/lib/contract-labels';

const STAGES = ['解析条款', '规则预审', '模型审查', '汇总与报告'];

const STAGE_INDEX: Record<ReviewTaskStatus, number> = {
  PENDING: 0,
  PARSING: 0,
  RULE_CHECK: 1,
  MODEL_REVIEW: 2,
  AGGREGATING: 3,
  SUCCESS: 4,
  FAILED: 0,
  CANCELLED: 0,
};

export function ReviewProgress({
  status,
  progress,
  errorMessage,
}: {
  status: ReviewTaskStatus;
  progress: number;
  errorMessage?: string | null;
}) {
  const failed = status === 'FAILED' || status === 'CANCELLED';
  const stageIndex = STAGE_INDEX[status];
  const safeProgress = status === 'SUCCESS' ? 100 : Math.min(100, Math.max(0, progress));

  return (
    <section
      className={`rounded-card border px-4 py-4 ${
        failed ? 'border-risk-high/35 bg-risk-high/5' : 'border-brand-500/25 bg-brand-500/5'
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${
              failed ? 'bg-risk-high' : status === 'SUCCESS' ? 'bg-success' : 'animate-pulse bg-brand-400'
            }`}
          />
          <p className="text-sm font-medium">
            {failed ? '审查未完成' : TASK_STATUS_LABELS[status]}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-copy-subtle">
          {safeProgress}%
        </span>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="审查进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgress}
      >
        <div
          className={`h-full transition-[width] duration-500 ${failed ? 'bg-risk-high' : 'bg-brand-500'}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGES.map((stage, index) => {
          const complete = stageIndex > index;
          const current = stageIndex === index && status !== 'SUCCESS' && !failed;
          return (
            <div key={stage} className="flex items-center gap-2 text-[11px]">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  complete ? 'bg-brand-500' : current ? 'animate-pulse bg-brand-400' : 'bg-line-strong'
                }`}
              />
              <span className={complete || current ? 'text-copy-muted' : 'text-copy-subtle'}>{stage}</span>
            </div>
          );
        })}
      </div>

      {errorMessage ? (
        <p className="mt-3 border-t border-risk-high/20 pt-3 text-xs leading-5 text-risk-high">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
