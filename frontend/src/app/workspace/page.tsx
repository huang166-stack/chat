'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import {
  EmptyState,
  SectionTitle,
  StatusTag,
  TechCard,
  TechLink,
  type StatusTone,
} from '@/components/common';
import type { ContractListItem, ContractStatus } from '@/lib/api/contracts';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  formatDateTime,
} from '@/lib/contract-labels';
import { useContractOverview, useContracts } from '@/lib/hooks/use-contracts';

const STATUS_FILTERS: Array<{ value: 'ALL' | ContractStatus; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'READY', label: '待审查' },
  { value: 'REVIEWING', label: '审查中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
];

const STATUS_TONES: Record<ContractStatus, StatusTone> = {
  PARSING: 'processing',
  READY: 'info',
  REVIEWING: 'processing',
  COMPLETED: 'success',
  FAILED: 'high',
  ARCHIVED: 'neutral',
};

export default function WorkspacePage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | ContractStatus>('ALL');
  const deferredKeyword = useDeferredValue(keyword.trim());
  const overviewQuery = useContractOverview();
  const contractsQuery = useContracts({
    keyword: deferredKeyword || undefined,
    status: status === 'ALL' ? undefined : status,
    pageSize: 20,
  });

  const overview = overviewQuery.data;
  const contracts = contractsQuery.data?.list ?? [];
  const total = contractsQuery.data?.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-7 sm:px-6 sm:py-9 xl:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand-400">
            Review Desk / Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            合同审查工作台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-copy-muted">
            从待审合同、审查进度到风险处理，集中查看当前账号的审查状态。
          </p>
        </div>
        <TechLink href="/workspace/contracts/new" size="lg" className="self-start sm:self-auto">
          上传合同
        </TechLink>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="审查概览">
        <StatCard
          label="本月审查任务"
          value={overview?.reviewedThisMonth}
          hint={`共 ${overview?.contracts ?? 0} 份合同`}
          loading={overviewQuery.isLoading}
        />
        <StatCard
          label="已发现问题"
          value={overview?.findings}
          hint={`其中 ${overview?.highFindings ?? 0} 项高风险`}
          loading={overviewQuery.isLoading}
          accent={(overview?.highFindings ?? 0) > 0}
        />
        <StatCard
          label="已生成报告"
          value={overview?.reports}
          hint="成功生成的 DOCX 报告"
          loading={overviewQuery.isLoading}
        />
        <StatCard
          label="进行中"
          value={overview?.activeReviews}
          hint={overview && overview.activeReviews > 0 ? '任务会自动刷新进度' : '当前无运行任务'}
          loading={overviewQuery.isLoading}
        />
      </section>

      <section id="contracts" className="mt-10">
        <div className="flex flex-col gap-5 border-b border-line pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow="Contracts / Recent"
              title="最近合同"
              description={total > 0 ? `共 ${total} 份合同，按最近更新时间排序。` : '上传第一份合同后，审查状态会显示在这里。'}
            />
            <label className="relative block w-full lg:max-w-sm">
              <span className="sr-only">搜索合同</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索合同名称或文件名"
                className="h-11 w-full rounded-[2px] border border-line-strong bg-ink-900 px-4 pr-10 text-sm text-copy outline-none transition placeholder:text-copy-subtle focus:border-brand-500"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-copy-subtle" aria-hidden="true">
                ⌕
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="合同状态筛选">
            {STATUS_FILTERS.map((filter) => {
              const active = status === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  aria-pressed={active}
                  className={`rounded-[2px] border px-3 py-1.5 text-xs transition ${
                    active
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-line text-copy-muted hover:border-line-strong hover:text-copy'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {contractsQuery.isError ? (
          <TechCard className="mt-5 border-risk-high/35 p-6">
            <p className="font-medium text-risk-high">合同列表加载失败</p>
            <p className="mt-2 text-sm text-copy-muted">请检查后端服务与登录状态后重试。</p>
            <button
              type="button"
              className="mt-4 text-sm text-brand-400 hover:text-brand-300"
              onClick={() => void contractsQuery.refetch()}
            >
              重新加载
            </button>
          </TechCard>
        ) : contractsQuery.isLoading ? (
          <div className="mt-5 space-y-2" aria-label="正在加载合同">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-card border border-line bg-ink-900" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title={keyword || status !== 'ALL' ? '没有匹配的合同' : '还没有合同'}
              description={
                keyword || status !== 'ALL'
                  ? '尝试清空搜索词或切换状态筛选。'
                  : '上传第一份合同，系统会解析条款并引导你开始审查。'
              }
              action={
                keyword || status !== 'ALL' ? (
                  <button
                    type="button"
                    className="text-sm text-brand-400 hover:text-brand-300"
                    onClick={() => {
                      setKeyword('');
                      setStatus('ALL');
                    }}
                  >
                    清空筛选
                  </button>
                ) : (
                  <TechLink href="/workspace/contracts/new">上传第一份合同</TechLink>
                )
              }
            />
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <div className="hidden grid-cols-[minmax(0,1fr)_8.5rem_8rem_7rem_1.5rem] gap-4 px-4 pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-copy-subtle md:grid">
              <span>合同</span>
              <span>状态</span>
              <span>风险</span>
              <span>更新时间</span>
              <span />
            </div>
            {contracts.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  loading,
  accent = false,
}: {
  label: string;
  value: number | undefined;
  hint: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <TechCard accent={accent} className="p-4 sm:p-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-copy-subtle">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${accent ? 'text-risk-high' : ''}`}>
        {loading ? '—' : (value ?? 0)}
      </p>
      <p className="mt-2 text-xs text-copy-muted">{hint}</p>
    </TechCard>
  );
}

function ContractRow({ contract }: { contract: ContractListItem }) {
  const task = contract.latestTask;
  const counts = task?.findingCounts;
  const active =
    task?.status === 'PENDING' ||
    task?.status === 'PARSING' ||
    task?.status === 'RULE_CHECK' ||
    task?.status === 'MODEL_REVIEW' ||
    task?.status === 'AGGREGATING';

  return (
    <Link href={`/workspace/contracts/${contract.id}`} className="block" aria-label={`打开${contract.name}`}>
      <TechCard
        interactive
        className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_8.5rem_8rem_7rem_1.5rem] md:items-center"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{contract.name}</p>
            {counts && counts.high > 0 ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-high" aria-label="存在高风险" />
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-xs text-copy-subtle">
            {CONTRACT_TYPE_LABELS[contract.contractType]}
            {contract.document ? ` · ${contract.document.pageCount || '—'} 页 · ${contract.document.filename}` : ''}
          </p>
          {active ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.progress}>
                <div className="h-full bg-brand-500 transition-[width]" style={{ width: `${task.progress}%` }} />
              </div>
              <span className="font-mono text-[9px] text-brand-400">{task.progress}%</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 md:block">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-copy-subtle md:hidden">状态</span>
          <StatusTag tone={STATUS_TONES[contract.status]}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </StatusTag>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {counts && counts.total > 0 ? (
            <>
              <span className="text-risk-high">{counts.high} 高</span>
              <span className="text-risk-medium">{counts.medium} 中</span>
              <span className="text-risk-low">{counts.low} 低</span>
            </>
          ) : (
            <span className="text-copy-subtle">暂无风险</span>
          )}
        </div>

        <div className="text-xs text-copy-subtle">
          <span className="md:hidden">更新于 </span>
          {formatDateTime(contract.updatedAt)}
        </div>

        <span className="hidden text-copy-subtle md:block" aria-hidden="true">↗</span>
      </TechCard>
    </Link>
  );
}
