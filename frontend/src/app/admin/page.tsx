'use client';

import { Alert, Card, Col, Row, Spin, Statistic, Typography } from 'antd';
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

      <Card title={`最近 ${stats.monitoring.windowDays} 天审查监控`}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='任务成功率' value={stats.monitoring.successRate} precision={2} suffix='%' />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='成功任务平均耗时'
              value={stats.monitoring.averageDurationSeconds}
              precision={1}
              suffix='秒'
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='失败任务'
              value={stats.monitoring.reviewFailed}
              suffix={`/ ${stats.monitoring.reviewTotal}`}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='模型成本估算'
              value={stats.monitoring.estimatedModelCost}
              precision={4}
              prefix='¥'
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='输入 Token' value={stats.monitoring.tokensIn} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='输出 Token' value={stats.monitoring.tokensOut} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='模型调用记录' value={stats.monitoring.modelCallCount} suffix='条' />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='进行中 / 已取消'
              value={stats.monitoring.reviewActive}
              suffix={`/ ${stats.monitoring.reviewCancelled}`}
            />
          </Col>
        </Row>
        {!stats.monitoring.pricingConfigured && (
          <Typography.Paragraph type='secondary' className='!mb-0 !mt-4'>
            未配置模型单价，成本估算显示为 0。请设置
            MODEL_COST_INPUT_PER_MILLION_TOKENS 与 MODEL_COST_OUTPUT_PER_MILLION_TOKENS。
          </Typography.Paragraph>
        )}
      </Card>
    </div>
  );
}
