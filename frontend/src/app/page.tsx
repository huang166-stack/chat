'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;
    router.replace(accessToken ? '/chat' : '/login');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950">
      正在跳转...
    </main>
  );
}
