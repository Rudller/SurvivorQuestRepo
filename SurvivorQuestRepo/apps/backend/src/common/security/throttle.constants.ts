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
