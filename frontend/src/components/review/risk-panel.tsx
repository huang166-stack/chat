'use client';

import { useState } from 'react';
import { StatusTag, TechButton, type StatusTone } from '@/components/common';
import type {
  ReviewFinding,
  ReviewFindingStatus,
  ReviewRiskLevel,
} from '@/lib/api/reviews';
import { FINDING_STATUS_LABELS, RISK_LEVEL_LABELS } from '@/lib/contract-labels';

export interface RiskPanelFilters {
  riskLevel: 'ALL' | ReviewRiskLevel;
  status: 'ALL' | ReviewFindingStatus;
  category: 'ALL' | string;
}

const RISK_TONES: Record<ReviewRiskLevel, StatusTone> = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export function RiskPanel({
  findings,
  allFindings,
  categories,
  filters,
  activeFindingId,
  updatingFindingId,
  loading = false,
  onFiltersChange,
  onFindingClick,
  onStatusChange,
  className = '',
}: {
  findings: ReviewFinding[];
  allFindings: ReviewFinding[];
  categories: string[];
  filters: RiskPanelFilters;
  activeFindingId: string | null;
  updatingFindingId: string | null;
  loading?: boolean;
  onFiltersChange: (filters: RiskPanelFilters) => void;
  onFindingClick: (finding: ReviewFinding) => void;
  onStatusChange: (findingId: string, status: ReviewFindingStatus) => void;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const counts = allFindings.reduce(
    (result, finding) => {
      result.total += 1;
      if (finding.riskLevel === 'HIGH') result.high += 1;
      if (finding.riskLevel === 'MEDIUM') result.medium += 1;
      if (finding.riskLevel === 'LOW') result.low += 1;
      return result;
    },
    { total: 0, high: 0, medium: 0, low: 0 },
  );

  return (
    <section className={`flex flex-col overflow-hidden rounded-card border border-line bg-ink-900 ${className}`}>
      <header className="border-b border-line px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand-400">Risk register</p>
            <h2 className="mt-1 text-base font-semibold">风险清单</h2>
          </div>
          <span className="font-mono text-lg">{counts.total}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <RiskCount label="高" value={counts.high} className="text-risk-high" />
          <RiskCount label="中" value={counts.medium} className="text-risk-medium" />
          <RiskCount label="低" value={counts.low} className="text-risk-low" />
        </div>
      </header>

      <div className="space-y-2 border-b border-line px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((level) => {
            const active = filters.riskLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onFiltersChange({ ...filters, riskLevel: level })}
                aria-pressed={active}
                className={`rounded-[2px] border px-2 py-1 text-[10px] transition ${
                  active
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-line text-copy-subtle hover:border-line-strong hover:text-copy'
                }`}
              >
                {level === 'ALL' ? '全部' : RISK_LEVEL_LABELS[level]}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: event.target.value as RiskPanelFilters['status'],
              })
            }
            className="h-8 w-full rounded-[2px] border border-line bg-ink-950 px-2 text-[10px] text-copy-muted outline-none focus:border-brand-500"
            aria-label="按处理状态筛选"
          >
            <option value="ALL">全部状态</option>
            {(Object.keys(FINDING_STATUS_LABELS) as ReviewFindingStatus[]).map((status) => (
              <option key={status} value={status}>
                {FINDING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}
            className="h-8 w-full rounded-[2px] border border-line bg-ink-950 px-2 text-[10px] text-copy-muted outline-none focus:border-brand-500"
            aria-label="按类别筛选"
          >
            <option value="ALL">全部类别</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3" aria-label="正在加载风险清单">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-[2px] border border-line bg-ink-800" />
            ))}
          </div>
        ) : findings.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium">没有匹配的风险项</p>
            <p className="mt-2 text-xs leading-5 text-copy-subtle">调整筛选条件，或等待审查完成。</p>
          </div>
        ) : (
          findings.map((finding) => {
            const expanded = expandedId === finding.id;
            const active = activeFindingId === finding.id;
            return (
              <article
                key={finding.id}
                className={`border-b border-line last:border-b-0 ${active ? 'bg-brand-500/[0.04]' : ''}`}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3.5 text-left"
                  onClick={() => {
                    setExpandedId(expanded ? null : finding.id);
                    onFindingClick(finding);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusTag tone={RISK_TONES[finding.riskLevel]}>{RISK_LEVEL_LABELS[finding.riskLevel]}</StatusTag>
                    <span className="font-mono text-[9px] text-copy-subtle">{locationLabel(finding)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium leading-5">{finding.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-copy-muted">{finding.analysis}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-copy-subtle">
                    <span>{finding.category} · {finding.source === 'RULE' ? '规则' : '模型'}</span>
                    <span>{FINDING_STATUS_LABELS[finding.status]} {expanded ? '⌃' : '⌄'}</span>
                  </div>
                </button>

                {expanded ? (
                  <div className="border-t border-line px-4 pb-4 pt-3">
                    {finding.evidence ? (
                      <blockquote className="border-l border-line-strong pl-3 text-[11px] leading-5 text-copy-muted">
                        {finding.evidence}
                      </blockquote>
                    ) : null}
                    {finding.suggestion ? (
                      <div className="mt-3">
                        <p className="text-[10px] font-medium text-brand-400">修改建议</p>
                        <p className="mt-1 text-xs leading-6 text-copy-muted">{finding.suggestion}</p>
                      </div>
                    ) : null}
                    {finding.legalBasis ? (
                      <p className="mt-3 text-[10px] leading-5 text-copy-subtle">依据：{finding.legalBasis}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(['ACCEPTED', 'NEEDS_REVIEW', 'IGNORED'] as ReviewFindingStatus[]).map((status) => (
                        <TechButton
                          key={status}
                          size="sm"
                          variant={finding.status === status ? 'primary' : 'secondary'}
                          disabled={updatingFindingId === finding.id || finding.status === status}
                          onClick={() => onStatusChange(finding.id, status)}
                          className="!h-7 !px-2.5 !text-[10px]"
                        >
                          {FINDING_STATUS_LABELS[status]}
                        </TechButton>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function RiskCount({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="border border-line bg-ink-950/40 px-1.5 py-1.5">
      <p className={`font-mono text-sm font-semibold ${className}`}>{value}</p>
      <p className="text-[9px] text-copy-subtle">{label}风险</p>
    </div>
  );
}

function locationLabel(finding: ReviewFinding) {
  if (!finding.clauseOrder) return '未定位';
  return `第 ${finding.clauseOrder} 条`;
}
