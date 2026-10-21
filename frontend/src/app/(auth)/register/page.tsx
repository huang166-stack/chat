'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkUsername, register as registerApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth-schema';
import { ApiError } from '@/lib/api/client';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  const username = watch('username') ?? '';

  useEffect(() => {
    if (!/^[a-zA-Z0-9_]{4,32}$/.test(username)) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(username);
        setUsernameStatus(result.available ? 'available' : 'taken');
        setSuggestions(result.suggestions ?? []);
      } catch {
        setUsernameStatus('idle');
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const rollUsername = () => {
    const suggestion = suggestions[0] ?? `${username}_${Math.floor(Math.random() * 100000)}`;
    setValue('username', suggestion, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await registerApi(values.username, values.password, values.confirmPassword);
      setSession(session);
      router.replace('/chat');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '注册失败，请稍后重试';
      setError('root', { message });
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">注册</h1>
          <p className="mt-2 text-sm text-zinc-500">创建账号后即可登录使用</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              用户名
            </label>
            <div className="flex gap-2">
              <input
                id="username"
                autoComplete="username"
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                {...register('username')}
              />
              {usernameStatus === 'taken' && (
                <button
                  type="button"
                  onClick={rollUsername}
                  className="rounded-lg border border-zinc-300 px-3 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  title="随机换一个用户名"
                >
                  🎲
                </button>
              )}
            </div>
            {usernameStatus === 'checking' && <p className="mt-1 text-sm text-zinc-500">正在检查用户名...</p>}
            {usernameStatus === 'available' && <p className="mt-1 text-sm text-green-600">用户名可用</p>}
            {usernameStatus === 'taken' && <p className="mt-1 text-sm text-red-500">用户名已存在，试试骰子按钮</p>}
            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              确认密码
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          已有账号？{' '}
          <Link className="font-medium text-blue-600 hover:underline" href="/login">
            去登录
          </Link>
        </p>
      </div>
    </main>
  );
}
