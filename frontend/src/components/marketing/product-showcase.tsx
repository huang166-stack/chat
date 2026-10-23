import { SectionTitle, StatusTag } from '@/components/common';
import { ProductFrame } from './product-frame';
import { Reveal } from './reveal';

const FEATURES = [
  {
    index: '01',
    title: '风险一眼可见',
    description: '按高、中、低风险聚合，优先呈现需要处理的条款。',
  },
  {
    index: '02',
    title: '结论回到原文',
    description: '每条风险绑定条款序号、页码与合同原文，避免脱离上下文。',
  },
  {
    index: '03',
    title: '建议可以直接执行',
    description: '给出修改方向与法律依据，并保留人工复核状态。',
  },
  {
    index: '04',
    title: '交付物可审计',
    description: '报告快照固定生成时状态，记录处理轨迹与免责声明。',
  },
];

export function ProductShowcase() {
  return (
    <section id="product" className="border-b border-line bg-ink-950">
      <div className="marketing-container py-20 md:py-24 xl:py-28">
        <Reveal>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow="Product / Review Workspace"
              title="不是黑盒结论，而是可核对的审查过程"
              description="合同纸面、风险面板与条款证据保持联动。你看到的每个判断，都能回到原文。"
            />
            <div className="flex gap-2">
              <StatusTag tone="success">规则 + 模型</StatusTag>
              <StatusTag tone="info">条款定位</StatusTag>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.48fr_.52fr] xl:items-start">
          <Reveal>
            <ProductFrame label="Contract review">
              <ReviewWorkspaceMock />
            </ProductFrame>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid gap-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.index}
                  className="border-l border-line pl-4 transition hover:border-brand-500/60"
                >
                  <p className="font-mono text-[10px] tracking-[0.2em] text-brand-400">
                    {feature.index}
                  </p>
                  <h3 className="mt-1.5 text-sm font-medium">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-copy-muted">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ReviewWorkspaceMock() {
  return (
    <div className="overflow-hidden rounded-[3px] bg-paper text-ink-950">
      <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-600" />
          <span className="text-xs font-semibold">采购合同审查</span>
        </div>
        <span className="rounded-[2px] border border-paper-line px-2 py-0.5 font-mono text-[9px] opacity-60">
          REVIEW · 84%
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_13rem] xl:grid-cols-[7.5rem_1fr_14rem]">
        <aside className="hidden border-r border-paper-line p-3 xl:block">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-45">
            Clauses
          </p>
          <div className="mt-3 space-y-1.5 text-[10px]">
            {[
              ['第 1 条', '合同范围'],
              ['第 2 条', '交付与验收'],
              ['第 3 条', '付款方式'],
              ['第 4 条', '违约责任'],
              ['第 5 条', '争议解决'],
            ].map(([order, title], index) => (
              <div
                key={order}
                className={`rounded-[2px] px-2 py-1.5 ${
                  index === 2
                    ? 'bg-brand-500/10 font-medium text-brand-600'
                    : 'opacity-60'
                }`}
              >
                {order} · {title}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 border-paper-line p-4 md:border-r sm:p-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-45">
            Contract / Page 3
          </p>
          <h3 className="mt-3 text-base font-semibold">第三条 付款方式</h3>
          <p className="mt-3 text-xs leading-7 opacity-80">
            甲方应于收到乙方发票后
            <span className="mx-1 bg-risk-high/20 px-1 text-risk-high">
              120 个自然日
            </span>
            内支付全部合同价款。乙方不得因逾期付款暂停交付。
          </p>
          <p className="mt-4 border-l-2 border-risk-high pl-3 text-[11px] leading-6 text-risk-high">
            回款周期显著超过常见账期，且未约定逾期付款利息或救济措施。
          </p>
          <div className="mt-5 rounded-[3px] border border-paper-line bg-ink-950/[0.03] p-3">
            <p className="text-[10px] font-medium">建议修改</p>
            <p className="mt-1 text-[11px] leading-6 opacity-70">
              调整为验收后 30 日内付款，并增加逾期利息与暂停履行权。
            </p>
          </div>
        </div>

        <aside className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-45">
              Risk
            </span>
            <span className="font-mono text-[9px] opacity-45">7 items</span>
          </div>
          <div className="mt-3 space-y-2">
            <MiniRisk tone="high" title="付款周期过长" />
            <MiniRisk tone="medium" title="验收标准缺失" />
            <MiniRisk tone="low" title="通知方式未约定" />
          </div>
          <div className="mt-4 border-t border-paper-line pt-3">
            <p className="text-[9px] opacity-45">RISK SCORE</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-semibold">74</span>
              <span className="pb-1 text-[9px] opacity-50">/ 100</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-line">
              <div className="h-full w-[74%] bg-risk-medium" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniRisk({ tone, title }: { tone: 'high' | 'medium' | 'low'; title: string }) {
  return (
    <div className="rounded-[2px] border border-paper-line p-2">
      <StatusTag tone={tone} className="!text-[9px]">
        {tone === 'high' ? '高' : tone === 'medium' ? '中' : '低'}
      </StatusTag>
      <p className="mt-1.5 text-[10px] leading-4 opacity-70">{title}</p>
    </div>
  );
}
