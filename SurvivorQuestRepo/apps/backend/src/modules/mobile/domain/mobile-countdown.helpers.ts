/**
 * How long the tablets hold on a countdown after the organiser presses start,
 * before the game itself opens. Fixed on purpose — it is choreography, not a
 * setting, and a per-realization value would be one more thing to get wrong on
 * the morning of an event.
 */
export const PRE_GAME_COUNTDOWN_MS = 10_000;

/**
 * Milliseconds left before the game opens, computed against the SERVER clock.
 *
 * Deliberately a remaining duration rather than the raw `startedAt` timestamp:
 * a tablet whose clock drifted would turn a shared instant into its own
 * private one, and a device two minutes behind would render a two-minute
 * countdown. A duration only has to survive the network hop.
 *
 * Returns null when no countdown applies — not started yet, or a realization
 * that was already running before this feature existed and so has no stamp.
 * Callers treat null and 0 the same way: open the game.
 */
export function resolveStartCountdownMs(input: {
  status: string;
  // Accepts both shapes this codebase carries the stamp in: a Date straight
  // off a Prisma row, or the ISO string the realization view maps it to.
  startedAt: Date | string | null | undefined;
  now?: Date;
  lengthMs?: number;
}): number | null {
  const lengthMs = input.lengthMs ?? PRE_GAME_COUNTDOWN_MS;

  if (input.status !== 'in-progress') return null;
  if (!input.startedAt) return null;

  const startedAtMs = new Date(input.startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) return null;

  const remaining =
    startedAtMs + lengthMs - (input.now ?? new Date()).getTime();
  if (remaining <= 0) return 0;

  // A stamp in the future (a server clock nudged backwards mid-event) would
  // otherwise hand the tablets a countdown longer than the one they exist to
  // show.
  return Math.min(remaining, lengthMs);
}
