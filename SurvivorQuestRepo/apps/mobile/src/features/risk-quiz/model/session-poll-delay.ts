/** How often the screen re-asks for the session state before the game opens. */
export const RISK_QUIZ_START_POLL_INTERVAL_MS = 3000;

/**
 * Cadence once the game is running. Matches SESSION_POLLING_INTERVAL_MS in the
 * expedition's use-expedition-session, because this poll is doing the same job
 * there: keeping the top bar's realization and team data current.
 */
export const RISK_QUIZ_LIVE_POLL_INTERVAL_MS = 15_000;

/**
 * Delay before the next session-state poll, given the realization status that
 * came back from the last one.
 *
 * Always a delay, never a "stop": the poll is the only source of the company
 * name, logo, team badge and points shown in the top bar, so ending it strands
 * those on whatever was true when the game started. Before the start the tablet
 * is waiting on a status flip and polls fast; afterwards it only needs to catch
 * admin-side edits, so it drops to the expedition's slower interval.
 */
export function getRiskQuizSessionPollDelayMs(status: string | undefined) {
  return status === "in-progress" ? RISK_QUIZ_LIVE_POLL_INTERVAL_MS : RISK_QUIZ_START_POLL_INTERVAL_MS;
}
