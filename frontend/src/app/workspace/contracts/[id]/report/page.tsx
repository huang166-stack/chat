import { ReportPageClient } from '@/components/report/report-page-client';

export default async function ContractReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportPageClient contractId={id} />;
}
