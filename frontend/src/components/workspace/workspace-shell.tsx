'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { TechLink } from '@/components/common';
import { logout } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { QuotaMeter } from './quota-meter';

const NAV_ITEMS = [
  { label: '工作台', href: '/workspace', exact: true },
  { label: '上传合同', href: '/workspace/contracts/new' },
  { label: '会员与额度', href: '/membership' },
  { label: '通用对话', href: '/chat' },
];

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = pageTitle(pathname);
  const displayUser = mounted ? user : null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Local session still needs to be cleared when the server is unavailable.
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-ink-900 print:hidden lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/" className="flex items-center gap-3" aria-label="合同审查助手首页">
            <span className="grid h-9 w-9 place-items-center rounded-[2px] border border-brand-500/50 bg-brand-500/10 font-mono text-xs font-semibold text-brand-400">
              CR
            </span>
            <span className="text-sm font-semibold tracking-wide">合同审查助手</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="工作台导航">
          <p className="px-2 pb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-copy-subtle">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-[2px] px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-copy-muted hover:bg-ink-800 hover:text-copy'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-brand-400' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <p className="text-xs leading-5 text-copy-subtle">
            自动化结果不构成法律意见，重要合同请保留人工复核。
          </p>
          <TechLink href="/workspace/contracts/new" fullWidth size="sm" className="mt-4">
            上传新合同
          </TechLink>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm lg:hidden"
          aria-label="关闭导航"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-ink-900 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[2px] border border-brand-500/50 bg-brand-500/10 font-mono text-xs text-brand-400">
              CR
            </span>
            <span className="text-sm font-semibold">合同审查助手</span>
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-[2px] border border-line text-copy-muted"
            onClick={() => setMobileOpen(false)}
            aria-label="关闭导航"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="移动端工作台导航">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-[2px] px-3 py-3 text-sm transition ${
                  active ? 'bg-brand-500/10 text-brand-400' : 'text-copy-muted hover:bg-ink-800'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <TechLink href="/workspace/contracts/new" fullWidth size="sm" onClick={() => setMobileOpen(false)}>
            上传新合同
          </TechLink>
        </div>
      </aside>

      <div className="print:pl-0 lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-line bg-ink-950/85 backdrop-blur-xl print:hidden">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] border border-line text-copy-muted lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="打开导航"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-copy-subtle sm:block">
                  Contract Review Workspace
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              <div className="hidden sm:block">
                <QuotaMeter compact />
              </div>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[2px] border border-line px-2.5 py-2 text-xs text-copy-muted transition hover:border-brand-500/40 hover:text-copy">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500/10 font-mono text-[10px] text-brand-400">
                    {(displayUser?.username ?? 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-28 truncate sm:inline">{displayUser?.username ?? '当前账号'}</span>
                  <span aria-hidden="true">⌄</span>
                </summary>
                <div className="absolute right-0 mt-2 w-48 rounded-card border border-line bg-ink-800 p-2 shadow-lift">
                  <div className="border-b border-line px-3 py-2">
                    <p className="truncate text-sm font-medium">{displayUser?.username ?? '当前账号'}</p>
                    <p className="mt-0.5 text-[10px] text-copy-subtle">
                      {displayUser?.role === 'ADMIN' ? '管理员' : '普通用户'}
                    </p>
                  </div>
                  <Link href="/membership" className="mt-1 block rounded-[2px] px-3 py-2 text-sm text-copy-muted hover:bg-line hover:text-copy">
                    会员中心
                  </Link>
                  <Link href="/chat" className="block rounded-[2px] px-3 py-2 text-sm text-copy-muted hover:bg-line hover:text-copy">
                    通用对话
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 block w-full rounded-[2px] border-t border-line px-3 py-2 text-left text-sm text-risk-high hover:bg-risk-high/10"
                  >
                    退出登录
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}

function pageTitle(pathname: string) {
  if (pathname === '/workspace') return '工作台';
  if (pathname === '/workspace/contracts/new') return '上传合同';
  if (pathname.includes('/report')) return '审查报告';
  if (pathname.startsWith('/workspace/contracts/')) return '合同审查详情';
  if (pathname.startsWith('/membership')) return '会员与额度';
  if (pathname.startsWith('/chat')) return '通用对话';
  return '工作台';
}
