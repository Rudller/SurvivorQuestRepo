// A team session lives this long from the moment it is issued, and every
// request that carries the token slides the window forward from "now".
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// Sliding the window on *every* request means a write per request, and the
// Ryzykancy play screen alone polls chat, pigs and deck-status every few
// seconds per tablet. Rewriting a date that still has hours of slack buys
// nothing, so the window only moves once the session has burned through half
// of its lifetime — after that a single refresh puts it back to a full TTL.
export const SESSION_TTL_REFRESH_THRESHOLD_MS = SESSION_TTL_MS / 2;

export function shouldRefreshSessionTtl(
  expiresAt: Date,
  now: Date = new Date(),
) {
  return expiresAt.getTime() - now.getTime() < SESSION_TTL_REFRESH_THRESHOLD_MS;
}
