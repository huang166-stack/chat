import { useAuthStore } from '@/lib/stores/auth-store';
import type { ApiResponse } from '@/types/api';
import type { AuthSession } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export class ApiError extends Error {
  readonly code: number;
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, code: number, status: number, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as ApiResponse<T>)
    : ((await response.text()) as unknown as ApiResponse<T>);

  if (!response.ok || (typeof payload === 'object' && payload !== null && (payload as ApiResponse<T>).code !== 0)) {
    const body = payload as ApiResponse<T> | null;
    throw new ApiError(
      body?.message ?? response.statusText,
      body?.code ?? 50000,
      response.status,
      body?.data ?? null,
    );
  }

  return (payload as ApiResponse<T>).data;
}

async function refreshSession(): Promise<AuthSession> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new ApiError('未登录', 10002, 401);
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const session = await parseResponse<AuthSession>(response);
  useAuthStore.getState().setSession(session);
  return session;
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  const accessToken = useAuthStore.getState().accessToken;
  const formData =
    typeof FormData !== 'undefined' && options.body instanceof FormData
      ? options.body
      : null;

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.body !== undefined && !formData) {
    headers.set('Content-Type', 'application/json');
  }

  const body: BodyInit | undefined =
    options.body === undefined
      ? undefined
      : formData
        ? formData
        : JSON.stringify(options.body);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
      return request<T>(path, options, false);
    } catch {
      useAuthStore.getState().clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=1';
      }
      throw new ApiError('登录已过期，请重新登录', 10002, 401);
    }
  }

  return parseResponse<T>(response);
}

export const api = {
  get<T>(path: string, options: RequestOptions = {}) {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return request<T>(path, { ...options, method: 'POST', body });
  },
  put<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return request<T>(path, { ...options, method: 'PUT', body });
  },
  delete<T>(path: string, options: RequestOptions = {}) {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
