import Link from 'next/link';
import type { ReactNode } from 'react';
import { StatusTag, TechCard, TechLink } from '@/components/common';

export const authInputClassName =
  'h-11 w-full rounded-[2px] border border-line-strong bg-ink-950/75 px-3 text-sm text-copy outline-none transition placeholder:text-copy-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const STEPS = [
  ['01', '上传合同', '解析文本与条款'],
  ['02', '规则预审', '标记明显风险'],
  ['03', '模型审查', '给出修改建议'],
  ['04', '导出报告', '保留审查轨迹'],
];

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="site-grid relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-40 top-10 h-[32rem] w-[32rem] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -left-48 bottom-0 h-[24rem] w-[24rem] rounded-full bg-info-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[80rem] flex-col px-5 md:px-8">
        <header className="flex h-[72px] items-center justify-between border-b border-line">
          <Link href="/" className="flex items-center gap-3" aria-label="合同审查助手首页">
            <span className="grid h-9 w-9 place-items-center rounded-[2px] border border-brand-500/50 bg-brand-500/10 font-mono text-xs font-semibold text-brand-400">
              CR
            </span>
            <span className="text-sm font-semibold tracking-wide sm:text-base">合同审查助手</span>
          </Link>
          <TechLink href="/" variant="ghost" size="sm">
            返回首页
          </TechLink>
        </header>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-16">
          <section className="hidden max-w-2xl lg:block">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
              Secure review workspace
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.12] tracking-[-0.035em] xl:text-6xl">
              把合同风险，
              <span className="block text-brand-400 text-glow">放回原文里。</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-copy-muted">
              登录后进入合同审查工作台。上传、预审、条款定位与报告导出，共用同一条可追溯的处理链路。
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <StatusTag tone="success">按用户隔离</StatusTag>
              <StatusTag tone="info">条款级证据</StatusTag>
              <StatusTag tone="neutral">可审计报告</StatusTag>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-2 border-l border-t border-line">
              {STEPS.map(([index, stepTitle, stepDescription]) => (
                <div key={index} className="border-b border-r border-line p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-brand-400">{index}</p>
                  <p className="mt-3 text-sm font-medium">{stepTitle}</p>
                  <p className="mt-1 text-xs text-copy-subtle">{stepDescription}</p>
                </div>
              ))}
            </div>
          </section>

          <TechCard className="mx-auto w-full max-w-[400px] p-6 shadow-lift sm:p-8 lg:mx-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand-400">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-copy-muted">{description}</p>

            <div className="mt-8">{children}</div>

            <div className="mt-6 border-t border-line pt-5 text-center text-sm text-copy-muted">
              {footer}
            </div>
          </TechCard>
        </div>

        <footer className="flex flex-col gap-2 border-t border-line py-5 text-[11px] text-copy-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 合同审查助手</p>
          <p>自动化结果不构成法律意见</p>
        </footer>
      </div>
    </main>
  );
}
