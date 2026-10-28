'use client';

import { useState } from 'react';
import type { ContractClause } from '@/lib/api/contracts';

export function ContractPaper({
  contractName,
  filename,
  pageCount,
  clauses,
  highlightedClauseId,
}: {
  contractName: string;
  filename: string | null;
  pageCount: number;
  clauses: ContractClause[];
  highlightedClauseId: string | null;
}) {
  const [fontSize, setFontSize] = useState(14);

  return (
    <section className="overflow-hidden rounded-card border border-line bg-ink-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand-400">Contract paper</p>
          <p className="mt-1 truncate text-xs text-copy-subtle">{filename ?? '合同文档'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFontSize((current) => Math.max(12, current - 1))}
            disabled={fontSize <= 12}
            className="grid h-8 w-8 place-items-center rounded-[2px] border border-line text-xs text-copy-muted transition hover:border-brand-500/40 hover:text-copy disabled:opacity-40"
            aria-label="缩小字号"
          >
            A-
          </button>
          <span className="w-8 text-center font-mono text-[9px] text-copy-subtle">{fontSize}</span>
          <button
            type="button"
            onClick={() => setFontSize((current) => Math.min(20, current + 1))}
            disabled={fontSize >= 20}
            className="grid h-8 w-8 place-items-center rounded-[2px] border border-line text-xs text-copy-muted transition hover:border-brand-500/40 hover:text-copy disabled:opacity-40"
            aria-label="放大字号"
          >
            A+
          </button>
        </div>
      </header>

      <div className="bg-ink-950/60 p-2 sm:p-4">
        <article className="mx-auto max-w-[52rem] bg-paper px-5 py-8 text-ink-950 shadow-lift sm:px-10 sm:py-12">
          <header className="border-b border-paper-line pb-6 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] opacity-45">Contract review copy</p>
            <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{contractName}</h1>
            <p className="mt-2 text-[10px] opacity-50">
              {pageCount > 0 ? `共 ${pageCount} 页` : '页数待解析'} · 以原始合同文件为准
            </p>
          </header>

          {clauses.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium">合同条款尚未就绪</p>
              <p className="mt-2 max-w-sm text-xs leading-6 opacity-55">
                解析完成后，条款会按原文顺序显示在这里，并可跳转定位。
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-7" style={{ fontSize }}>
              {clauses.map((clause) => {
                const highlighted = highlightedClauseId === clause.id;
                return (
                  <section
                    key={clause.id}
                    id={`clause-${clause.id}`}
                    tabIndex={-1}
                    className={`scroll-mt-24 rounded-[2px] border-l-2 px-4 py-3 transition-colors duration-300 ${
                      highlighted
                        ? 'border-brand-600 bg-brand-500/10'
                        : 'border-transparent hover:border-paper-line'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-semibold">
                        第 {clause.orderNo} 条
                        {clause.heading ? <span className="ml-2">{clause.heading}</span> : null}
                      </h2>
                      {clause.pageStart ? (
                        <span className="font-mono text-[9px] opacity-40">P.{clause.pageStart}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-8 opacity-85">{clause.content}</p>
                  </section>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
