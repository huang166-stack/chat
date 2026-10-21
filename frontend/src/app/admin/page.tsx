'use client';

import { Alert, Card, Col, Row, Spin, Statistic } from 'antd';
import { useAdminDashboard } from '@/lib/hooks/use-admin';

export default function AdminDashboardPage() {
  const dashboardQuery = useAdminDashboard();

  if (dashboardQuery.isLoading) {
    return <Spin size="large" />;
  }

  if (dashboardQuery.isError) {
    return <Alert type="error" showIcon message="统计数据加载失败" description={String(dashboardQuery.error)} />;
  }

  const stats = dashboardQuery.data!;

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="用户数" value={stats.userCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="会员数" value={stats.memberCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="订单数" value={stats.orderCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日支付金额" value={stats.todayPaidAmount} precision={2} prefix="¥" />
          </Card>
        </Col>
      </Row>

      <Card>
        <Statistic title="累计支付金额" value={stats.paidAmount} precision={2} prefix="¥" />
      </Card>
    </div>
  );
}
