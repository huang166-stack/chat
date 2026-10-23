import type { ReactNode } from 'react';
import { SectionTitle, StatusTag, TechCard } from '@/components/common';
import { Reveal } from './reveal';

interface Capability {
  index: string;
  title: string;
  tag: string;
  description: string;
  points: string[];
  visual: ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    index: '01',
    title: '规则预审，先标出明显的坑',
    tag: 'Deterministic',
    description:
      '内置采购、销售、NDA 等常见合同规则，在模型审查前完成确定性检查，减少漏报与不可控输出。',
    points: ['付款周期、责任上限、争议解决等高频条款', '规则命中结果与模型结论合并呈现'],
    visual: <RuleVisual />,
  },
  {
    index: '02',
    title: '条款定位，结论不离开原文',
    tag: 'Clause-level',
    description:
      '每条风险都绑定条款序号与合同原文。你不需要在长篇文本中反复搜索，也能判断建议是否成立。',
    points: ['风险项与纸面条款双向联动', '保留页码、条款与命中片段作为证据'],
    visual: <LocateVisual />,
  },
  {
    index: '03',
    title: '报告导出，交付物可以复核',
    tag: 'Auditable',
    description:
      '审查完成后生成包含风险摘要、条款证据、处理状态与免责声明的 DOCX 报告，便于内部流转和归档。',
    points: ['报告快照固定生成时的审查状态', '签名下载链接与控制访问有效期'],
    visual: <ReportVisual />,
  },
  {
    index: '04',
    title: '合同问答，围绕当前文本回答',
    tag: 'Grounded Q&A',
    description:
      '围绕当前合同的 Top 条款构建上下文，回答会尽量给出处，而不是脱离合同进行泛泛推测。',
    points: ['问题与审查任务解耦，不重复扣审查额度', '回答附带相关条款线索，方便继续核对'],
    visual: <QaVisual />,
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="border-b border-line bg-ink-950">
      <div className="marketing-container py-20 md:py-24 xl:py-28">
        <Reveal>
          <SectionTitle
            align="center"
            eyebrow="Capabilities / From upload to evidence"
            title="四项能力，组成一条完整的审查链路"
            description="从规则预审到条款定位、报告导出与合同问答，每一步都保留可核对的过程，而不是只给一个结论。"
          />
        </Reveal>

        <div className="mt-14 space-y-5">
          {CAPABILITIES.map((capability, index) => (
            <Reveal key={capability.index} delay={index * 60}>
              <CapabilityRow capability={capability} reverse={index % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityRow({ capability, reverse }: { capability: Capability; reverse: boolean }) {
  return (
    <TechCard className="grid overflow-hidden lg:grid-cols-2">
      <div className={`p-6 sm:p-8 lg:p-10 ${reverse ? 'lg:order-2' : ''}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.22em] text-brand-400">
            {capability.index}
          </span>
          <StatusTag tone="neutral">{capability.tag}</StatusTag>
        </div>
        <h3 className="mt-5 text-2xl font-semibold leading-tight md:text-3xl">{capability.title}</h3>
        <p className="mt-4 max-w-xl text-sm leading-7 text-copy-muted md:text-base">
          {capability.description}
        </p>
        <ul className="mt-6 space-y-3">
          {capability.points.map((point) => (
            <li key={point} className="flex gap-3 text-sm leading-6 text-copy-muted">
              <span className="mt-[11px] h-px w-5 shrink-0 bg-brand-500" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`flex min-h-[19rem] items-center justify-center border-t border-line bg-ink-900/70 p-4 sm:p-6 lg:border-t-0 ${
          reverse ? 'lg:order-1 lg:border-r' : 'lg:border-l'
        }`}
      >
        <div className="w-full max-w-md">{capability.visual}</div>
      </div>
    </TechCard>
  );
}

function RuleVisual() {
  const rules = [
    { title: '付款周期异常', detail: '120 天 > 90 天阈值', tone: 'high' as const },
    { title: '责任上限缺失', detail: '未找到责任封顶条款', tone: 'medium' as const },
    { title: '争议解决有效', detail: '已约定仲裁机构', tone: 'success' as const },
  ];

  return (
    <div className="rounded-card border border-line bg-ink-950 p-4 shadow-lift">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400">
          Rule pre-check
        </span>
        <span className="font-mono text-[10px] text-copy-subtle">12 rules</span>
      </div>
      <div className="divide-y divide-line">
        {rules.map((rule) => (
          <div key={rule.title} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">{rule.title}</p>
              <p className="mt-1 text-xs text-copy-subtle">{rule.detail}</p>
            </div>
            <StatusTag tone={rule.tone} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs text-copy-subtle">高风险 2 · 中风险 4</span>
        <span className="font-mono text-[10px] text-brand-400">SCAN COMPLETE</span>
      </div>
    </div>
  );
}

function LocateVisual() {
  return (
    <div className="overflow-hidden rounded-card bg-paper text-ink-950 shadow-lift">
      <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
        <span className="text-xs font-semibold">采购合同 · 第 3 页</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-50">Clause 03</span>
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold">第三条 付款方式</p>
        <p className="mt-3 text-xs leading-7 opacity-80">
          甲方应于收到发票后
          <span className="mx-1 bg-risk-high/20 px-1 text-risk-high">120 个自然日</span>
          内支付全部合同价款。
        </p>
        <div className="mt-4 border-l-2 border-risk-high pl-3">
          <p className="text-[10px] font-medium text-risk-high">证据片段 · 付款周期</p>
          <p className="mt-1 text-[11px] leading-5 opacity-65">
            条款未约定逾期付款利息，也未保留乙方暂停履行的权利。
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-paper-line pt-3 text-[10px] opacity-55">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-high" />
          已定位原文 · 支持跳转高亮
        </div>
      </div>
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="rounded-card bg-paper p-5 text-ink-950 shadow-lift">
      <div className="flex items-start justify-between gap-4 border-b border-paper-line pb-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-45">Review report</p>
          <h4 className="mt-1 text-base font-semibold">合同审查报告</h4>
          <p className="mt-1 text-[10px] opacity-55">快照 · 2026-10-23 14:32</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full border border-brand-600/40 font-mono text-[9px] text-brand-600">
          CR
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['7', '风险项'],
          ['3', '高风险'],
          ['2', '待复核'],
        ].map(([value, label]) => (
          <div key={label} className="border border-paper-line p-2">
            <p className="font-mono text-lg font-semibold">{value}</p>
            <p className="text-[9px] opacity-50">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {['审查范围与立场', '风险清单与条款证据', '处理状态与免责声明'].map((item, index) => (
          <div key={item} className="flex items-center gap-3 border-b border-paper-line pb-2 text-[10px]">
            <span className="font-mono opacity-40">0{index + 1}</span>
            <span className="flex-1 opacity-75">{item}</span>
            <span className="text-brand-600">已生成</span>
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] opacity-40">
        DOCX · Signed download · 5 min
      </p>
    </div>
  );
}

function QaVisual() {
  return (
    <div className="rounded-card border border-line bg-ink-950 p-4 shadow-lift">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400">
          Contract Q&A
        </span>
        <StatusTag tone="info">当前合同</StatusTag>
      </div>
      <div className="mt-4 ml-auto max-w-[82%] rounded-[3px] border border-line bg-ink-800 px-3 py-2 text-xs leading-6 text-copy-muted">
        对方迟延付款时，我们可以暂停交付吗？
      </div>
      <div className="mt-3 max-w-[92%] rounded-[3px] border border-brand-500/30 bg-brand-500/5 p-3">
        <p className="text-xs leading-6">
          当前条款未明确赋予暂停履行权，建议补充先履行抗辩或暂停交付的约定。
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusTag tone="medium">第 3 条 · 付款</StatusTag>
          <StatusTag tone="neutral">第 4 条 · 违约</StatusTag>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-[2px] border border-line bg-ink-900 px-3 py-2 text-[11px] text-copy-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        围绕 Top 条款回答 ·
        <span className="ml-auto">发送</span>
      </div>
    </div>
  );
}
