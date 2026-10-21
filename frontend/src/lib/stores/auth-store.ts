import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AuthSession, AuthUser } from '@/types/auth';

const ACCESS_COOKIE = 'chat_access_token';
const REFRESH_COOKIE = 'chat_refresh_token';

const safeStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(name, value);
    }
  },
  removeItem: (name) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(name);
    }
  },
};

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (session) => {
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
        setCookie(ACCESS_COOKIE, session.accessToken, 2 * 60 * 60);
        setCookie(REFRESH_COOKIE, session.refreshToken, 7 * 24 * 60 * 60);
      },
      clearSession: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        clearCookie(ACCESS_COOKIE);
        clearCookie(REFRESH_COOKIE);
      },
    }),
    {
      name: 'chat-auth-storage',
      storage: createJSONStorage(() => safeStorage),
    },
  ),
);

