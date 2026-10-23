'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { getReportDownload } from '@/lib/api/reports';
import {
  useGenerateReport,
  useLatestReport,
} from '@/lib/hooks/use-report';
import { ReportActions } from './report-actions';
import { ReportPreview } from './report-preview';

export interface ReportPageClientProps {
  contractId: string;
}

export function ReportPageClient({ contractId }: ReportPageClientProps) {
  const reportQuery = useLatestReport(contractId);
  const generateMutation = useGenerateReport(contractId);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const report = reportQuery.data ?? null;
  const queryError =
    reportQuery.error instanceof ApiError ? reportQuery.error.message : null;
  const generationError =
    generateMutation.error instanceof ApiError
      ? generateMutation.error.message
      : generateMutation.error
        ? '报告生成失败，请稍后重试'
        : null;
  const error = actionError ?? generationError ?? queryError;

  const handleGenerate = () => {
    setActionError(null);
    generateMutation.mutate(undefined, {
      onSuccess: () => {
        void reportQuery.refetch();
      },
    });
  };

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    setActionError(null);
    try {
      const download = await getReportDownload(report.id);
      const link = document.createElement('a');
      link.href = download.url;
      link.download = download.filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (downloadError) {
      setActionError(
        downloadError instanceof ApiError
          ? downloadError.message
          : '获取下载链接失败，请稍后重试',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 px-4 py-8 print:bg-paper print:px-0 print:py-0 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-400">
              Review Report
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-glow">
              合同审查报告
            </h1>
            <p className="mt-2 text-sm opacity-60">
              报告内容来自审查完成时的数据快照，下载链接 5 分钟内有效。
            </p>
          </div>
          <Link
            href="/chat"
            className="rounded-[2px] border border-line px-4 py-2 text-sm transition hover:border-brand-500/60 hover:text-brand-400"
          >
            返回对话
          </Link>
        </header>

        {error ? (
          <p
            role="alert"
            className="mb-5 rounded-card border border-risk-high/40 bg-risk-high/10 px-4 py-3 text-sm text-risk-high print:hidden"
          >
            {error}
          </p>
        ) : null}

        {reportQuery.isLoading ? (
          <StatusPanel
            title="正在加载报告"
            description="正在核对合同归属与最近一次审查结果。"
          />
        ) : reportQuery.isError ? (
          <StatusPanel
            title="无法加载报告"
            description="请确认合同存在且当前账号有访问权限。"
          />
        ) : !report ? (
          <section className="rounded-card border border-line bg-ink-900 p-6 sm:p-8 print:hidden">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-brand-400">
              No Report
            </p>
            <h2 className="mt-3 text-xl font-semibold">尚未生成审查报告</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 opacity-65">
              需要先完成合同审查。生成后将包含风险统计、风险明细、缺失条款提示与处理记录。
            </p>
            <div className="mt-6">
              <ReportActions
                status={null}
                generating={generateMutation.isPending}
                downloading={false}
                onGenerate={handleGenerate}
                onDownload={handleDownload}
                onPrint={() => window.print()}
              />
            </div>
          </section>
        ) : report.status === 'FAILED' ? (
          <section className="rounded-card border border-risk-high/40 bg-ink-900 p-6 sm:p-8 print:hidden">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-risk-high">
              Generation Failed
            </p>
            <h2 className="mt-3 text-xl font-semibold">报告生成失败</h2>
            <p className="mt-2 text-sm leading-7 opacity-70">
              {report.errorMessage ?? '请稍后重试生成任务。'}
            </p>
            <div className="mt-6">
              <ReportActions
                status={report.status}
                generating={generateMutation.isPending}
                downloading={false}
                onGenerate={handleGenerate}
                onDownload={handleDownload}
                onPrint={() => window.print()}
              />
            </div>
          </section>
        ) : report.status === 'PENDING' || report.status === 'PROCESSING' ? (
          <StatusPanel
            title="报告正在生成"
            description="系统正在汇总审查快照并生成 DOCX，页面会自动刷新。"
            busy
            actions={
              <ReportActions
                status={report.status}
                generating={generateMutation.isPending}
                downloading={false}
                onGenerate={handleGenerate}
                onDownload={handleDownload}
                onPrint={() => window.print()}
              />
            }
          />
        ) : report.summary ? (
          <section className="space-y-5">
            <div className="flex justify-end print:hidden">
              <ReportActions
                status={report.status}
                generating={generateMutation.isPending}
                downloading={downloading}
                onGenerate={handleGenerate}
                onDownload={handleDownload}
                onPrint={() => window.print()}
              />
            </div>
            <ReportPreview summary={report.summary} />
          </section>
        ) : (
          <StatusPanel
            title="报告快照不可用"
            description="报告记录已完成，但缺少快照数据。请重新生成报告。"
            actions={
              <ReportActions
                status="FAILED"
                generating={generateMutation.isPending}
                downloading={false}
                onGenerate={handleGenerate}
                onDownload={handleDownload}
                onPrint={() => window.print()}
              />
            }
          />
        )}
      </div>
    </main>
  );
}

function StatusPanel({
  title,
  description,
  busy = false,
  actions,
}: {
  title: string;
  description: string;
  busy?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-ink-900 p-6 sm:p-8 print:hidden">
      <div className="flex items-start gap-4">
        <span
          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
            busy ? 'animate-pulse bg-brand-400' : 'bg-line-strong'
          }`}
        />
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-7 opacity-65">{description}</p>
          {actions ? <div className="mt-5">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
