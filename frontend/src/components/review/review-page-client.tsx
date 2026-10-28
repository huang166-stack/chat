'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusTag, TechButton, TechCard, TechLink, type StatusTone } from '@/components/common';
import type { ContractChatCitation } from '@/lib/api/contract-chat';
import type {
  ContractClause,
  ContractStatus,
  ContractStance,
} from '@/lib/api/contracts';
import { ApiError } from '@/lib/api/client';
import type {
  ReviewFinding,
  ReviewFindingStatus,
} from '@/lib/api/reviews';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  formatDateTime,
  TASK_STATUS_LABELS,
} from '@/lib/contract-labels';
import { useContract } from '@/lib/hooks/use-contracts';
import {
  useContractFindings,
  useCreateReview,
  useRetryReview,
  useReviewTask,
  useUpdateFindingStatus,
} from '@/lib/hooks/use-review';
import { ClauseNavigator } from './clause-navigator';
import { ContractChatPanel } from './contract-chat-panel';
import { ContractPaper } from './contract-paper';
import { ReviewProgress } from './review-progress';
import { RiskPanel, type RiskPanelFilters } from './risk-panel';

const STATUS_TONES: Record<ContractStatus, StatusTone> = {
  PARSING: 'processing',
  READY: 'info',
  REVIEWING: 'processing',
  COMPLETED: 'success',
  FAILED: 'high',
  ARCHIVED: 'neutral',
};

const ACTIVE_TASK_STATUSES = [
  'PENDING',
  'PARSING',
  'RULE_CHECK',
  'MODEL_REVIEW',
  'AGGREGATING',
];

