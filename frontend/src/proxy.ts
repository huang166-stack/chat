import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'chat_access_token';

function getRoleFromToken(token?: string) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.role === 'string' ? decoded.role : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isProtectedPage =
    pathname === '/chat' ||
    pathname.startsWith('/chat/') ||
    isAdminPage ||
    pathname === '/membership' ||
    pathname.startsWith('/membership/') ||
    pathname === '/workspace' ||
    pathname.startsWith('/workspace/') ||
    pathname === '/payment/return' ||
    pathname.startsWith('/payment/return/');

  if (isProtectedPage && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAdminPage && getRoleFromToken(accessToken) !== 'ADMIN') {
    return NextResponse.redirect(new URL('/workspace', request.url));
  }

  if (isAuthPage && accessToken) {
    const destination = getRoleFromToken(accessToken) === 'ADMIN' ? '/admin' : '/workspace';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/admin/:path*', '/membership/:path*', '/workspace/:path*', '/payment/return/:path*', '/login', '/register'],
};
