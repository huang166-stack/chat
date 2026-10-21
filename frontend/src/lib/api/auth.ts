import { api } from './client';
import type { AuthSession, AuthUser } from '@/types/auth';

export interface UsernameCheckResult {
  username: string;
  available: boolean;
  suggestions: string[];
}

export function checkUsername(username: string) {
  return api.get<UsernameCheckResult>(`/auth/check-username?username=${encodeURIComponent(username)}`);
}

export function login(username: string, password: string) {
  return api.post<AuthSession>('/auth/login', { username, password });
}

export function register(username: string, password: string, confirmPassword: string) {
  return api.post<AuthSession>('/auth/register', { username, password, confirmPassword });
}

export function logout() {
  return api.post<null>('/auth/logout');
}

export type { AuthSession, AuthUser };
