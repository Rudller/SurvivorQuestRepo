type ThrottlerRequestLike = {
  ip?: unknown;
  body?: unknown;
};

/**
 * Keys the throttle bucket by mobile session token instead of client IP.
 * Needed because devices polling from behind the same reverse-proxy hop, or
 * tablets on cellular data behind the same carrier-grade NAT (common with
 * mobile operators), would otherwise all share one IP-based bucket.
 */
export function mobileSessionTracker(req: ThrottlerRequestLike): string {
  const body = req.body;
  const sessionToken =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).sessionToken
      : undefined;

  if (typeof sessionToken === 'string' && sessionToken.trim().length > 0) {
    return `session:${sessionToken.trim()}`;
  }

  return typeof req.ip === 'string' ? req.ip : '';
}

export const AUTH_LOGIN_THROTTLE = {
  short: { limit: 5, ttl: 60_000 },
  long: { limit: 20, ttl: 15 * 60_000 },
} as const;

export const MOBILE_JOIN_THROTTLE = {
  short: { limit: 8, ttl: 60_000 },
  long: { limit: 40, ttl: 15 * 60_000 },
} as const;

export const MOBILE_QR_RESOLVE_THROTTLE = {
  short: { limit: 24, ttl: 60_000 },
  long: { limit: 180, ttl: 15 * 60_000 },
} as const;

export const MOBILE_PHOTO_UPLOAD_THROTTLE = {
  short: { limit: 6, ttl: 60_000 },
  long: { limit: 30, ttl: 15 * 60_000 },
} as const;

export const GALLERY_VERIFY_THROTTLE = {
  short: { limit: 5, ttl: 60_000 },
  long: { limit: 20, ttl: 15 * 60_000 },
} as const;

// Polled every 3s by the mobile app's "waiting for admin start" screen.
// Keyed per session token (see mobileSessionTracker) so device count behind
// a shared/carrier IP doesn't matter; sized to ~2x the steady poll rate per
// device.
export const MOBILE_SESSION_STATE_THROTTLE = {
  short: { limit: 40, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 600, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;
