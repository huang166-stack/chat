import { Suspense } from 'react';
import { ReviewPageClient } from '@/components/review/review-page-client';

export default async function ContractReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="p-8 text-sm text-copy-muted">正在加载合同...</div>}>
      <ReviewPageClient contractId={id} />
    </Suspense>
  );
}
