import Link from 'next/link';
import { SectionTitle, StatusTag, TechCard, TechLink } from '@/components/common';
import { Reveal } from './reveal';

const SCENARIOS = [
  {
    index: '01',
    title: 'NDA 与保密协议',
    description: '关注保密范围、期限、例外情形与违约救济，避免授权过宽。',
    tag: '保密边界',
  },
  {
    index: '02',
    title: '销售与采购合同',
    description: '优先检查交付验收、付款周期、责任上限与单方解除条件。',
    tag: '交易条款',
  },
  {
    index: '03',
    title: '劳动合同',
    description: '识别试用期、竞业限制、加班与解除补偿等劳动用工风险。',
    tag: '用工风险',
  },
  {
    index: '04',
    title: '房屋租赁合同',
    description: '核对押金退还、维修责任、转租限制与提前解约安排。',
    tag: '履约安排',
  },
  {
    index: '05',
    title: '服务与外包合同',
    description: '检查服务标准、知识产权归属、数据安全与验收争议。',
    tag: '服务交付',
  },
];

export function Scenarios() {
  return (
    <section id="scenarios" className="border-b border-line bg-ink-950">
      <div className="marketing-container py-20 md:py-24 xl:py-28">
        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow="Scenarios / Built around real contracts"
              title="从常见合同开始，逐步形成自己的审查标准"
              description="先覆盖高频合同类型，再通过规则集、立场与提示词持续校准团队自己的审查口径。"
            />
            <TechLink href="/register" variant="secondary" size="sm">
              创建审查账号
            </TechLink>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {SCENARIOS.map((scenario) => (
              <Link
                key={scenario.index}
                href="/register"
                className="block h-full"
                aria-label={`开始审查${scenario.title}`}
              >
                <TechCard interactive className="group flex h-full flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-brand-400">
                      {scenario.index}
                    </span>
                    <span className="text-copy-subtle transition group-hover:text-brand-400" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                  <h3 className="mt-7 text-base font-semibold leading-6">{scenario.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-copy-muted">
                    {scenario.description}
                  </p>
                  <div className="mt-5 border-t border-line pt-4">
                    <StatusTag tone="neutral">{scenario.tag}</StatusTag>
                  </div>
                </TechCard>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
