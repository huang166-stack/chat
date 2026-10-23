'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { TechLink } from '@/components/common';
import { useAuthStore } from '@/lib/stores/auth-store';

const NAV_ITEMS = [
  { label: '首页', href: '/' },
  { label: '合同审查', href: '/#product' },
  { label: '合同问答', href: '/#capabilities' },
  { label: '定价', href: '/#pricing' },
  { label: '关于', href: '/#about' },
];

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const [menuOpen, setMenuOpen] = useState(false);

  const workspaceHref = user?.role === 'ADMIN' ? '/admin' : '/chat';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink-950/85 backdrop-blur-xl">
      <div className="marketing-container flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="合同审查助手首页">
          <span className="grid h-9 w-9 place-items-center rounded-[2px] border border-brand-500/50 bg-brand-500/10 font-mono text-xs font-semibold text-brand-400">
            CR
          </span>
          <span className="text-sm font-semibold tracking-wide sm:text-base">
            合同审查助手
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-copy-muted transition hover:text-copy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {mounted && user ? (
            <TechLink href={workspaceHref} size="sm">
              进入工作台
            </TechLink>
          ) : (
            <>
              <TechLink href="/login" variant="ghost" size="sm">
                登录
              </TechLink>
              <TechLink href="/register" size="sm">
                免费试用
              </TechLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] border border-line text-copy-muted transition hover:border-brand-500/50 hover:text-copy md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? '关闭导航' : '打开导航'}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {menuOpen ? (
              <path d="M5 5l14 14M19 5L5 19" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div id="mobile-navigation" className="border-t border-line bg-ink-900 px-5 py-5 md:hidden">
          <nav className="grid gap-1" aria-label="移动端主导航">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[2px] px-3 py-3 text-sm text-copy-muted transition hover:bg-brand-500/10 hover:text-copy"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-2 border-t border-line pt-4">
            {mounted && user ? (
              <TechLink href={workspaceHref} fullWidth size="sm" onClick={() => setMenuOpen(false)}>
                进入工作台
              </TechLink>
            ) : (
              <>
                <TechLink href="/login" variant="secondary" fullWidth size="sm" onClick={() => setMenuOpen(false)}>
                  登录
                </TechLink>
                <TechLink href="/register" fullWidth size="sm" onClick={() => setMenuOpen(false)}>
                  免费试用
                </TechLink>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
