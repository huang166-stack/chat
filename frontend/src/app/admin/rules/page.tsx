'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { ApiError } from '@/lib/api/client';
import {
  useAdminRules,
  useCreateAdminRule,
  useUpdateAdminRule,
} from '@/lib/hooks/use-admin';
import { useReviewRuleSets } from '@/lib/hooks/use-rule-sets';
import { adminRuleSchema, type AdminRuleValues } from '@/lib/validation/admin-schema';
import type {
  AdminReviewRule,
  AdminReviewRuleQuery,
  AdminRiskLevel,
  AdminRuleType,
} from '@/types/admin';

const severityLabels: Record<AdminRiskLevel, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

const severityColors: Record<AdminRiskLevel, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'blue',
};

const ruleTypeLabels: Record<AdminRuleType, string> = {
  PRESENCE: '条款存在性',
  REGEX: '正则匹配',
  KEYWORD: '关键词',
  THRESHOLD: '数值阈值',
  LLM: '模型判断',
};

const defaultRuleConfigs: Record<AdminRuleType, Record<string, unknown>> = {
  PRESENCE: {
    match: { keywords: ['保密'], mode: 'ANY' },
    expect: 'PRESENT',
  },
  REGEX: {
    pattern: '赔偿.*上限',
    flags: 'i',
    expect: 'MATCH',
    scope: 'CLAUSE',
  },
  KEYWORD: {
    match: { keywords: ['自动续约'], mode: 'ANY' },
    expect: 'ABSENT',
  },
  THRESHOLD: {
    field: 'paymentDays',
    operator: '>',
    value: 60,
    unit: 'day',
  },
  LLM: {
    requiresStance: true,
    maxClauses: 10,
  },
};

const emptyRule: AdminRuleValues = {
  code: '',
  name: '',
  category: '',
  severity: 'MEDIUM',
  ruleType: 'PRESENCE',
  description: '',
  configJson: stringifyConfig(defaultRuleConfigs.PRESENCE),
  prompt: '',
  enabled: 1,
  version: 1,
  ruleSetId: '',
};

