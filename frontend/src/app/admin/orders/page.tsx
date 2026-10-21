'use client';

import { useState } from 'react';
import { Alert, Button, Descriptions, Input, Modal, Select, Space, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import { useAdminOrders } from '@/lib/hooks/use-admin';
import type { AdminOrder } from '@/types/admin';
import type { OrderStatus } from '@/types/order';

const statusColors: Record<OrderStatus, string> = {
  CREATED: 'default',
  PENDING: 'processing',
  PAID: 'green',
  CLOSED: 'red',
  REFUNDED: 'orange',
};

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '加载失败，请稍后重试';
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderNo, setOrderNo] = useState('');
  const [submittedOrderNo, setSubmittedOrderNo] = useState('');
  const [username, setUsername] = useState('');
  const [submittedUsername, setSubmittedUsername] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);

  const ordersQuery = useAdminOrders({
    page,
    pageSize,
    orderNo: submittedOrderNo || undefined,
    username: submittedUsername || undefined,
    status: statusFilter,
  });

  const columns: TableProps<AdminOrder>['columns'] = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', ellipsis: true },
    { title: '用户', dataIndex: 'username', key: 'username' },
    { title: '套餐', dataIndex: 'planName', key: 'planName' },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    { title: '支付渠道', dataIndex: 'paymentConfigName', key: 'paymentConfigName', render: (value: string | null) => value || '-' },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (value: string | null) => (value ? new Date(value).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button size="small" onClick={() => setDetailOrder(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">订单管理</h2>
        <p className="text-sm text-zinc-500">查询订单、支付状态和会员发放信息</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          allowClear
          placeholder="订单号"
          value={orderNo}
          onChange={(event) => setOrderNo(event.target.value)}
          onPressEnter={() => { setPage(1); setSubmittedOrderNo(orderNo.trim()); }}
          style={{ width: 220 }}
        />
        <Input
          allowClear
          placeholder="用户名"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onPressEnter={() => { setPage(1); setSubmittedUsername(username.trim()); }}
          style={{ width: 180 }}
        />
        <Select
          allowClear
          placeholder="订单状态"
          value={statusFilter}
          onChange={(value) => { setStatusFilter(value); setPage(1); }}
          style={{ width: 150 }}
          options={['CREATED', 'PENDING', 'PAID', 'CLOSED', 'REFUNDED'].map((status) => ({
            value: status,
            label: status,
          }))}
        />
        <Space>
          <Button type="primary" onClick={() => { setPage(1); setSubmittedOrderNo(orderNo.trim()); setSubmittedUsername(username.trim()); }}>
            搜索
          </Button>
          <Button
            onClick={() => {
              setOrderNo('');
              setUsername('');
              setSubmittedOrderNo('');
              setSubmittedUsername('');
              setStatusFilter(undefined);
              setPage(1);
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      {ordersQuery.isError && <Alert type="error" showIcon message={errorMessage(ordersQuery.error)} />}

      <Table
        rowKey="orderNo"
        loading={ordersQuery.isLoading}
        columns={columns}
        dataSource={ordersQuery.data?.list ?? []}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total: ordersQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />

      <Modal open={Boolean(detailOrder)} title={`订单详情：${detailOrder?.orderNo ?? ''}`} footer={null} onCancel={() => setDetailOrder(null)}>
        {detailOrder && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="订单号">{detailOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="用户">{detailOrder.username}</Descriptions.Item>
            <Descriptions.Item label="套餐">{detailOrder.planName}</Descriptions.Item>
            <Descriptions.Item label="金额">¥{Number(detailOrder.amount).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusColors[detailOrder.status]}>{detailOrder.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="支付渠道">{detailOrder.paymentConfigName || '-'}</Descriptions.Item>
            <Descriptions.Item label="第三方流水号">{detailOrder.transactionNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="支付时间">{detailOrder.paidAt ? new Date(detailOrder.paidAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="会员到期">{detailOrder.expireAt ? new Date(detailOrder.expireAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(detailOrder.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
