import { SectionTitle, StatusTag, TechCard, TechLink } from '@/components/common';
import { Reveal } from './reveal';

const PLANS = [
  {
    name: '月度会员',
    price: '19.9',
    cycle: '30 天',
    quota: '20 页审查额度',
    pages: '单份合同最多 30 页',
    file: '单文件最大 20 MB',
    href: '/membership',
    featured: false,
  },
  {
    name: '季度会员',
    price: '49.9',
    cycle: '90 天',
    quota: '80 页审查额度',
    pages: '单份合同最多 60 页',
    file: '单文件最大 30 MB',
    href: '/membership',
    featured: true,
  },
  {
    name: '年度会员',
    price: '99.9',
    cycle: '365 天',
    quota: '400 页审查额度',
    pages: '单份合同最多 100 页',
    file: '单文件最大 50 MB',
    href: '/membership',
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="site-grid border-b border-line">
      <div className="marketing-container py-20 md:py-24 xl:py-28">
        <Reveal>
          <SectionTitle
            align="center"
            eyebrow="Pricing / Start with a review"
            title="先完成一次审查，再选择适合的额度"
            description="注册账号即可体验基础审查额度。需要持续处理合同时，可在会员中心购买套餐。"
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 70}>
              <TechCard
                accent={plan.featured}
                className={`relative flex h-full flex-col p-6 md:p-7 ${
                  plan.featured ? 'bg-ink-800 shadow-glow' : ''
                }`}
              >
                {plan.featured ? (
                  <div className="absolute right-5 top-5">
                    <StatusTag tone="success">推荐</StatusTag>
                  </div>
                ) : null}

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copy-subtle">
                  {plan.cycle}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{plan.name}</h3>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-[-0.04em]">¥{plan.price}</span>
                  <span className="pb-1 text-xs text-copy-subtle">/ {plan.cycle}</span>
                </div>
                <p className="mt-2 text-sm text-brand-400">{plan.quota}</p>

                <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-5 text-sm text-copy-muted">
                  <PlanItem>{plan.pages}</PlanItem>
                  <PlanItem>{plan.file}</PlanItem>
                  <PlanItem>风险清单、条款定位与合同问答</PlanItem>
                  <PlanItem>DOCX 审查报告导出</PlanItem>
                </ul>

                <TechLink
                  href={plan.href}
                  variant={plan.featured ? 'primary' : 'secondary'}
                  fullWidth
                  className="mt-7"
                >
                  {plan.featured ? '升级季度会员' : `选择${plan.name}`}
                </TechLink>
              </TechCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <div className="mt-8 flex flex-col gap-4 border border-line bg-ink-900/60 px-5 py-4 text-sm text-copy-muted sm:flex-row sm:items-center sm:justify-between">
            <p>价格与额度以会员中心实际显示为准，自动化结果不构成法律意见。</p>
            <TechLink href="/register" variant="ghost" size="sm">
              免费注册体验
            </TechLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PlanItem({ children }: { children: string }) {
  return (
    <li className="flex gap-2.5 leading-6">
      <span className="mt-[10px] h-px w-3 shrink-0 bg-brand-500" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