function stringifyConfig(config: unknown) {
  return JSON.stringify(config ?? {}, null, 2);
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

export default function AdminRulesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [ruleType, setRuleType] = useState<AdminRuleType | undefined>();
  const [enabled, setEnabled] = useState<number | undefined>();
  const [editingRule, setEditingRule] = useState<AdminReviewRule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const query: AdminReviewRuleQuery = {
    page,
    pageSize,
    keyword: submittedKeyword || undefined,
    ruleType,
    enabled,
  };
  const rulesQuery = useAdminRules(query);
  const ruleSetsQuery = useReviewRuleSets();
  const createRuleMutation = useCreateAdminRule();
  const updateRuleMutation = useUpdateAdminRule();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AdminRuleValues>({
    resolver: zodResolver(adminRuleSchema),
    defaultValues: emptyRule,
  });

  const openCreate = () => {
    setEditingRule(null);
    reset({
      ...emptyRule,
      ruleSetId: ruleSetsQuery.data?.[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const openEdit = (rule: AdminReviewRule) => {
    setEditingRule(rule);
    reset({
      code: rule.code,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      ruleType: rule.ruleType,
      description: rule.description ?? '',
      configJson: stringifyConfig(rule.configJson),
      prompt: rule.prompt ?? '',
      enabled: rule.enabled,
      version: rule.version,
      ruleSetId: '',
    });
    setModalOpen(true);
  };

  const submit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      code: values.code,
      name: values.name,
      category: values.category,
      severity: values.severity,
      ruleType: values.ruleType,
      description: values.description || undefined,
      configJson: JSON.parse(values.configJson) as Record<string, unknown>,
      prompt: values.prompt || undefined,
      enabled: values.enabled,
      version: values.version,
    };
    if (!editingRule && values.ruleSetId) {
      payload.ruleSetId = values.ruleSetId;
    }

    try {
      if (editingRule) {
        await updateRuleMutation.mutateAsync({ id: editingRule.id, data: payload });
        message.success('规则已更新，下一次审查立即生效');
      } else {
        await createRuleMutation.mutateAsync(payload);
        message.success(
          values.ruleSetId
            ? '规则已新增并加入规则集，下一次审查立即生效'
            : '规则已新增，请加入规则集后生效',
        );
      }
      setModalOpen(false);
    } catch (error) {
      message.error(errorMessage(error));
    }
  });

  const toggleEnabled = (rule: AdminReviewRule) => {
    updateRuleMutation.mutate(
      { id: rule.id, data: { enabled: rule.enabled === 1 ? 0 : 1 } },
      {
        onSuccess: () => message.success(rule.enabled === 1 ? '规则已停用' : '规则已启用，下一次审查立即生效'),
        onError: (error) => message.error(errorMessage(error)),
      },
    );
  };

  const columns: TableProps<AdminReviewRule>['columns'] = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 220 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 110 },
    {
      title: '风险',
      dataIndex: 'severity',
      key: 'severity',
      width: 90,
      render: (value: AdminRiskLevel) => <Tag color={severityColors[value]}>{severityLabels[value]}</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 110,
      render: (value: AdminRuleType) => ruleTypeLabels[value],
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70, render: (value: number) => `v${value}` },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (value: number) => <Tag color={value === 1 ? 'green' : 'default'}>{value === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: formatTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button
            size="small"
            danger={record.enabled === 1}
            onClick={() => toggleEnabled(record)}
            loading={updateRuleMutation.isPending}
          >
            {record.enabled === 1 ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">规则管理</h2>
          <p className="text-sm text-zinc-500">规则修改后无需重启服务，下一次审查任务直接读取最新配置</p>
        </div>
        <Button type="primary" onClick={openCreate}>新增规则</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          allowClear
          placeholder="规则编码或名称"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}
          style={{ width: 220 }}
        />
        <Select
          allowClear
          placeholder="规则类型"
          value={ruleType}
          onChange={(value) => { setRuleType(value); setPage(1); }}
          style={{ width: 160 }}
          options={Object.entries(ruleTypeLabels).map(([value, label]) => ({ value, label }))}
        />
        <Select
          allowClear
          placeholder="启用状态"
          value={enabled}
          onChange={(value) => { setEnabled(value); setPage(1); }}
          style={{ width: 130 }}
          options={[
            { value: 1, label: '启用' },
            { value: 0, label: '停用' },
          ]}
        />
        <Space>
          <Button type="primary" onClick={() => { setPage(1); setSubmittedKeyword(keyword.trim()); }}>搜索</Button>
          <Button
            onClick={() => {
              setKeyword('');
              setSubmittedKeyword('');
              setRuleType(undefined);
              setEnabled(undefined);
              setPage(1);
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      {rulesQuery.isError && <Alert type="error" showIcon message={errorMessage(rulesQuery.error)} />}

      <Table
        rowKey="id"
        loading={rulesQuery.isLoading}
        columns={columns}
        dataSource={rulesQuery.data?.list ?? []}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total: rulesQuery.data?.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 10);
        }}
      />

      <Modal
        title={editingRule ? '编辑规则' : '新增规则'}
        open={modalOpen}
        width={720}
        onOk={submit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createRuleMutation.isPending || updateRuleMutation.isPending}
        destroyOnHidden
      >
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-600">规则编码</label>
              <Controller
                control={control}
                name="code"
                render={({ field }) => <Input {...field} placeholder="MISSING_CLAUSE" />}
              />
              {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600">规则名称</label>
              <Controller
                control={control}
                name="name"
                render={({ field }) => <Input {...field} placeholder="例如：缺少验收标准" />}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-600">分类</label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => <Input {...field} placeholder="付款 / 保密" />}
              />
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600">风险等级</label>
              <Controller
                control={control}
                name="severity"
                render={({ field }) => (
                  <Select
                    {...field}
                    style={{ width: '100%' }}
                    options={Object.entries(severityLabels).map(([value, label]) => ({ value, label }))}
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-600">版本</label>
              <Controller
                control={control}
                name="version"
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
              {errors.version && <p className="mt-1 text-sm text-red-500">{errors.version.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-600">规则类型</label>
              <Controller
                control={control}
                name="ruleType"
                render={({ field }) => (
                  <Select
                    {...field}
                    style={{ width: '100%' }}
                    options={Object.entries(ruleTypeLabels).map(([value, label]) => ({ value, label }))}
                    onChange={(value: AdminRuleType) => {
                      field.onChange(value);
                      if (!editingRule) {
                        setValue('configJson', stringifyConfig(defaultRuleConfigs[value]), { shouldValidate: true });
                        if (value !== 'LLM') setValue('prompt', '');
                      }
                    }}
                  />
                )}
              />
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
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">说明</label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => <Input.TextArea {...field} rows={2} maxLength={500} />}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">规则配置 JSON</label>
            <Controller
              control={control}
              name="configJson"
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={10}
                  className="font-mono"
                  spellCheck={false}
                  placeholder={stringifyConfig(defaultRuleConfigs.PRESENCE)}
                />
              )}
            />
            <p className="mt-1 text-xs text-zinc-500">字段由规则类型决定，保存前会由后端按 Schema 严格校验。</p>
            {errors.configJson && <p className="mt-1 text-sm text-red-500">{errors.configJson.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">模型提示词（LLM 规则必填）</label>
            <Controller
              control={control}
              name="prompt"
              render={({ field }) => <Input.TextArea {...field} rows={3} maxLength={10000} />}
            />
            {errors.prompt && <p className="mt-1 text-sm text-red-500">{errors.prompt.message}</p>}
          </div>

          {!editingRule && (
            <div>
              <label className="mb-1 block text-sm text-zinc-600">加入规则集</label>
              <Controller
                control={control}
                name="ruleSetId"
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="暂不加入"
                    options={(ruleSetsQuery.data ?? []).map((ruleSet) => ({
                      value: ruleSet.id,
                      label: `${ruleSet.name} · v${ruleSet.version}`,
                    }))}
                  />
                )}
              />
              <p className="mt-1 text-xs text-zinc-500">加入启用的规则集后，下一次审查任务立即使用该规则。</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
