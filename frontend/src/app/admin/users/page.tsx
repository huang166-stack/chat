'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import { useAdminUsers, useDisableAdminUser, useUpdateAdminUser } from '@/lib/hooks/use-admin';
import { adminUserEditSchema, type AdminUserEditValues } from '@/lib/validation/admin-schema';
import type { AdminUser } from '@/types/admin';
import type { UserRole } from '@/types/auth';

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const usersQuery = useAdminUsers({
    page,
    pageSize,
    keyword: submittedKeyword || undefined,
    role: roleFilter,
    status: statusFilter,
  });
  const updateUserMutation = useUpdateAdminUser();
  const disableUserMutation = useDisableAdminUser();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AdminUserEditValues>({
    resolver: zodResolver(adminUserEditSchema),
    defaultValues: { role: 'USER', status: 1 },
  });

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    reset({ role: user.role, status: user.status });
  };

  const submitEdit = handleSubmit(async (values) => {
    if (!editingUser) return;
    try {
      await updateUserMutation.mutateAsync({ id: editingUser.id, data: values });
      message.success('用户已更新');
      setEditingUser(null);
    } catch (error) {
      message.error(errorMessage(error));
    }
  });

  const columns: TableProps<AdminUser>['columns'] = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (value: string | null) => value || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => <Tag color={role === 'ADMIN' ? 'blue' : 'default'}>{role}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '正常' : '已禁用'}</Tag>,
    },
    {
      title: '会员到期',
      dataIndex: 'membershipExpireAt',
      key: 'membershipExpireAt',
      render: (value: string | null) =>
        value ? new Date(value).toLocaleString('zh-CN') : '未开通',
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          {record.status === 1 ? (
            <Popconfirm
              title={`确定禁用用户「${record.username}」吗？`}
              onConfirm={() =>
                disableUserMutation.mutate(record.id, {
                  onSuccess: () => message.success('用户已禁用'),
                  onError: (error) => message.error(errorMessage(error)),
                })
              }
            >
              <Button size="small" danger loading={disableUserMutation.isPending}>
                禁用
              </Button>
            </Popconfirm>
          ) : (
            <Button
              size="small"
              type="primary"
              onClick={() =>
                updateUserMutation.mutate(
                  { id: record.id, data: { status: 1 } },
                  {
                    onSuccess: () => message.success('用户已启用'),
                    onError: (error) => message.error(errorMessage(error)),
                  },
                )
              }
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          allowClear
          placeholder="搜索用户名或昵称"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={() => {
            setPage(1);
            setSubmittedKeyword(keyword.trim());
          }}
          style={{ width: 240 }}
        />
        <Select
          allowClear
          placeholder="角色"
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
          style={{ width: 120 }}
          options={[
            { value: 'USER', label: 'USER' },
            { value: 'ADMIN', label: 'ADMIN' },
          ]}
        />
        <Select
          allowClear
          placeholder="状态"
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          style={{ width: 120 }}
          options={[
            { value: 1, label: '正常' },
            { value: 0, label: '已禁用' },
          ]}
        />
        <Button type="primary" onClick={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}>
          搜索
        </Button>
        <Button
          onClick={() => {
            setKeyword('');
            setSubmittedKeyword('');
            setRoleFilter(undefined);
            setStatusFilter(undefined);
            setPage(1);
          }}
        >
          重置
        </Button>
      </div>

      {usersQuery.isError && <Alert type="error" showIcon message={errorMessage(usersQuery.error)} />}

      <Table
        rowKey="id"
        loading={usersQuery.isLoading}
        columns={columns}
        dataSource={usersQuery.data?.list ?? []}
        pagination={{
          current: page,
          pageSize,
          total: usersQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />

      <Modal
        title={`编辑用户：${editingUser?.username ?? ''}`}
        open={Boolean(editingUser)}
        onOk={submitEdit}
        onCancel={() => setEditingUser(null)}
        confirmLoading={updateUserMutation.isPending}
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm text-zinc-600">角色</label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'USER', label: '普通用户' },
                    { value: 'ADMIN', label: '管理员' },
                  ]}
                />
              )}
            />
            {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">状态</label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: '100%' }}
                  options={[
                    { value: 1, label: '正常' },
                    { value: 0, label: '禁用' },
                  ]}
                />
              )}
            />
            {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
