'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import {
  CreditCardOutlined,
  DashboardOutlined,
  GiftOutlined,
  LogoutOutlined,
  ProfileOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { logout } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/admin/plans', icon: <GiftOutlined />, label: '套餐管理' },
  { key: '/admin/models', icon: <RobotOutlined />, label: '模型管理' },
  { key: '/admin/payments', icon: <CreditCardOutlined />, label: '支付管理' },
  { key: '/admin/orders', icon: <ProfileOutlined />, label: '订单管理' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/chat');
    }
  }, [ready, router, user]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

  if (!ready || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        正在验证管理员权限...
      </div>
    );
  }

  return (
    <Layout className="min-h-screen">
      <Sider breakpoint="lg" collapsedWidth="0" className="!bg-zinc-950">
        <div className="flex h-14 items-center gap-2 px-5">
          <div className="h-7 w-7 rounded-lg bg-blue-600" />
          <span className="truncate text-sm font-semibold text-white">对话系统后台</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>

      <Layout>
        <Header className="flex h-14 items-center justify-between bg-white px-5 shadow-sm">
          <Typography.Text strong>管理后台</Typography.Text>
          <Space>
            <span className="text-sm text-zinc-500">{user.username}</span>
            <Link href="/chat" className="text-sm text-blue-600 hover:underline">
              返回对话
            </Link>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </Space>
        </Header>
        <Content className="p-5">{children}</Content>
      </Layout>
    </Layout>
  );
}
