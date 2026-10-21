'use client';

import { useState, type FormEvent } from 'react';
import { TechButton } from '@/components/common';
import { UploadDropzone } from '@/components/workspace/upload-dropzone';
import {
  uploadContract,
  type ContractStance,
  type ContractType,
  type UploadContractResult,
} from '@/lib/api/contracts';
import { ApiError } from '@/lib/api/client';

const CONTRACT_TYPE_OPTIONS: Array<{
  value: ContractType;
  label: string;
}> = [
  { value: 'SALES', label: '销售合同' },
  { value: 'PURCHASE', label: '采购合同' },
  { value: 'NDA', label: 'NDA' },
  { value: 'EMPLOYMENT', label: '劳动合同' },
  { value: 'LEASE', label: '租赁合同' },
  { value: 'SERVICE', label: '服务合同' },
  { value: 'OTHER', label: '其他' },
];

const STANCE_OPTIONS: Array<{
  value: ContractStance;
  label: string;
}> = [
  { value: 'PARTY_A', label: '甲方' },
  { value: 'PARTY_B', label: '乙方' },
  { value: 'NEUTRAL', label: '中立' },
];

const FIELD_CLASS =
  'w-full rounded-[2px] border border-line bg-ink-800 px-3 py-2.5 outline-none transition focus:border-brand-500';

export default function NewContractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [contractType, setContractType] = useState<ContractType>('SALES');
  const [stance, setStance] = useState<ContractStance>('NEUTRAL');
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadContractResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('请选择要上传的合同文件');
      return;
    }

    setIsUploading(true);
    try {
      const uploadResult = await uploadContract({
        file,
        name,
        contractType,
        stance,
      });
      setResult(uploadResult);
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
    <main className="min-h-screen tech-grid px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-7">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-400">
            Contract Intake
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-glow sm:text-4xl">
            上传合同
          </h1>
          <p className="mt-3 opacity-70">
            上传后将自动创建合同项目并排队解析。当前支持文本型 PDF 与 DOCX。
          </p>
        </header>

        <form
          className="product-frame bg-ink-900/90 p-5 sm:p-8"
          onSubmit={handleSubmit}
        >
          <UploadDropzone
            file={file}
            onFileChange={(nextFile) => {
              setFile(nextFile);
              setResult(null);
              setError('');
            }}
            onError={setError}
            disabled={isUploading}
          />

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-medium">合同名称</span>
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
              <span className="mb-2 block text-sm font-medium">合同类型</span>
              <select
                className={FIELD_CLASS}
                value={contractType}
                onChange={(event) =>
                  setContractType(event.target.value as ContractType)
                }
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
              <span className="mb-2 block text-sm font-medium">审查立场</span>
              <select
                className={FIELD_CLASS}
                value={stance}
                onChange={(event) =>
                  setStance(event.target.value as ContractStance)
                }
                disabled={isUploading}
              >
                {STANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs opacity-55">
              文件仅用于当前账号的合同审查，不会公开展示。
            </p>
            <TechButton type="submit" size="lg" disabled={isUploading || !file}>
              {isUploading ? '正在上传并创建项目...' : '上传合同'}
            </TechButton>
          </div>

          <div aria-live="polite">
            {error && (
              <p className="mt-5 rounded-[2px] border border-risk-high/40 bg-risk-high/10 px-4 py-3 text-sm text-risk-high">
                {error}
              </p>
            )}

            {result && (
              <section className="mt-5 rounded-[2px] border border-brand-500/40 bg-brand-500/10 px-4 py-4">
                <p className="font-medium text-brand-400">
                  {result.duplicate
                    ? '已检测到重复文件，已复用原有解析结果。'
                    : '上传成功，合同解析任务已排队。'}
                </p>
                <dl className="mt-3 grid gap-2 font-mono text-xs opacity-75 sm:grid-cols-2">
                  <div>
                    <dt className="opacity-60">PROJECT</dt>
                    <dd>{result.projectId}</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">DOCUMENT</dt>
                    <dd>{result.documentId}</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">PROJECT STATUS</dt>
                    <dd>{result.status}</dd>
                  </div>
                  <div>
                    <dt className="opacity-60">PARSE STATUS</dt>
                    <dd>{result.parseStatus}</dd>
                  </div>
                </dl>
              </section>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
