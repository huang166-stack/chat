import type {
  ReportFindingSummary,
  ReportRiskLevel,
  ReportSummary,
} from '@/lib/api/reports';

const RISK_LABELS: Record<ReportRiskLevel, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

const RISK_CLASSES: Record<ReportRiskLevel, string> = {
  HIGH: 'border-risk-high/40 bg-risk-high/10 text-risk-high',
  MEDIUM: 'border-risk-medium/40 bg-risk-medium/10 text-risk-medium',
  LOW: 'border-risk-low/40 bg-risk-low/10 text-risk-low',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: '待处理',
  ACCEPTED: '已采纳',
  IGNORED: '已忽略',
  NEEDS_REVIEW: '需复核',
};

const SOURCE_LABELS: Record<string, string> = {
  RULE: '规则检查',
  MODEL: '模型审查',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SALES: '销售合同',
  PURCHASE: '采购合同',
  NDA: '保密协议',
  EMPLOYMENT: '劳动合同',
  LEASE: '租赁合同',
  SERVICE: '服务合同',
  OTHER: '其他合同',
};

const STANCE_LABELS: Record<string, string> = {
  PARTY_A: '甲方立场',
  PARTY_B: '乙方立场',
  NEUTRAL: '中立立场',
};

export interface ReportPreviewProps {
  summary: ReportSummary;
  className?: string;
}

