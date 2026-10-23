'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell, authInputClassName } from '@/components/auth/auth-shell';
import { TechButton } from '@/components/common';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth-schema';

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
    <AuthShell
      eyebrow="Account access"
      title="登录审查工作台"
      description="继续处理合同、查看风险清单与审查报告。"
      footer={
        <p>
          还没有账号？{' '}
          <Link className="font-medium text-brand-400 transition hover:text-brand-300" href="/register">
            立即注册
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-medium text-copy-muted">
            用户名
          </label>
          <input
            id="username"
            autoComplete="username"
            className={authInputClassName}
            {...register('username')}
          />
          {errors.username && <p className="mt-1.5 text-xs text-risk-high">{errors.username.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-copy-muted">
            密码
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={authInputClassName}
            {...register('password')}
          />
          {errors.password && <p className="mt-1.5 text-xs text-risk-high">{errors.password.message}</p>}
        </div>

        {errors.root && (
          <p role="alert" className="border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-xs text-risk-high">
            {errors.root.message}
          </p>
        )}

        <TechButton type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? '登录中...' : '登录'}
        </TechButton>
      </form>
    </AuthShell>
  );
}
