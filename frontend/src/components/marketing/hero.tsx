import { StatusTag, TechLink } from '@/components/common';
import { Reveal } from './reveal';

export function Hero() {
  return (
    <section className="site-grid relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-32 top-0 h-[34rem] w-[34rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-[26rem] w-[26rem] rounded-full bg-info-500/5 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
      </div>

      <div className="marketing-container relative py-16 md:py-24 xl:py-28">
        <div className="grid items-center gap-14 xl:grid-cols-[1.08fr_.92fr]">
          <Reveal>
            <div className="inline-flex items-center gap-3 rounded-full border border-brand-500/30 bg-brand-500/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              AI Contract Intelligence
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.12] tracking-[-0.03em] sm:text-5xl lg:text-6xl xl:text-7xl">
              让每一份合同，
              <span className="block text-brand-400 text-glow">
                都能被快速看懂
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-copy-muted md:text-lg">
              上传合同，AI 自动识别风险条款，给出可执行的修改建议，并生成包含
              条款定位、处理状态与免责声明的审查报告。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TechLink href="/register" size="lg">
                免费试用
              </TechLink>
              <TechLink href="#product" variant="secondary" size="lg">
                查看产品演示
              </TechLink>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <StatusTag tone="success">文本型 PDF / DOCX</StatusTag>
              <StatusTag tone="info">条款级定位</StatusTag>
              <StatusTag tone="neutral">数据隔离</StatusTag>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6">
              <Metric value="4 类" label="核心审查能力" />
              <Metric value="Top 8" label="问答上下文条款" />
              <Metric value="5 分钟" label="报告签名有效期" />
            </dl>
          </Reveal>

          <Reveal delay={140} className="hidden xl:block">
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-xs text-copy-subtle">{label}</dt>
      <dd className="mt-1 font-mono text-lg text-copy">{value}</dd>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[31rem]">
      <div className="absolute inset-[7%] rounded-full border border-line-strong" />
      <div className="absolute inset-[19%] rounded-full border border-brand-500/25" />
      <div className="absolute inset-[33%] rounded-full border border-dashed border-line-strong" />
      <div className="absolute inset-[27%] rounded-full bg-brand-500/10 blur-3xl" />

      <div className="absolute left-2 top-[20%] w-52 rounded-card border border-line bg-ink-900/90 p-4 shadow-lift backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-copy-subtle">
          Clause Scan
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-medium">付款条款</span>
          <StatusTag tone="high">高风险</StatusTag>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full w-[78%] bg-risk-high" />
        </div>
        <p className="mt-3 text-xs leading-5 text-copy-muted">
          付款周期过长，且未约定逾期利息。
        </p>
      </div>

      <div className="absolute bottom-[14%] right-0 w-60 rounded-card border border-brand-500/35 bg-ink-900/95 p-4 shadow-glow backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400">
            Evidence
          </p>
          <span className="font-mono text-[10px] text-copy-subtle">03 / 12</span>
        </div>
        <p className="mt-3 text-sm leading-6">
          “甲方应在收到发票后
          <span className="mx-1 bg-risk-high/15 px-1 text-risk-high">
            120 日
          </span>
          内支付。”
        </p>
        <div className="mt-3 border-t border-line pt-3 text-xs text-copy-muted">
          已定位到第 5 条 · 第 3 页
        </div>
      </div>

      <div className="absolute right-[23%] top-[7%] rounded-full border border-line bg-ink-900/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-copy-muted backdrop-blur">
        Explainable
      </div>
      <div className="absolute bottom-[8%] left-[27%] h-2 w-2 rounded-full bg-brand-400 shadow-glow" />
    </div>
  );
}
