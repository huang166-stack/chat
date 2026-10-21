'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import {
  useAdminModels,
  useCreateAdminModel,
  useDeleteAdminModel,
  useUpdateAdminModel,
} from '@/lib/hooks/use-admin';
import { adminModelSchema, type AdminModelValues } from '@/lib/validation/admin-schema';
import type { AdminModelConfig } from '@/types/admin';

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

const emptyModel: AdminModelValues = {
  name: '',
  provider: 'OPENAI_COMPATIBLE',
  baseUrl: '',
  apiKey: '',
  modelName: '',
  maxTokens: 2048,
  temperature: 0.7,
  enabled: 1,
  sort: 0,
};

export default function AdminModelsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingModel, setEditingModel] = useState<AdminModelConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const modelsQuery = useAdminModels({ page, pageSize });
  const createModelMutation = useCreateAdminModel();
  const updateModelMutation = useUpdateAdminModel();
  const deleteModelMutation = useDeleteAdminModel();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AdminModelValues>({
    resolver: zodResolver(adminModelSchema),
    defaultValues: emptyModel,
  });

  const openCreate = () => {
    setEditingModel(null);
    reset(emptyModel);
    setModalOpen(true);
  };

  const openEdit = (model: AdminModelConfig) => {
    setEditingModel(model);
    reset({
      name: model.name,
      provider: model.provider,
      baseUrl: model.baseUrl,
      apiKey: '',
      modelName: model.modelName,
      maxTokens: model.maxTokens,
      temperature: Number(model.temperature),
      enabled: model.enabled,
      sort: model.sort,
    });
    setModalOpen(true);
  };

  const submit = handleSubmit(async (values) => {
    try {
      if (editingModel) {
        await updateModelMutation.mutateAsync({ id: editingModel.id, data: values });
        message.success('模型配置已更新');
      } else {
        await createModelMutation.mutateAsync(values);
        message.success('模型配置已新增');
      }
      setModalOpen(false);
    } catch (error) {
      message.error(errorMessage(error));
    }
  });

  const columns: TableProps<AdminModelConfig>['columns'] = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => <Tag>{provider}</Tag>,
    },
    { title: 'Base URL', dataIndex: 'baseUrl', key: 'baseUrl', ellipsis: true },
    {
      title: 'API Key',
      dataIndex: 'hasApiKey',
      key: 'hasApiKey',
      render: (hasApiKey: boolean) => <Tag color={hasApiKey ? 'green' : 'default'}>{hasApiKey ? '已配置' : '未配置'}</Tag>,
    },
    { title: '实际模型名', dataIndex: 'modelName', key: 'modelName' },
    { title: 'Max Tokens', dataIndex: 'maxTokens', key: 'maxTokens' },
    { title: '温度', dataIndex: 'temperature', key: 'temperature' },
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
            title={`确定删除模型「${record.name}」吗？`}
            onConfirm={() =>
              deleteModelMutation.mutate(record.id, {
                onSuccess: () => message.success('模型配置已删除'),
                onError: (error) => message.error(errorMessage(error)),
              })
            }
          >
            <Button size="small" danger loading={deleteModelMutation.isPending}>
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
          <h2 className="text-lg font-semibold">模型管理</h2>
          <p className="text-sm text-zinc-500">用户端仅展示启用模型，不返回 API Key</p>
        </div>
        <Button type="primary" onClick={openCreate}>
          新增模型
        </Button>
      </div>

      {modelsQuery.isError && <Alert type="error" showIcon message={errorMessage(modelsQuery.error)} />}

      <Table
        rowKey="id"
        loading={modelsQuery.isLoading}
        columns={columns}
        dataSource={modelsQuery.data?.list ?? []}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total: modelsQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />

      <Modal
        title={editingModel ? '编辑模型' : '新增模型'}
        open={modalOpen}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createModelMutation.isPending || updateModelMutation.isPending}
        destroyOnClose
        width={720}
      >
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-zinc-600">名称</label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => <Input {...field} placeholder="展示名称" />}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">类型</label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'OPENAI_COMPATIBLE', label: 'OpenAI Compatible' },
                    { value: 'CUSTOM', label: 'Custom' },
                  ]}
                />
              )}
            />
            {errors.provider && <p className="mt-1 text-sm text-red-500">{errors.provider.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-zinc-600">Base URL</label>
            <Controller
              control={control}
              name="baseUrl"
              render={({ field }) => <Input {...field} placeholder="https://api.openai.com/v1" />}
            />
            {errors.baseUrl && <p className="mt-1 text-sm text-red-500">{errors.baseUrl.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-zinc-600">API Key</label>
            <Controller
              control={control}
              name="apiKey"
              render={({ field }) => (
                <Input.Password
                  {...field}
                  placeholder={editingModel ? '留空表示保持原 Key' : '可选'}
                  autoComplete="new-password"
                />
              )}
            />
            {errors.apiKey && <p className="mt-1 text-sm text-red-500">{errors.apiKey.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">实际模型名</label>
            <Controller
              control={control}
              name="modelName"
              render={({ field }) => <Input {...field} placeholder="gpt-4o-mini" />}
            />
            {errors.modelName && <p className="mt-1 text-sm text-red-500">{errors.modelName.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">最大 Token</label>
            <Controller
              control={control}
              name="maxTokens"
              render={({ field }) => (
                <InputNumber
                  {...field}
                  min={1}
                  precision={0}
                  style={{ width: '100%' }}
                  onChange={(value) => field.onChange(value ?? 2048)}
                />
              )}
            />
            {errors.maxTokens && <p className="mt-1 text-sm text-red-500">{errors.maxTokens.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">温度</label>
            <Controller
              control={control}
              name="temperature"
              render={({ field }) => (
                <InputNumber
                  {...field}
                  min={0}
                  max={2}
                  step={0.1}
                  style={{ width: '100%' }}
                  onChange={(value) => field.onChange(value ?? 0.7)}
                />
              )}
            />
            {errors.temperature && <p className="mt-1 text-sm text-red-500">{errors.temperature.message}</p>}
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
