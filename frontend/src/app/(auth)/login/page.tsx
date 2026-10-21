'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth-schema';
import { ApiError } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login(values.username, values.password);
      setSession(session);
      router.replace(session.user.role === 'ADMIN' ? '/admin' : '/chat');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '登录失败，请稍后重试';
      setError('root', { message });
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">登录</h1>
          <p className="mt-2 text-sm text-zinc-500">登录后开始大模型对话</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              用户名
            </label>
            <input
              id="username"
              autoComplete="username"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              {...register('username')}
            />
            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>

          {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          还没有账号？{' '}
          <Link className="font-medium text-blue-600 hover:underline" href="/register">
            立即注册
          </Link>
        </p>
      </div>
    </main>
  );
}
