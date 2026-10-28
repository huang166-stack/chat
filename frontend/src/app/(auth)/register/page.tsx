'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell, authInputClassName } from '@/components/auth/auth-shell';
import { TechButton } from '@/components/common';
import { checkUsername, register as registerApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth-schema';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

interface UsernameLookup {
  username: string;
  status: UsernameStatus;
  suggestions: string[];
}

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [lookup, setLookup] = useState<UsernameLookup>({
    username: '',
    status: 'idle',
    suggestions: [],
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  const username = useWatch({ control, name: 'username' }) ?? '';
  const isUsernameValid = /^[a-zA-Z0-9_]{4,32}$/.test(username);
  const usernameStatus: UsernameStatus = !isUsernameValid
    ? 'idle'
    : lookup.username === username
      ? lookup.status
      : 'checking';
  const suggestions = lookup.username === username ? lookup.suggestions : [];

  useEffect(() => {
    if (!isUsernameValid) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(username);
        if (!cancelled) {
          setLookup({
            username,
            status: result.available ? 'available' : 'taken',
            suggestions: result.suggestions ?? [],
          });
        }
      } catch {
        if (!cancelled) {
          setLookup({ username, status: 'idle', suggestions: [] });
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isUsernameValid, username]);

  const rollUsername = () => {
    const suggestion = suggestions[0] ?? `${username}_${Math.floor(Math.random() * 100000)}`;
    setValue('username', suggestion, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await registerApi(values.username, values.password, values.confirmPassword);
      setSession(session);
      router.replace('/workspace');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '注册失败，请稍后重试';
      setError('root', { message });
    }
  });

  return (
    <AuthShell
      eyebrow="Create account"
      title="创建审查账号"
      description="注册后即可开始第一份合同审查，体验额度与套餐可在会员中心查看。"
      footer={
        <p>
          已有账号？{' '}
          <Link className="font-medium text-brand-400 transition hover:text-brand-300" href="/login">
            去登录
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-medium text-copy-muted">
            用户名
          </label>
          <div className="flex gap-2">
            <input
              id="username"
              autoComplete="username"
              className={`${authInputClassName} min-w-0 flex-1`}
              {...register('username')}
            />
            {usernameStatus === 'taken' && (
              <TechButton
                variant="secondary"
                className="h-11 w-11 shrink-0 px-0"
                onClick={rollUsername}
                title="随机换一个用户名"
                aria-label="随机换一个用户名"
              >
                🎲
              </TechButton>
            )}
          </div>
          {usernameStatus === 'checking' && <p className="mt-1.5 text-xs text-copy-subtle">正在检查用户名...</p>}
          {usernameStatus === 'available' && <p className="mt-1.5 text-xs text-brand-400">用户名可用</p>}
          {usernameStatus === 'taken' && <p className="mt-1.5 text-xs text-risk-high">用户名已存在，试试骰子按钮</p>}
          {errors.username && <p className="mt-1.5 text-xs text-risk-high">{errors.username.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-copy-muted">
            密码
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={authInputClassName}
            {...register('password')}
          />
          {errors.password && <p className="mt-1.5 text-xs text-risk-high">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-copy-muted">
            确认密码
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={authInputClassName}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-risk-high">{errors.confirmPassword.message}</p>
          )}
        </div>

        {errors.root && (
          <p role="alert" className="border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-xs text-risk-high">
            {errors.root.message}
          </p>
        )}

        <TechButton type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? '注册中...' : '注册'}
        </TechButton>
      </form>
    </AuthShell>
  );
}
