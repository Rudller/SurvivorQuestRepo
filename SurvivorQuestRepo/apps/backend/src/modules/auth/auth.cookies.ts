import type { Request } from 'express';

export function resolveCookieSameSite(): 'lax' | 'strict' | 'none' {
  const raw = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();

  if (raw === 'lax' || raw === 'strict' || raw === 'none') {
    return raw;
  }

  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

export function resolveCookieSecure() {
  if (process.env.AUTH_COOKIE_SECURE === 'true') {
    return true;
  }

  if (process.env.AUTH_COOKIE_SECURE === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

export function readSessionToken(request: Request) {
  const cookies = request.cookies as unknown;
  if (!cookies || typeof cookies !== 'object') {
    return undefined;
  }

  const value = (cookies as Record<string, unknown>).sq_session;
  return typeof value === 'string' ? value : undefined;
}