export function ReviewPageClient({ contractId }: { contractId: string }) {
  const searchParams = useSearchParams();
  const requestedRuleSetId = searchParams.get('ruleSetId');
  const ruleSetId = requestedRuleSetId && /^\d+$/.test(requestedRuleSetId) ? requestedRuleSetId : undefined;

  const contractQuery = useContract(contractId);
  const contract = contractQuery.data;
  const detailTask = contract?.latestTask ?? null;
  const taskQuery = useReviewTask(detailTask?.id ?? null);
  const task = taskQuery.data ?? detailTask;
  const findingsQuery = useContractFindings(
    contractId,
    { taskId: task?.id, pageSize: 100 },
    Boolean(task),
  );
  const createReview = useCreateReview(contractId);
  const retryReview = useRetryReview();
  const updateFindingStatus = useUpdateFindingStatus(contractId);

  const [filters, setFilters] = useState<RiskPanelFilters>({
    riskLevel: 'ALL',
    status: 'ALL',
    category: 'ALL',
  });
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const highlightTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimer.current !== null) {
        window.clearTimeout(highlightTimer.current);
      }
    };
  }, []);

  const revealClause = useCallback((clause: ContractClause) => {
    setActiveClauseId(clause.id);
    setHighlightedClauseId(clause.id);
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = window.setTimeout(() => setHighlightedClauseId(null), 2200);

    window.requestAnimationFrame(() => {
      const element = window.document.getElementById(`clause-${clause.id}`);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  }, []);

  const clauses = contract?.document?.clauses ?? [];
  const allFindings = findingsQuery.data?.list ?? [];
  const categories = Array.from(new Set(allFindings.map((finding) => finding.category))).sort(
    (left, right) => left.localeCompare(right, 'zh-CN'),
  );
  const filteredFindings = allFindings.filter((finding) => {
    if (filters.riskLevel !== 'ALL' && finding.riskLevel !== filters.riskLevel) return false;
    if (filters.status !== 'ALL' && finding.status !== filters.status) return false;
    if (filters.category !== 'ALL' && finding.category !== filters.category) return false;
    return true;
  });

  const handleFindingClick = (finding: ReviewFinding) => {
    setActiveFindingId(finding.id);
    const clause =
      clauses.find((item) => item.id === finding.clauseId) ??
      (finding.clauseOrder !== null
        ? clauses.find((item) => item.orderNo === finding.clauseOrder)
        : undefined);
    if (clause) revealClause(clause);
  };

  const handleCitationClick = (citation: ContractChatCitation) => {
    const clause =
      clauses.find((item) => item.id === citation.clauseId) ??
      clauses.find((item) => item.orderNo === citation.orderNo);
    if (clause) {
      revealClause(clause);
      window.document.getElementById(`clause-${clause.id}`)?.focus({ preventScroll: true });
    }
  };

  const handleStartReview = () => {
    if (!contract) return;
    createReview.mutate(
      {
        stance: contract.stance as ContractStance,
        ...(ruleSetId ? { ruleSetId } : {}),
      },
      {
        onSuccess: () => {
          void contractQuery.refetch();
        },
      },
    );
  };

  const handleRetryReview = () => {
    if (!task) return;
    retryReview.mutate(task.id, {
      onSuccess: () => {
        void contractQuery.refetch();
      },
    });
  };

  const handleStatusChange = (findingId: string, status: ReviewFindingStatus) => {
    updateFindingStatus.mutate({ findingId, status });
  };

  if (contractQuery.isLoading) {
    return <DetailSkeleton />;
  }

  if (contractQuery.isError || !contract) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <TechCard className="border-risk-high/35 p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-risk-high">Contract unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold">无法打开合同详情</h1>
          <p className="mt-2 text-sm leading-7 text-copy-muted">
            请确认合同存在，且当前账号拥有访问权限。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TechLink href="/workspace">返回工作台</TechLink>
            <TechButton variant="secondary" onClick={() => void contractQuery.refetch()}>
              重新加载
            </TechButton>
          </div>
        </TechCard>
      </div>
    );
  }

  const document = contract.document;
  const parsing = document?.parseStatus === 'PENDING' || document?.parseStatus === 'PROCESSING';
  const parseFailed = document?.parseStatus === 'FAILED';
  const reviewActive = task ? ACTIVE_TASK_STATUSES.includes(task.status) : false;
  const updatingFindingId = updateFindingStatus.isPending
    ? String(updateFindingStatus.variables?.findingId ?? '')
    : null;
  const actionError = createReview.error ?? retryReview.error ?? updateFindingStatus.error;
  const actionErrorText = actionError
    ? actionError instanceof ApiError
      ? actionError.message
      : '操作失败，请稍后重试'
    : null;

  return (
    <div className="mx-auto w-full max-w-[96rem] px-3 py-5 sm:px-6 sm:py-7 xl:px-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/workspace" className="text-xs text-copy-subtle transition hover:text-brand-400">
              ← 工作台
            </Link>
            <span className="text-copy-subtle">/</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-copy-subtle">
              {CONTRACT_TYPE_LABELS[contract.contractType]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="max-w-3xl truncate text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              {contract.name}
            </h1>
            <StatusTag tone={STATUS_TONES[contract.status]}>
              {CONTRACT_STATUS_LABELS[contract.status]}
            </StatusTag>
          </div>
          <p className="mt-2 text-xs text-copy-subtle">
            {document?.filename ?? '合同文件'} · {document?.pageCount ? `${document.pageCount} 页` : '页数待解析'} · 更新于 {formatDateTime(contract.updatedAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusTag tone="neutral">{stanceLabel(contract.stance)}</StatusTag>
            {task?.ruleSetName ? (
              <StatusTag tone="info">
                {task.ruleSetName}
                {task.ruleSetVersion ? ` · v${task.ruleSetVersion}` : ''}
              </StatusTag>
            ) : null}
            {task ? <StatusTag tone="neutral">{TASK_STATUS_LABELS[task.status]}</StatusTag> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {task?.status === 'SUCCESS' ? (
            <>
              <TechLink href={`/workspace/contracts/${contract.id}/report`} variant="secondary" size="sm">
                查看报告
              </TechLink>
              <TechButton
                size="sm"
                variant="ghost"
                onClick={handleStartReview}
                disabled={createReview.isPending || reviewActive}
              >
                {createReview.isPending ? '提交中...' : '重新审查'}
              </TechButton>
            </>
          ) : reviewActive ? (
            <span className="rounded-[2px] border border-brand-500/30 bg-brand-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-400">
              自动刷新中
            </span>
          ) : (
            <TechButton
              size="sm"
              onClick={handleStartReview}
              disabled={createReview.isPending || parsing || parseFailed || !document}
            >
              {createReview.isPending ? '提交中...' : '开始审查'}
            </TechButton>
          )}
        </div>
      </header>

      {actionErrorText ? (
        <p role="alert" className="mt-4 border border-risk-high/35 bg-risk-high/10 px-4 py-3 text-sm text-risk-high">
          {actionErrorText}
        </p>
      ) : null}

      {parsing ? (
        <ParseNotice filename={document?.filename ?? '合同文件'} />
      ) : parseFailed ? (
        <TechCard className="mt-4 border-risk-high/35 p-5">
          <p className="font-medium text-risk-high">合同解析失败</p>
          <p className="mt-2 text-sm leading-6 text-copy-muted">
            {document?.parseError ?? '文件可能损坏、为扫描件，或当前格式无法提取文本。'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <TechLink href="/workspace/contracts/new" size="sm">重新上传</TechLink>
            <TechLink href="/workspace" variant="secondary" size="sm">返回工作台</TechLink>
          </div>
        </TechCard>
      ) : null}

      {task && (reviewActive || task.status === 'FAILED' || task.status === 'CANCELLED') ? (
        <div className="mt-4">
          <ReviewProgress status={task.status} progress={task.progress} errorMessage={task.errorMessage} />
          {task.status === 'FAILED' || task.status === 'CANCELLED' ? (
            <div className="mt-2 flex justify-end">
              <TechButton size="sm" variant="secondary" disabled={retryReview.isPending} onClick={handleRetryReview}>
                {retryReview.isPending ? '重新提交中...' : '重试审查'}
              </TechButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {!task && !parsing && !parseFailed && document ? (
        <TechCard accent className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">条款解析已完成，可以开始审查</p>
            <p className="mt-1 text-xs leading-5 text-copy-muted">
              {ruleSetId ? '将使用上传时选择的规则集。' : '系统会按合同类型与立场自动匹配规则集。'}
              开始审查后将按合同页数扣减额度。
            </p>
          </div>
          <TechButton onClick={handleStartReview} disabled={createReview.isPending}>
            {createReview.isPending ? '正在创建任务...' : '开始审查'}
          </TechButton>
        </TechCard>
      ) : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-[10rem_minmax(0,1fr)_19rem] 2xl:grid-cols-[13rem_minmax(0,1fr)_23rem]">
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <ClauseNavigator
              clauses={clauses}
              findings={allFindings}
              activeClauseId={activeClauseId}
              onSelect={revealClause}
            />
          </div>
        </aside>

        <div className="min-w-0">
          <ContractPaper
            contractName={contract.name}
            filename={document?.filename ?? null}
            pageCount={document?.pageCount ?? 0}
            clauses={clauses}
            highlightedClauseId={highlightedClauseId}
          />
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <RiskPanel
              findings={filteredFindings}
              allFindings={allFindings}
              categories={categories}
              filters={filters}
              activeFindingId={activeFindingId}
              updatingFindingId={updatingFindingId}
              loading={findingsQuery.isLoading}
              onFiltersChange={setFilters}
              onFindingClick={handleFindingClick}
              onStatusChange={handleStatusChange}
              className="max-h-[calc(100vh-6rem)]"
            />
          </div>
        </aside>
      </div>

      {findingsQuery.isError ? (
        <p className="mt-3 text-xs text-risk-high">风险清单加载失败，请刷新后重试。</p>
      ) : null}

      <div className="mt-5">
        <ContractChatPanel
          contractId={contract.id}
          disabled={task?.status !== 'SUCCESS'}
          disabledReason={task ? '审查完成后可以围绕当前合同提问' : '完成审查后可以围绕当前合同提问'}
          onCitationClick={handleCitationClick}
        />
      </div>

      {task ? (
        <TechButton
          type="button"
          className="fixed bottom-5 right-4 z-30 shadow-glow xl:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
        >
          风险清单
          <span className="rounded-full bg-ink-950/20 px-1.5 font-mono text-[10px]">
            {task.findingCounts.total}
          </span>
        </TechButton>
      ) : null}

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="风险清单"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="关闭风险清单"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[84vh] overflow-hidden rounded-t-card border-t border-line bg-ink-900 shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand-400">Risk drawer</p>
                <p className="mt-1 text-sm font-medium">风险与处理状态</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-[2px] border border-line text-copy-muted"
                aria-label="关闭风险清单"
              >
                ×
              </button>
            </div>
            <RiskPanel
              findings={filteredFindings}
              allFindings={allFindings}
              categories={categories}
              filters={filters}
              activeFindingId={activeFindingId}
              updatingFindingId={updatingFindingId}
              loading={findingsQuery.isLoading}
              onFiltersChange={setFilters}
              onFindingClick={handleFindingClick}
              onStatusChange={handleStatusChange}
              className="max-h-[calc(84vh-4.25rem)] rounded-none border-0"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ParseNotice({ filename }: { filename: string }) {
  return (
    <section className="mt-4 rounded-card border border-brand-500/25 bg-brand-500/5 px-4 py-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium">正在解析合同条款</p>
          <p className="mt-1 truncate text-xs text-copy-muted">{filename} · 页面会自动刷新</p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-6 xl:px-8">
      <div className="h-8 w-64 animate-pulse rounded bg-ink-800" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-ink-800" />
      <div className="mt-6 grid gap-3 xl:grid-cols-[10rem_minmax(0,1fr)_19rem]">
        <div className="hidden h-72 animate-pulse rounded-card border border-line bg-ink-900 xl:block" />
        <div className="h-[36rem] animate-pulse rounded-card border border-line bg-ink-900" />
        <div className="hidden h-72 animate-pulse rounded-card border border-line bg-ink-900 xl:block" />
      </div>
    </div>
  );
}

function stanceLabel(stance: string) {
  if (stance === 'PARTY_A') return '甲方立场';
  if (stance === 'PARTY_B') return '乙方立场';
  return '中立审查';
}
