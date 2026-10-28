'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import { useAdminUsage } from '@/lib/hooks/use-admin';
import type { AdminUsageQuery, AdminUsageRow } from '@/types/admin';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '加载失败，请稍后重试';
}

export default function AdminUsagePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [month, setMonth] = useState(currentMonth());
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const query: AdminUsageQuery = {
    page,
    pageSize,
    month,
    keyword: submittedKeyword || undefined,
  };
  const usageQuery = useAdminUsage(query);
  const totals = usageQuery.data?.totals ?? {
    credits: 0,
    tokensIn: 0,
    tokensOut: 0,
    entries: 0,
  };

  const columns: TableProps<AdminUsageRow>['columns'] = [
    { title: '用户', dataIndex: 'username', key: 'username' },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (value: string | null) => value || '-',
    },
    {
      title: '审查额度消耗',
      dataIndex: 'credits',
      key: 'credits',
      render: (value: number) => `${value} 页`,
    },
    { title: '输入 Token', dataIndex: 'tokensIn', key: 'tokensIn' },
    { title: '输出 Token', dataIndex: 'tokensOut', key: 'tokensOut' },
    { title: '账本条目', dataIndex: 'entries', key: 'entries' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">用量统计</h2>
        <p className="text-sm text-zinc-500">按月份和用户聚合用量账本，统计数据直接读取 usage_ledger</p>
      </div>

      <Space wrap>
        <Input
          type="month"
          value={month}
          onChange={(event) => { setMonth(event.target.value); setPage(1); }}
          style={{ width: 170 }}
        />
        <Input
          allowClear
          placeholder="用户名"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}
          style={{ width: 180 }}
        />
        <Button type="primary" onClick={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}>
          搜索
        </Button>
        <Button
          onClick={() => {
            setKeyword('');
            setSubmittedKeyword('');
            setPage(1);
          }}
        >
          重置用户
        </Button>
      </Space>

      {usageQuery.isError && <Alert type="error" showIcon message={errorMessage(usageQuery.error)} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title={`${month} 审查额度`} value={totals.credits} suffix="页" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="输入 Token" value={totals.tokensIn} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="输出 Token" value={totals.tokensOut} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="账本条目" value={totals.entries} />
          </Card>
        </Col>
      </Row>

      <Typography.Text type="secondary">
        汇总与用户行均来自同一账本查询，额度消耗按 REVIEW 账本 credits 求和。
      </Typography.Text>

      <Table
        rowKey="userId"
        loading={usageQuery.isLoading}
        columns={columns}
        dataSource={usageQuery.data?.list ?? []}
        scroll={{ x: 760 }}
        pagination={{
          current: page,
          pageSize,
          total: usageQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />
    </div>
  );
}
