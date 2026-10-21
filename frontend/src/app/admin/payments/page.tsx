'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import {
  useAdminPayments,
  useCreateAdminPayment,
  useDeleteAdminPayment,
  useUpdateAdminPayment,
} from '@/lib/hooks/use-admin';
import { adminPaymentSchema, type AdminPaymentValues } from '@/lib/validation/admin-schema';
import type { AdminPaymentConfig } from '@/types/admin';

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

const emptyPayment: AdminPaymentValues = {
  name: '',
  provider: '',
  merchantId: '',
  appId: '',
  appSecret: '',
  apiKey: '',
  gatewayUrl: '',
  notifyUrl: '',
  returnUrl: '',
  enabled: 1,
};

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingPayment, setEditingPayment] = useState<AdminPaymentConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const paymentsQuery = useAdminPayments({ page, pageSize });
  const createPaymentMutation = useCreateAdminPayment();
  const updatePaymentMutation = useUpdateAdminPayment();
  const deletePaymentMutation = useDeleteAdminPayment();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AdminPaymentValues>({
    resolver: zodResolver(adminPaymentSchema),
    defaultValues: emptyPayment,
  });

  const openCreate = () => {
    setEditingPayment(null);
    reset(emptyPayment);
    setModalOpen(true);
  };

  const openEdit = (payment: AdminPaymentConfig) => {
    setEditingPayment(payment);
    reset({
      name: payment.name,
      provider: payment.provider,
      merchantId: payment.merchantId ?? '',
      appId: payment.appId ?? '',
      appSecret: '',
      apiKey: '',
      gatewayUrl: payment.gatewayUrl ?? '',
      notifyUrl: payment.notifyUrl ?? '',
      returnUrl: payment.returnUrl ?? '',
      enabled: payment.enabled,
    });
    setModalOpen(true);
  };

  const submit = handleSubmit(async (values) => {
    try {
      if (editingPayment) {
        await updatePaymentMutation.mutateAsync({ id: editingPayment.id, data: values });
        message.success('支付配置已更新');
      } else {
        await createPaymentMutation.mutateAsync(values);
        message.success('支付配置已新增');
      }
      setModalOpen(false);
    } catch (error) {
      message.error(errorMessage(error));
    }
  });

  const columns: TableProps<AdminPaymentConfig>['columns'] = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '渠道标识', dataIndex: 'provider', key: 'provider' },
    { title: '商户号', dataIndex: 'merchantId', key: 'merchantId', render: (value: string | null) => value || '-' },
    { title: 'App ID', dataIndex: 'appId', key: 'appId', render: (value: string | null) => value || '-' },
    {
      title: 'App Secret',
      dataIndex: 'hasAppSecret',
      key: 'hasAppSecret',
      render: (has: boolean) => <Tag color={has ? 'green' : 'default'}>{has ? '已配置' : '未配置'}</Tag>,
    },
    {
      title: 'API Key',
      dataIndex: 'hasApiKey',
      key: 'hasApiKey',
      render: (has: boolean) => <Tag color={has ? 'green' : 'default'}>{has ? '已配置' : '未配置'}</Tag>,
    },
    { title: '网关地址', dataIndex: 'gatewayUrl', key: 'gatewayUrl', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: number) => <Tag color={enabled === 1 ? 'green' : 'default'}>{enabled === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title={`确定删除支付渠道「${record.name}」吗？`}
            onConfirm={() =>
              deletePaymentMutation.mutate(record.id, {
                onSuccess: () => message.success('支付配置已删除'),
                onError: (error) => message.error(errorMessage(error)),
              })
            }
          >
            <Button size="small" danger loading={deletePaymentMutation.isPending}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h2 className="text-lg font-semibold">支付管理</h2>
          <p className="text-sm text-zinc-500">密钥仅显示是否已配置，不返回明文</p>
        </div>
        <Button type="primary" onClick={openCreate}>
          新增支付渠道
        </Button>
      </div>

      {paymentsQuery.isError && <Alert type="error" showIcon message={errorMessage(paymentsQuery.error)} />}

      <Table
        rowKey="id"
        loading={paymentsQuery.isLoading}
        columns={columns}
        dataSource={paymentsQuery.data?.list ?? []}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total: paymentsQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />

      <Modal
        title={editingPayment ? '编辑支付渠道' : '新增支付渠道'}
        open={modalOpen}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createPaymentMutation.isPending || updatePaymentMutation.isPending}
        destroyOnClose
        width={760}
      >
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-zinc-600">名称</label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => <Input {...field} placeholder="默认支付渠道" />}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">渠道标识</label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => <Input {...field} placeholder="playoffer" />}
            />
            {errors.provider && <p className="mt-1 text-sm text-red-500">{errors.provider.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">商户号</label>
            <Controller
              control={control}
              name="merchantId"
              render={({ field }) => <Input {...field} />}
            />
            {errors.merchantId && <p className="mt-1 text-sm text-red-500">{errors.merchantId.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">App ID</label>
            <Controller
              control={control}
              name="appId"
              render={({ field }) => <Input {...field} />}
            />
            {errors.appId && <p className="mt-1 text-sm text-red-500">{errors.appId.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">App Secret</label>
            <Controller
              control={control}
              name="appSecret"
              render={({ field }) => (
                <Input.Password
                  {...field}
                  placeholder={editingPayment ? '留空表示保持原值' : '可选'}
                  autoComplete="new-password"
                />
              )}
            />
            {errors.appSecret && <p className="mt-1 text-sm text-red-500">{errors.appSecret.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">API Key</label>
            <Controller
              control={control}
              name="apiKey"
              render={({ field }) => (
                <Input.Password
                  {...field}
                  placeholder={editingPayment ? '留空表示保持原值' : '可选'}
                  autoComplete="new-password"
                />
              )}
            />
            {errors.apiKey && <p className="mt-1 text-sm text-red-500">{errors.apiKey.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-zinc-600">网关地址</label>
            <Controller
              control={control}
              name="gatewayUrl"
              render={({ field }) => <Input {...field} placeholder="https://pay.playoffer.cn" />}
            />
            {errors.gatewayUrl && <p className="mt-1 text-sm text-red-500">{errors.gatewayUrl.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-zinc-600">回调地址</label>
            <Controller
              control={control}
              name="notifyUrl"
              render={({ field }) => <Input {...field} placeholder="https://your-domain.com/api/payment/callback" />}
            />
            {errors.notifyUrl && <p className="mt-1 text-sm text-red-500">{errors.notifyUrl.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-zinc-600">返回地址</label>
            <Controller
              control={control}
              name="returnUrl"
              render={({ field }) => <Input {...field} placeholder="https://your-domain.com/payment/result" />}
            />
            {errors.returnUrl && <p className="mt-1 text-sm text-red-500">{errors.returnUrl.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">状态</label>
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: '100%' }}
                  options={[
                    { value: 1, label: '启用' },
                    { value: 0, label: '停用' },
                  ]}
                />
              )}
            />
            {errors.enabled && <p className="mt-1 text-sm text-red-500">{errors.enabled.message}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
