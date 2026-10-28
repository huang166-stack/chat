'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { StatusTag, TechButton, TechCard, TechLink } from '@/components/common';
import { UploadDropzone } from '@/components/workspace/upload-dropzone';
import {
  uploadContract,
  type ContractStance,
  type ContractType,
} from '@/lib/api/contracts';
import { ApiError } from '@/lib/api/client';
import { useReviewRuleSets } from '@/lib/hooks/use-rule-sets';

const CONTRACT_TYPE_OPTIONS: Array<{ value: ContractType; label: string }> = [
  { value: 'SALES', label: '销售合同' },
  { value: 'PURCHASE', label: '采购合同' },
  { value: 'NDA', label: 'NDA' },
  { value: 'EMPLOYMENT', label: '劳动合同' },
  { value: 'LEASE', label: '租赁合同' },
  { value: 'SERVICE', label: '服务合同' },
  { value: 'OTHER', label: '其他' },
];

const STANCE_OPTIONS: Array<{ value: ContractStance; label: string }> = [
  { value: 'PARTY_A', label: '甲方' },
  { value: 'PARTY_B', label: '乙方' },
  { value: 'NEUTRAL', label: '中立' },
];

const FIELD_CLASS =
  'h-11 w-full rounded-[2px] border border-line-strong bg-ink-950/70 px-3 text-sm text-copy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export default function NewContractPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [contractType, setContractType] = useState<ContractType>('SALES');
  const [stance, setStance] = useState<ContractStance>('NEUTRAL');
  const [ruleSetId, setRuleSetId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const ruleSetsQuery = useReviewRuleSets(contractType, stance);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!file) {
      setError('请选择要上传的合同文件');
      return;
    }
    if (!confirmed) {
      setError('请确认已了解自动化结果不构成法律意见');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadContract({ file, name, contractType, stance });
      const params = new URLSearchParams();
      if (ruleSetId) params.set('ruleSetId', ruleSetId);
      const query = params.toString();
      router.push(`/workspace/contracts/${result.projectId}${query ? `?${query}` : ''}`);
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiError
          ? uploadError.message
          : '合同上传失败，请稍后重试',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 xl:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand-400">
            Contract Intake / New
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">上传合同</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-copy-muted">
            选择合同类型、审查立场与规则集。上传后先解析条款，不会自动扣减审查额度。
          </p>
        </div>
        <TechLink href="/workspace" variant="secondary" size="sm">
          返回工作台
        </TechLink>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <TechCard className="p-5 sm:p-7">
          <form onSubmit={handleSubmit} noValidate>
            <UploadDropzone
              file={file}
              onFileChange={(nextFile) => {
                setFile(nextFile);
                setError('');
              }}
              onError={setError}
              disabled={isUploading}
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-copy-muted">合同名称</span>
                <input
                  className={FIELD_CLASS}
                  value={name}
                  maxLength={128}
                  placeholder="留空时使用文件名"
                  onChange={(event) => setName(event.target.value)}
                  disabled={isUploading}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-copy-muted">合同类型</span>
                <select
                  className={FIELD_CLASS}
                  value={contractType}
                  onChange={(event) => {
                    setContractType(event.target.value as ContractType);
                    setRuleSetId('');
                  }}
                  disabled={isUploading}
                >
                  {CONTRACT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-copy-muted">审查立场</span>
                <select
                  className={FIELD_CLASS}
                  value={stance}
                  onChange={(event) => {
                    setStance(event.target.value as ContractStance);
                    setRuleSetId('');
                  }}
                  disabled={isUploading}
                >
                  {STANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium text-copy-muted">
                  <span>审查规则集</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-copy-subtle">
                    {ruleSetsQuery.isLoading ? 'Loading' : `${ruleSetsQuery.data?.length ?? 0} available`}
                  </span>
                </span>
                <select
                  className={FIELD_CLASS}
                  value={ruleSetId}
                  onChange={(event) => setRuleSetId(event.target.value)}
                  disabled={isUploading || ruleSetsQuery.isLoading}
                >
                  <option value="">自动匹配（推荐）</option>
                  {ruleSetsQuery.data?.map((ruleSet) => (
                    <option key={ruleSet.id} value={ruleSet.id}>
                      {ruleSet.name} · v{ruleSet.version} · {ruleSet.ruleCount} 条规则
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs leading-5 text-copy-subtle">
                  未手动选择时，系统按合同类型与审查立场自动匹配规则集。
                </span>
              </label>
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 border-t border-line pt-5 text-sm leading-6 text-copy-muted">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={isUploading}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
              />
              <span>我已确认自动化审查结果不构成正式法律意见，重要合同仍需人工复核。</span>
            </label>

            {error ? (
              <p role="alert" className="mt-5 border border-risk-high/35 bg-risk-high/10 px-4 py-3 text-sm text-risk-high">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-copy-subtle">
                支持文本型 PDF / DOCX，单个文件不超过 20MB。
              </p>
              <TechButton type="submit" size="lg" disabled={isUploading || !file || !confirmed}>
                {isUploading ? '正在上传...' : '上传并继续'}
              </TechButton>
            </div>
          </form>
        </TechCard>

        <aside className="space-y-3">
          <TechCard accent className="p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand-400">Before review</p>
            <h2 className="mt-3 text-base font-semibold">上传后还需要一步</h2>
            <p className="mt-2 text-sm leading-7 text-copy-muted">
              文件会先进入解析队列。解析完成后，在详情页点击“开始审查”才会扣减额度并创建审查任务。
            </p>
          </TechCard>

          <TechCard className="p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-copy-subtle">Data handling</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusTag tone="success">按账号隔离</StatusTag>
              <StatusTag tone="info">短期下载链接</StatusTag>
            </div>
            <p className="mt-3 text-xs leading-6 text-copy-subtle">
              合同文件与审查结果仅用于当前账号的审查流程，不会公开展示。
            </p>
          </TechCard>

          <TechCard className="p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-copy-subtle">Supported</p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-copy-muted">
              <li>文本型 PDF</li>
              <li>DOCX 文档</li>
              <li>扫描件暂不支持 OCR</li>
            </ul>
          </TechCard>
        </aside>
      </div>
    </div>
  );
}
