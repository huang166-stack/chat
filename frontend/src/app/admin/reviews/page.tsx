'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import { useAdminReviews, useRetryAdminReview } from '@/lib/hooks/use-admin';
import type {
  AdminReviewQuery,
  AdminReviewStatus,
  AdminReviewTask,
} from '@/types/admin';

const statusLabels: Record<AdminReviewStatus, string> = {
  PENDING: '排队中',
  PARSING: '解析中',
  RULE_CHECK: '规则审查',
  MODEL_REVIEW: '模型审查',
  AGGREGATING: '结果汇总',
  SUCCESS: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
};

const statusColors: Record<AdminReviewStatus, string> = {
  PENDING: 'default',
  PARSING: 'processing',
  RULE_CHECK: 'processing',
  MODEL_REVIEW: 'processing',
  AGGREGATING: 'processing',
  SUCCESS: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
};

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

function formatDuration(value: number | null) {
  if (value === null) return '-';
  if (value < 1000) return '< 1 秒';
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒`;
}

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-';
}

export default function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [status, setStatus] = useState<AdminReviewStatus | undefined>();

  const query: AdminReviewQuery = {
    page,
    pageSize,
    keyword: submittedKeyword || undefined,
    status,
  };
  const reviewsQuery = useAdminReviews(query);
  const retryMutation = useRetryAdminReview();

  const retry = (task: AdminReviewTask) => {
    retryMutation.mutate(task.id, {
      onSuccess: () => message.success(`任务 #${task.id} 已重新进入队列`),
      onError: (error) => message.error(errorMessage(error)),
    });
  };

  const columns: TableProps<AdminReviewTask>['columns'] = [
    {
      title: '任务',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (value: string) => `#${value}`,
    },
    {
      title: '合同',
      key: 'contract',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.projectName}</span>
          <Typography.Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
            {record.filename}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '用户', dataIndex: 'username', key: 'username', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: AdminReviewStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag>,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 130,
      render: (value: number) => <Progress percent={value} size="small" />,
    },
    { title: '风险数', dataIndex: 'findingCount', key: 'findingCount', width: 90 },
    {
      title: '规则集',
      key: 'ruleSet',
      width: 180,
      render: (_, record) =>
        record.ruleSetName
          ? `${record.ruleSetName}${record.ruleSetVersion ? ` · v${record.ruleSetVersion}` : ''}`
          : '-',
    },
    { title: '模型', dataIndex: 'modelName', key: 'modelName', width: 140, render: (value: string | null) => value || '-' },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: formatDuration,
    },
    {
      title: '失败原因',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 220,
      render: (value: string | null) =>
        value ? (
          <Tooltip title={value}>
            <Typography.Text type="danger" ellipsis style={{ maxWidth: 200 }}>
              {value}
            </Typography.Text>
          </Tooltip>
        ) : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: formatTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) =>
        record.canRetry ? (
          <Button
            size="small"
            type="primary"
            loading={retryMutation.isPending}
            onClick={() => retry(record)}
          >
            重试
          </Button>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">审查任务监控</h2>
        <p className="text-sm text-zinc-500">查看处理阶段、任务耗时和失败原因，失败或取消任务可直接重试</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          allowClear
          placeholder="合同名称或用户名"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}
          style={{ width: 240 }}
        />
        <Select
          allowClear
          placeholder="任务状态"
          value={status}
          onChange={(value) => { setStatus(value); setPage(1); }}
          style={{ width: 160 }}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
        />
        <Space>
          <Button type="primary" onClick={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}>搜索</Button>
          <Button
            onClick={() => {
              setKeyword('');
              setSubmittedKeyword('');
              setStatus(undefined);
              setPage(1);
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      {reviewsQuery.isError && <Alert type="error" showIcon message={errorMessage(reviewsQuery.error)} />}

      <Table
        rowKey="id"
        loading={reviewsQuery.isLoading}
        columns={columns}
        dataSource={reviewsQuery.data?.list ?? []}
        scroll={{ x: 1650 }}
        pagination={{
          current: page,
          pageSize,
          total: reviewsQuery.data?.total ?? 0,
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
