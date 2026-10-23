'use client';

import { TechButton } from '@/components/common/tech-button';
import type { ReviewReportStatus } from '@/lib/api/reports';

export interface ReportActionsProps {
  status: ReviewReportStatus | null;
  generating: boolean;
  downloading: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export function ReportActions({
  status,
  generating,
  downloading,
  onGenerate,
  onDownload,
  onPrint,
}: ReportActionsProps) {
  const active = status === 'PENDING' || status === 'PROCESSING';

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      {status === 'SUCCESS' ? (
        <>
          <TechButton onClick={onDownload} disabled={downloading}>
            {downloading ? '正在获取下载链接...' : '下载 DOCX'}
          </TechButton>
          <TechButton variant="secondary" onClick={onPrint}>
            打印 / 导出 PDF
          </TechButton>
        </>
      ) : (
        <TechButton onClick={onGenerate} disabled={generating || active}>
          {generating || active
            ? '报告生成中...'
            : status === 'FAILED'
              ? '重新生成报告'
              : '生成审查报告'}
        </TechButton>
      )}
    </div>
  );
}
