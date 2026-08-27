/**
 * Whether the Ryzykanci screen should still be showing its "waiting for the
 * game to start" card, given the realization status it currently knows about.
 *
 * Its own module rather than a local in the screen so the rule can be tested
 * without dragging expo-audio and the rest of the screen's graph into a test
 * run. It is an inversion, and getting it backwards means either a permanent
 * waiting card over a running game or the scan screen offered before the
 * organiser has started anything.
 */
export function shouldShowRiskQuizIntro(status: string | undefined) {
  return status !== "in-progress";
}
