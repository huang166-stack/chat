import type { ContractClause } from '@/lib/api/contracts';
import type { ReviewFinding } from '@/lib/api/reviews';

export function ClauseNavigator({
  clauses,
  findings,
  activeClauseId,
  onSelect,
}: {
  clauses: ContractClause[];
  findings: ReviewFinding[];
  activeClauseId: string | null;
  onSelect: (clause: ContractClause) => void;
}) {
  const riskCounts = new Map<string, number>();
  for (const finding of findings) {
    if (!finding.clauseId) continue;
    riskCounts.set(finding.clauseId, (riskCounts.get(finding.clauseId) ?? 0) + 1);
  }

  return (
    <section className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-card border border-line bg-ink-900">
      <header className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand-400">
          Clause index
        </span>
        <span className="font-mono text-[9px] text-copy-subtle">{clauses.length}</span>
      </header>

      {clauses.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs leading-5 text-copy-subtle">条款解析完成后显示导航。</p>
      ) : (
        <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="条款导航">
          {clauses.map((clause) => {
            const active = activeClauseId === clause.id;
            const risks = riskCounts.get(clause.id) ?? 0;
            return (
              <button
                key={clause.id}
                type="button"
                onClick={() => onSelect(clause)}
                className={`mb-1 flex w-full items-start gap-2 rounded-[2px] px-2.5 py-2 text-left transition ${
                  active ? 'bg-brand-500/10 text-brand-400' : 'text-copy-muted hover:bg-ink-800 hover:text-copy'
                }`}
              >
                <span className="mt-0.5 w-6 shrink-0 font-mono text-[9px] opacity-65">
                  {String(clause.orderNo).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs leading-5">
                  {clause.heading || clause.content.slice(0, 30) || '未命名条款'}
                </span>
                {risks > 0 ? (
                  <span className="mt-0.5 rounded-full bg-risk-high/15 px-1.5 font-mono text-[9px] text-risk-high">
                    {risks}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      )}
    </section>
  );
}
