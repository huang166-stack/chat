'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: Boolean(accessToken),
    setSession,
    clearSession,
  };
}
