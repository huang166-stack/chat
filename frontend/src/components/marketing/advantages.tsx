import { SectionTitle, StatusTag, TechCard } from '@/components/common';
import { Reveal } from './reveal';

const ADVANTAGES = [
  {
    index: '01',
    title: '可解释',
    description: '不只告诉你“有风险”，还说明风险来自哪条约定、为什么触发，以及建议如何修改。',
    meta: '原因 + 依据',
  },
  {
    index: '02',
    title: '可定位',
    description: '风险清单与合同纸面双向联动，点击结论即可回到对应条款和页码。',
    meta: '条款 + 页码',
  },
  {
    index: '03',
    title: '可审计',
    description: '报告保留生成时快照、处理状态与免责声明，方便复核、流转和归档。',
    meta: '快照 + 轨迹',
  },
  {
    index: '04',
    title: '可计费',
    description: '按页数额度与模型用量记录成本，任务失败不重复扣减，套餐边界清晰。',
    meta: '页数 + token',
  },
];

export function Advantages() {
  return (
    <section id="about" className="border-b border-line bg-ink-900">
      <div className="marketing-container py-20 md:py-24 xl:py-28">
        <div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <Reveal>
            <SectionTitle
              eyebrow="Why it works / Trust by design"
              title="让 AI 的结论，经得起一次复核"
              description="合同审查不是生成一段漂亮文字，而是交付一个可以被业务、法务与管理者共同核对的判断过程。"
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusTag tone="success">人工可复核</StatusTag>
              <StatusTag tone="info">数据按用户隔离</StatusTag>
            </div>
            <blockquote className="mt-10 border-l border-brand-500 pl-5">
              <p className="text-lg leading-8 text-copy">
                “先让每一个结论都能回到原文，再谈自动化。”
              </p>
              <footer className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-subtle">
                Product principle / 01
              </footer>
            </blockquote>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            {ADVANTAGES.map((advantage, index) => (
              <Reveal key={advantage.index} delay={index * 60}>
                <TechCard accent className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-brand-400">
                      {advantage.index}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-copy-subtle">
                      {advantage.meta}
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold">{advantage.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-copy-muted">
                    {advantage.description}
                  </p>
                </TechCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
