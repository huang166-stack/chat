'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { useMembership, useOrder } from '@/lib/hooks/use-membership';

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('orderNo');
  const queryClient = useQueryClient();
  const orderQuery = useOrder(orderNo);
  const membershipQuery = useMembership();

  useEffect(() => {
    if (orderQuery.data?.status === 'PAID') {
      queryClient.invalidateQueries({ queryKey: ['membership'] });
    }
  }, [orderQuery.data?.status, queryClient]);

  if (!orderNo) {
    return <StatusCard title="参数错误" message="缺少订单号，请返回会员中心重新发起支付。" />;
  }

  if (orderQuery.isLoading) {
    return <StatusCard title="正在查询订单" message="请稍候..." />;
  }

  if (orderQuery.isError) {
    const message = orderQuery.error instanceof ApiError ? orderQuery.error.message : '订单查询失败';
    return <StatusCard title="订单查询失败" message={message} />;
  }

  if (orderQuery.data?.status === 'PAID') {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm dark:border-green-900 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-green-600">支付成功</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">订单号：{orderQuery.data.orderNo}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">支付金额：¥{Number(orderQuery.data.amount).toFixed(2)}</p>
        {membershipQuery.data?.expireAt && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            会员到期时间：{new Date(membershipQuery.data.expireAt).toLocaleString('zh-CN')}
          </p>
        )}
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
        >
          开始对话
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">等待支付结果</h1>
      <p className="mt-3 text-sm text-zinc-500">订单号：{orderQuery.data?.orderNo ?? orderNo}</p>
      <button
        type="button"
        onClick={() => orderQuery.refetch()}
        className="mt-6 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        刷新状态
      </button>
    </div>
  );
}

function StatusCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
      <p className="mt-3 text-sm text-zinc-500">{message}</p>
      <Link
        href="/membership"
        className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
      >
        返回会员中心
      </Link>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={<StatusCard title="加载中" message="正在读取支付参数..." />}>
        <PaymentReturnContent />
      </Suspense>
    </main>
  );
}
