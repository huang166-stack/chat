'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

const DEFAULT_MAX_FILE_SIZE_MB = 20;
const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface UploadDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onError: (message: string) => void;
  maxFileSizeMb?: number;
  disabled?: boolean;
}

function validateFile(file: File, maxFileSizeMb: number): string | null {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const expectedMime = extension === '.pdf' ? PDF_MIME : DOCX_MIME;

  if (extension !== '.pdf' && extension !== '.docx') {
    return '仅支持 PDF 或 DOCX 格式的合同文件';
  }

  if (file.size > maxFileSizeMb * 1024 * 1024) {
    return `合同文件不能超过 ${maxFileSizeMb}MB`;
  }

  if (
    file.type &&
    file.type !== expectedMime &&
    file.type !== 'application/octet-stream'
  ) {
    return '文件类型与扩展名不匹配';
  }

  return null;
}

function formatFileSize(size: number): string {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function UploadDropzone({
  file,
  onFileChange,
  onError,
  maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
  disabled = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFile = (candidate: File | undefined) => {
    if (!candidate) return;

    const validationError = validateFile(candidate, maxFileSizeMb);
    if (validationError) {
      onFileChange(null);
      onError(validationError);
      return;
    }

    onError('');
    onFileChange(candidate);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      selectFile(event.dataTransfer.files?.[0]);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[2px] border border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-line-strong bg-ink-800/60 hover:border-brand-500/70'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className="font-mono text-xs uppercase tracking-[0.28em] text-brand-400">
          File Intake
        </span>
        <span className="mt-4 text-lg font-medium">
          拖拽合同到这里，或点击选择文件
        </span>
        <span className="mt-2 text-sm opacity-65">
          支持文本型 PDF / DOCX，单个文件不超过 {maxFileSizeMb}MB
        </span>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-[2px] border border-line bg-ink-800 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="mt-1 font-mono text-xs opacity-60">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-sm text-risk-high transition hover:opacity-80 disabled:opacity-50"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onFileChange(null);
            }}
          >
            移除
          </button>
        </div>
      )}
    </div>
  );
}
