'use client';

import Link from 'next/link';
import { ProductFrame } from '@/components/marketing/product-frame';
import {
  EmptyState,
  SectionTitle,
  StatusTag,
  TechButton,
  type StatusTone,
} from '@/components/common';

const palette = [
  { name: 'ink-950', value: '#050606', className: 'bg-ink-950' },
  { name: 'ink-900', value: '#0B0C0C', className: 'bg-ink-900' },
  { name: 'ink-800', value: '#121414', className: 'bg-ink-800' },
  { name: 'ink-600', value: '#232828', className: 'bg-ink-600' },
  { name: 'brand-500', value: '#00CCAB', className: 'bg-brand-500' },
  { name: 'brand-400', value: '#2AD9BC', className: 'bg-brand-400' },
  { name: 'brand-300', value: '#73F2DC', className: 'bg-brand-300' },
  { name: 'copy', value: '#F5F7F7', className: 'bg-copy' },
  { name: 'paper', value: '#F7F9F9', className: 'bg-paper' },
  { name: 'risk-high', value: '#F56C6C', className: 'bg-risk-high' },
  { name: 'risk-medium', value: '#E6A23C', className: 'bg-risk-medium' },
];

const tones: StatusTone[] = ['high', 'medium', 'low', 'success', 'info', 'neutral', 'processing'];

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-ink-950 px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <header className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-brand-400">
            Contract AI / Design
          </span>
          <Link href="/" className="text-sm text-copy-muted transition hover:text-brand-400">
            返回首页
          </Link>
        </header>

        <section className="tech-grid relative overflow-hidden rounded-card border border-line px-8 py-12">
          <SectionTitle
            eyebrow="Design System v1"
            title="合同审查助手 · 视觉基线"
            description="深色科技底、青绿色主色、细网格与浅色纸面。本页用于走查设计令牌与基础组件，后续页面只允许使用这里的颜色、字号与间距。"
          />
          <div className="mt-8 flex flex-wrap gap-4">
            <TechButton>免费试用</TechButton>
            <TechButton variant="secondary">查看示例报告</TechButton>
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow="Palette" title="色彩" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {palette.map((color) => (
              <div key={color.name} className="overflow-hidden rounded-card border border-line bg-ink-800">
                <div className={`h-20 ${color.className}`} />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-copy">{color.name}</span>
                  <span className="font-mono text-xs text-copy-subtle">{color.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow="Typography" title="排版" />
          <div className="rounded-card border border-line bg-ink-800 p-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-400">Contract Review</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-copy md:text-5xl">
              让每一份合同，都能被快速看懂
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-copy-muted md:text-base">
              上传合同，自动识别风险条款，给出可执行的修改建议，并生成可交付的审查报告。中文正文使用苹方或微软雅黑，英文与数字使用 Inter。
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow="Actions" title="按钮" />
          <div className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-ink-800 p-8">
            <TechButton>免费试用</TechButton>
            <TechButton variant="secondary">查看详情</TechButton>
            <TechButton variant="ghost">了解更多</TechButton>
            <TechButton variant="danger">删除合同</TechButton>
            <TechButton disabled>不可用</TechButton>
            <TechButton size="sm">小号按钮</TechButton>
            <TechButton size="lg">大号按钮</TechButton>
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow="Status" title="状态标签" />
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-ink-800 p-8">
            {tones.map((tone) => (
              <StatusTag key={tone} tone={tone} />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow="Workspace" title="深色外壳 + 浅色纸面" />
          <ProductFrame label="Design system preview">
            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <div className="rounded bg-paper p-6 text-ink-950">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-950/50">
                  Contract Preview
                </p>
                <h3 className="mt-2 text-lg font-bold">房屋租赁合同</h3>
                <p className="mt-4 text-xs leading-6 text-ink-950/80">
                  第五条 付款方式：甲方应在收到发票后 120 日内支付全部价款。
                  <span className="ml-1 bg-risk-high/20 px-1 text-risk-high">
                    付款周期超过 90 天且无逾期利息。
                  </span>
                </p>
                <p className="mt-3 text-xs leading-6 text-ink-950/80">
                  第六条 违约责任：任何一方违约，应赔偿对方因此遭受的全部损失。
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded border border-line bg-ink-800 p-3">
                  <StatusTag tone="high">高风险 · 付款</StatusTag>
                  <p className="mt-2 text-xs leading-5 text-copy-muted">
                    回款周期过长，且未约定逾期付款责任。
                  </p>
                </div>
                <div className="rounded border border-line bg-ink-800 p-3">
                  <StatusTag tone="medium">中风险 · 责任</StatusTag>
                  <p className="mt-2 text-xs leading-5 text-copy-muted">
                    未约定赔偿责任上限，存在无限责任风险。
                  </p>
                </div>
              </div>
            </div>
          </ProductFrame>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow="Empty" title="空状态" />
          <EmptyState
            title="还没有合同"
            description="上传第一份合同，开始自动审查。"
            action={<TechButton>上传合同</TechButton>}
          />
        </section>

        <footer className="border-t border-line pt-6 text-xs text-copy-subtle">
          第十步交付：官网首页、深色认证页、营销区块与 ProductFrame。工作台样式将在第十一步铺开。
        </footer>
      </div>
    </main>
  );
}
