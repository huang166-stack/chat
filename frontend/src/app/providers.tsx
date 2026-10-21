'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ThemeConfig } from 'antd';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const fontFamily = 'Inter, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';

const userTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#00CCAB',
    colorInfo: '#1C6DFF',
    colorSuccess: '#00CCAB',
    colorWarning: '#E6A23C',
    colorError: '#F56C6C',
    colorBgBase: '#0B0C0C',
    colorBgContainer: '#121414',
    colorBgElevated: '#1A1D1D',
    colorBorder: 'rgba(255,255,255,0.12)',
    colorBorderSecondary: 'rgba(255,255,255,0.08)',
    colorText: '#F5F7F7',
    colorTextSecondary: '#A3ABAB',
    colorTextTertiary: '#6E7777',
    borderRadius: 4,
    fontFamily,
    controlHeight: 40,
  },
  components: {
    Button: {
      controlHeight: 44,
      borderRadius: 2,
    },
    Card: {
      borderRadiusLG: 6,
    },
    Table: {
      headerBg: '#0F1111',
      rowHoverBg: 'rgba(0,204,171,0.06)',
    },
  },
};

const adminTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#00BFAF',
    borderRadius: 4,
    fontFamily,
  },
};

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={isAdmin ? adminTheme : userTheme}>
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
}