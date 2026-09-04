type ThrottlerRequestLike = {
  ip?: unknown;
  url?: unknown;
  originalUrl?: unknown;
  body?: unknown;
};

function readBodyString(body: unknown, key: string): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Keys the throttle bucket by the device rather than the client IP.
 *
 * A whole venue plays from one Wi-Fi address, so an IP-keyed bucket is shared
 * by every tablet in the room: with fifteen teams, a per-device budget becomes a
 * fifteenth of itself and the first busy minute locks everyone out. The session
 * token identifies the device once it has joined; before that (the join call
 * itself) the device id does. Only when neither is present does this fall back
 * to the address.
 */
export function mobileSessionTracker(req: ThrottlerRequestLike): string {
  const sessionToken = readBodyString(req.body, 'sessionToken');
  if (sessionToken) {
    return `session:${sessionToken}`;
  }

  const deviceId = readBodyString(req.body, 'deviceId');
  if (deviceId) {
    return `device:${deviceId}`;
  }

  return typeof req.ip === 'string' ? req.ip : '';
}

const MOBILE_PATH_PREFIXES = ['/mobile/', '/api/mobile/'];

/**
 * The tracker for the app-wide default buckets.
 *
 * Mobile traffic is keyed per device by the rule above; everything else — the
 * admin panel, auth — stays keyed by IP, where a client-supplied key would only
 * be an invitation to rotate it. The venue bucket below keeps a ceiling on the
 * address either way.
 */
export function mobileAwareTracker(req: ThrottlerRequestLike): string {
  const rawPath =
    typeof req.originalUrl === 'string'
      ? req.originalUrl
      : typeof req.url === 'string'
        ? req.url
        : '';
  const isMobilePath = MOBILE_PATH_PREFIXES.some((prefix) => rawPath.startsWith(prefix));

  if (!isMobilePath) {
    return typeof req.ip === 'string' ? req.ip : '';
  }

  return mobileSessionTracker(req);
}

export const AUTH_LOGIN_THROTTLE = {
  short: { limit: 5, ttl: 60_000 },
  long: { limit: 20, ttl: 15 * 60_000 },
} as const;

// Keyed by device id (no session token exists yet at join time). Left on IP it
// meant eight joins a minute for the whole room — and a fifteen-team event
// starts with fifteen tablets joining inside two minutes.
export const MOBILE_JOIN_THROTTLE = {
  short: { limit: 8, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 40, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;

// One team's scans, answers, chat messages and pig throws. The numbers were
// always per-device numbers; only the key was wrong.
export const MOBILE_QR_RESOLVE_THROTTLE = {
  short: { limit: 24, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 180, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;

// Six uploads a minute is a sane ceiling for one tablet. Shared across a room
// it was six for everyone, and a photo round would have jammed instantly.
export const MOBILE_PHOTO_UPLOAD_THROTTLE = {
  short: { limit: 6, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 30, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
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

// Polled every 5s each by the Ryzykanci chat and by the pig layer, plus the
// deck counter's own refreshes. All three used to share
// MOBILE_QR_RESOLVE_THROTTLE, which is two sizes wrong for a poll: it is meant
// for one-off actions (a scan, an answer), and it keys the bucket by IP. A
// single tablet's steady chat+pigs polling therefore sat exactly on that
// 24/min limit before anything else asked for a thing, and every tablet in a
// venue behind one NAT address shared that one bucket — so the first burst
// after a reload tipped it and the polls themselves kept it tipped, which is
// why a reloaded tablet never got its cards, chat or pigs back. Keyed per
// session like the other polls and sized to ~2x the steady rate per device.
export const RISK_QUIZ_POLL_THROTTLE = {
  short: { limit: 40, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 600, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;

// Polled every 4s by the Ryzykanci scan screen while idle, waiting for an
// admin-triggered "Uruchom na tablecie" draw. Keyed per session token (see
// mobileSessionTracker above) — several tablets behind one venue's
// shared/carrier IP must not share a bucket, since a busy realization can
// have many teams polling this at once. Sized to ~2x the steady poll rate
// per device (4s poll ≈ 15/min).
export const RISK_QUIZ_PENDING_DRAW_THROTTLE = {
  short: { limit: 30, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 450, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;

// Deliberately far above anything a real deployment produces: a tablet makes
// roughly sixty requests a minute, so fifteen of them sit near 900 and a
// hundred near 6 000. At thirty thousand this bucket cannot be what stops a
// game, even if every request in production arrives looking like one address
// (which happens when the app sits behind more proxy hops than it trusts).
//
// It is not the real protection — the per-device buckets are. This exists only
// so a client rotating its device key cannot make the key space unbounded, and
// so one address cannot bury the server.
const DEFAULT_VENUE_LIMIT_PER_MINUTE = 30_000;

function resolveVenueLimit() {
  const raw = Number(process.env.THROTTLE_VENUE_LIMIT_PER_MINUTE);
  if (!Number.isFinite(raw) || raw < 1) {
    return DEFAULT_VENUE_LIMIT_PER_MINUTE;
  }

  return Math.round(raw);
}

// The one bucket that stays keyed by IP, as the ceiling on a single address.
// Raise it with THROTTLE_VENUE_LIMIT_PER_MINUTE if a deployment ever needs to,
// without a code change.
export const VENUE_IP_THROTTLE = {
  name: 'venue',
  ttl: 60_000,
  limit: resolveVenueLimit(),
} as const;
