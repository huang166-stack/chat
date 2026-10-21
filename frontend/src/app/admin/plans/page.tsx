'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import {
  useAdminPlans,
  useCreateAdminPlan,
  useDeleteAdminPlan,
  useUpdateAdminPlan,
} from '@/lib/hooks/use-admin';
import { adminPlanSchema, type AdminPlanValues } from '@/lib/validation/admin-schema';
import type { AdminPlan } from '@/types/admin';

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

const durationLabels: Record<string, string> = {
  MONTH_1: '月度',
  MONTH_3: '季度',
  CUSTOM: '自定义',
};

const emptyPlan: AdminPlanValues = {
  name: '',
  price: 0,
  durationType: 'MONTH_1',
  durationDays: 30,
  description: '',
  enabled: 1,
  sort: 0,
};

export default function AdminPlansPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const plansQuery = useAdminPlans({ page, pageSize });
  const createPlanMutation = useCreateAdminPlan();
  const updatePlanMutation = useUpdateAdminPlan();
  const deletePlanMutation = useDeleteAdminPlan();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AdminPlanValues>({
    resolver: zodResolver(adminPlanSchema),
    defaultValues: emptyPlan,
  });

  const openCreate = () => {
    setEditingPlan(null);
    reset(emptyPlan);
    setModalOpen(true);
  };

  const openEdit = (plan: AdminPlan) => {
    setEditingPlan(plan);
    reset({
      name: plan.name,
      price: Number(plan.price),
      durationType: plan.durationType,
      durationDays: plan.durationDays,
      description: plan.description ?? '',
      enabled: plan.enabled,
      sort: plan.sort,
    });
    setModalOpen(true);
  };

  const submit = handleSubmit(async (values) => {
    try {
      if (editingPlan) {
        await updatePlanMutation.mutateAsync({ id: editingPlan.id, data: values });
        message.success('套餐已更新');
      } else {
        await createPlanMutation.mutateAsync(values);
        message.success('套餐已新增');
      }
      setModalOpen(false);
    } catch (error) {
      message.error(errorMessage(error));
    }
  });

  const columns: TableProps<AdminPlan>['columns'] = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: '类型',
      dataIndex: 'durationType',
      key: 'durationType',
      render: (value: string) => durationLabels[value] ?? value,
    },
    { title: '天数', dataIndex: 'durationDays', key: 'durationDays' },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: number) => <Tag color={enabled === 1 ? 'green' : 'default'}>{enabled === 1 ? '上架' : '下架'}</Tag>,
    },
    { title: '排序', dataIndex: 'sort', key: 'sort' },
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
            title={`确定删除套餐「${record.name}」吗？`}
            onConfirm={() =>
              deletePlanMutation.mutate(record.id, {
                onSuccess: () => message.success('套餐已删除'),
                onError: (error) => message.error(errorMessage(error)),
              })
            }
          >
            <Button size="small" danger loading={deletePlanMutation.isPending}>
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
          <h2 className="text-lg font-semibold">套餐管理</h2>
          <p className="text-sm text-zinc-500">用户端将实时展示启用套餐</p>
        </div>
        <Button type="primary" onClick={openCreate}>
          新增套餐
        </Button>
      </div>

      {plansQuery.isError && <Alert type="error" showIcon message={errorMessage(plansQuery.error)} />}

      <Table
        rowKey="id"
        loading={plansQuery.isLoading}
        columns={columns}
        dataSource={plansQuery.data?.list ?? []}
        pagination={{
          current: page,
          pageSize,
          total: plansQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />

      <Modal
        title={editingPlan ? '编辑套餐' : '新增套餐'}
        open={modalOpen}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm text-zinc-600">名称</label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => <Input {...field} placeholder="例如：月度会员" />}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-600">价格</label>
              <Controller
                control={control}
                name="price"
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    onChange={(value) => field.onChange(value ?? 0)}
                  />
                )}
              />
              {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600">有效期类型</label>
              <Controller
                control={control}
                name="durationType"
                render={({ field }) => (
                  <Select
                    {...field}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'MONTH_1', label: '月度' },
                      { value: 'MONTH_3', label: '季度' },
                      { value: 'CUSTOM', label: '自定义' },
                    ]}
                  />
                )}
              />
              {errors.durationType && <p className="mt-1 text-sm text-red-500">{errors.durationType.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-600">有效天数</label>
              <Controller
                control={control}
                name="durationDays"
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1}
                    precision={0}
                    style={{ width: '100%' }}
                    onChange={(value) => field.onChange(value ?? 1)}
                  />
                )}
              />
              {errors.durationDays && <p className="mt-1 text-sm text-red-500">{errors.durationDays.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600">排序</label>
              <Controller
                control={control}
                name="sort"
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    precision={0}
                    style={{ width: '100%' }}
                    onChange={(value) => field.onChange(value ?? 0)}
                  />
                )}
              />
              {errors.sort && <p className="mt-1 text-sm text-red-500">{errors.sort.message}</p>}
            </div>
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
                    { value: 1, label: '上架' },
                    { value: 0, label: '下架' },
                  ]}
                />
              )}
            />
            {errors.enabled && <p className="mt-1 text-sm text-red-500">{errors.enabled.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">说明</label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => <Input.TextArea rows={3} maxLength={500} {...field} />}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
