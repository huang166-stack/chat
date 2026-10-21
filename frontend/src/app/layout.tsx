import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: '合同审查助手',
  description: '上传合同，自动识别风险条款并生成可导出的审查报告',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col bg-ink-950 text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}