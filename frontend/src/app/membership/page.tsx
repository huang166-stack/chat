'use client';

import { ApiError } from '@/lib/api/client';
import { useCreateOrder, useMemberPlans, useMembership } from '@/lib/hooks/use-membership';

export default function MembershipPage() {
  const plansQuery = useMemberPlans();
  const membershipQuery = useMembership();
  const createOrderMutation = useCreateOrder();

  const handlePurchase = (planId: string) => {
    createOrderMutation.mutate(planId, {
      onSuccess: (order) => {
        window.location.href = order.payUrl;
      },
    });
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">会员中心</h1>
          <p className="mt-2 text-zinc-500">选择适合你的套餐，解锁合同审查、风险定位与报告导出</p>
        </div>

        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">当前会员状态</h2>
          {membershipQuery.isLoading && <p className="mt-3 text-sm text-zinc-500">正在加载会员状态...</p>}
          {membershipQuery.data && (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className={membershipQuery.data.isMember ? 'text-green-600' : 'text-red-500'}>
                {membershipQuery.data.isMember ? '会员有效' : '暂未开通会员'}
              </span>
              {membershipQuery.data.expireAt && (
                <span className="text-zinc-600 dark:text-zinc-300">
                  到期时间：{new Date(membershipQuery.data.expireAt).toLocaleString('zh-CN')}
                </span>
              )}
            </div>
          )}
        </section>

        {plansQuery.isLoading && <p className="text-sm text-zinc-500">正在加载套餐...</p>}
        {plansQuery.isError && <p className="text-sm text-red-500">套餐加载失败，请稍后重试</p>}

        <section className="grid gap-5 md:grid-cols-3">
          {plansQuery.data?.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
              <p className="mt-4 text-3xl font-semibold text-blue-600">
                ¥{Number(plan.price).toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">有效期 {plan.durationDays} 天</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                每月 {plan.reviewQuota} 页审查额度 · 单份合同最多 {plan.maxContractPages} 页 · 单文件最大 {plan.maxFileSizeMb} MB
              </p>
              <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {plan.description || '暂无说明'}
              </p>
              <button
                type="button"
                disabled={createOrderMutation.isPending}
                onClick={() => handlePurchase(plan.id)}
                className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createOrderMutation.isPending ? '正在创建订单...' : '立即充值'}
              </button>
            </article>
          ))}
        </section>

        {createOrderMutation.isError && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {createOrderMutation.error instanceof ApiError
              ? createOrderMutation.error.message
              : '创建订单失败，请稍后重试'}
          </p>
        )}
      </div>
    </main>
  );
}