export function ReportPreview({ summary, className = '' }: ReportPreviewProps) {
  const missingFindings = summary.findings.filter(
    (finding) =>
      !finding.clauseOrder ||
      /缺失|未约定|未明确|缺少|不具备/.test(finding.title),
  );

  return (
    <article
      className={`mx-auto w-full max-w-4xl bg-paper px-6 py-8 text-ink-950 shadow-frame sm:px-10 sm:py-12 print:max-w-none print:px-0 print:py-0 print:shadow-none ${className}`}
    >
      <header className="border-b border-paper-line pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-brand-600">
          Confidential · Contract Review
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {summary.contract.name}
        </h1>
        <p className="mt-3 text-lg">合同审查报告</p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>报告日期：{formatDate(summary.generatedAt)}</span>
          <span>审查任务：#{summary.review.taskId}</span>
          <span>共 {summary.contract.pageCount} 页</span>
        </div>
      </header>

      <section className="mt-8 break-inside-avoid">
        <h2 className="text-xl font-semibold">审查范围与基本信息</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 border border-paper-line p-4 text-sm sm:grid-cols-2">
          <Info label="合同类型">
            {CONTRACT_TYPE_LABELS[summary.contract.contractType] ??
              summary.contract.contractType}
          </Info>
          <Info label="审查立场">
            {STANCE_LABELS[summary.contract.stance] ?? summary.contract.stance}
          </Info>
          <Info label="合同文件">{summary.contract.documentFilename}</Info>
          <Info label="相对方">{summary.contract.counterparty ?? '未填写'}</Info>
          <Info label="规则集">
            {summary.review.ruleSetName ?? '默认规则集'}
            {summary.review.ruleSetVersion
              ? ` · v${summary.review.ruleSetVersion}`
              : ''}
          </Info>
          <Info label="模型">{summary.review.modelName ?? '未使用模型审查'}</Info>
        </dl>
        <p className="mt-4 text-sm leading-7 opacity-75">
          本报告依据生成时的合同文本和审查快照形成，列示风险条款、缺失约定与处理状态，供内部审阅与合同修改使用。
        </p>
      </section>

      <section className="mt-10 break-inside-avoid">
        <h2 className="text-xl font-semibold">风险统计</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="全部问题" value={summary.statistics.total} />
          <Stat label="高风险" value={summary.statistics.high} risk="HIGH" />
          <Stat
            label="中风险"
            value={summary.statistics.medium}
            risk="MEDIUM"
          />
          <Stat label="低风险" value={summary.statistics.low} risk="LOW" />
        </div>
        <p className="mt-4 text-sm opacity-75">
          待处理 {summary.statistics.open} 项 · 已采纳{' '}
          {summary.statistics.accepted} 项 · 已忽略{' '}
          {summary.statistics.ignored} 项 · 需复核{' '}
          {summary.statistics.needsReview} 项
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">风险明细</h2>
        {summary.findings.length === 0 ? (
          <p className="mt-4 text-sm opacity-75">本次审查未发现问题。</p>
        ) : (
          <div className="mt-4 space-y-5">
            {summary.findings.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={index + 1}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 break-inside-avoid">
        <h2 className="text-xl font-semibold">缺失条款与提示</h2>
        {missingFindings.length === 0 ? (
          <p className="mt-4 text-sm leading-7 opacity-75">
            本次审查未单独识别缺失条款；请结合风险明细中的修改建议核对合同完整性。
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {missingFindings.map((finding) => (
              <div key={finding.id} className="border-l-2 border-risk-medium pl-4">
                <h3 className="font-medium">{finding.title}</h3>
                <p className="mt-1 text-sm leading-7 opacity-75">
                  {finding.analysis}
                </p>
                {finding.suggestion ? (
                  <p className="mt-1 text-sm leading-7 opacity-75">
                    建议：{finding.suggestion}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 break-inside-avoid">
        <h2 className="text-xl font-semibold">处理记录</h2>
        <div className="mt-4 divide-y divide-paper-line border-y border-paper-line text-sm">
          {summary.findings.length === 0 ? (
            <p className="py-4 opacity-75">暂无需要记录的处理事项。</p>
          ) : (
            summary.findings.map((finding) => (
              <div
                key={`record-${finding.id}`}
                className="flex flex-wrap justify-between gap-2 py-3"
              >
                <span>{finding.title}</span>
                <span className="opacity-70">
                  {STATUS_LABELS[finding.status] ?? finding.status} ·{' '}
                  {formatDateTime(finding.updatedAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <footer className="mt-12 border-t border-paper-line pt-6">
        <h2 className="font-semibold">免责声明</h2>
        <p className="mt-2 text-sm leading-7 opacity-75">
          本报告由自动化工具生成，不构成正式法律意见，也不替代律师结合具体交易背景、证据和适用法律进行的专业审查。最终决策应由用户及其法律顾问作出。
        </p>
      </footer>
    </article>
  );
}

function FindingCard({
  finding,
  index,
}: {
  finding: ReportFindingSummary;
  index: number;
}) {
  return (
    <article className="break-inside-avoid border border-paper-line p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold">
          {index}. {finding.title}
        </h3>
        <span
          className={`rounded-[2px] border px-2 py-0.5 text-xs font-medium ${RISK_CLASSES[finding.riskLevel]}`}
        >
          {RISK_LABELS[finding.riskLevel]}
        </span>
      </div>
      <p className="mt-2 text-xs opacity-65">
        {finding.category} · {SOURCE_LABELS[finding.source] ?? finding.source} ·{' '}
        {STATUS_LABELS[finding.status] ?? finding.status} · {clauseLocation(finding)}
      </p>
      <p className="mt-3 text-sm leading-7">{finding.analysis}</p>
      {finding.suggestion ? (
        <p className="mt-2 text-sm leading-7">
          <strong>修改建议：</strong>
          {finding.suggestion}
        </p>
      ) : null}
      {finding.legalBasis ? (
        <p className="mt-2 text-sm leading-7 opacity-80">
          <strong>法律依据：</strong>
          {finding.legalBasis}
        </p>
      ) : null}
      {finding.evidence ? (
        <blockquote className="mt-3 border-l-2 border-paper-line pl-3 text-sm leading-7 opacity-70">
          {finding.evidence}
        </blockquote>
      ) : null}
    </article>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide opacity-55">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  risk,
}: {
  label: string;
  value: number;
  risk?: ReportRiskLevel;
}) {
  return (
    <div
      className={`border p-4 ${
        risk ? RISK_CLASSES[risk] : 'border-paper-line bg-ink-950/5'
      }`}
    >
      <p className="text-xs opacity-65">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function clauseLocation(finding: ReportFindingSummary) {
  if (!finding.clauseOrder) return '未定位到具体条款';
  const pages =
    finding.pageStart && finding.pageEnd
      ? finding.pageStart === finding.pageEnd
        ? `第 ${finding.pageStart} 页`
        : `第 ${finding.pageStart}-${finding.pageEnd} 页`
      : null;
  return `第 ${finding.clauseOrder} 条${pages ? ` · ${pages}` : ''}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
