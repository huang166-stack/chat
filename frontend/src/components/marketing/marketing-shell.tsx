import type { ReactNode } from 'react';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-ink-950">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
