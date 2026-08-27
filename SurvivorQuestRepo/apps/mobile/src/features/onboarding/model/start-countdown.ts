// Longest countdown a tablet will ever render. The server sends the remaining
// milliseconds and already caps them, but a client that trusts a server number
// blindly is one bad deploy away from showing "417" on a game screen.
export const START_COUNTDOWN_MAX_MS = 10_000;
// How long "START" sits on screen after the count reaches zero. Without it the
// last beat would flash for a single frame and read as a glitch.
export const START_COUNTDOWN_GO_MS = 600;

export type StartCountdownPhase = "counting" | "go" | "done";

export type StartCountdownState = {
  phase: StartCountdownPhase;
  /** Whole seconds to show, 10 down to 1. Zero once the count is over. */
  secondsLeft: number;
};

const DONE: StartCountdownState = { phase: "done", secondsLeft: 0 };

/**
 * What the pre-game countdown should be showing.
 *
 * `remainingMs` is the server's figure from the poll that noticed the start;
 * `elapsedMs` is how long this device has been counting since that poll landed.
 * Splitting the two keeps the countdown anchored to a shared instant while
 * ticking on the device's own timer, so nothing depends on the tablet's wall
 * clock agreeing with the server's.
 *
 * A missing or non-positive figure means the game is simply open — a team that
 * joined late, or a realization started before the server knew how to stamp
 * one. The countdown is choreography; it must never be the reason a team can't
 * play.
 */
export function resolveStartCountdown(
  remainingMs: number | null | undefined,
  elapsedMs: number,
): StartCountdownState {
  if (typeof remainingMs !== "number" || !Number.isFinite(remainingMs)) return DONE;

  const capped = Math.min(remainingMs, START_COUNTDOWN_MAX_MS);
  // Nothing left to count when the device first hears about it: the game is
  // open, and flashing START at a team that never saw the count would read as
  // a glitch rather than a cue. The "go" beat is only reached by counting
  // through it.
  if (capped <= 0) return DONE;

  const left = capped - elapsedMs;

  if (left > 0) {
    return { phase: "counting", secondsLeft: Math.ceil(left / 1000) };
  }

  if (left > -START_COUNTDOWN_GO_MS) {
    return { phase: "go", secondsLeft: 0 };
  }

  return DONE;
}
