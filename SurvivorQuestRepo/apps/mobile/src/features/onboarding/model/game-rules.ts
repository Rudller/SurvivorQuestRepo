import type { OnboardingSession } from "./types";

// Decides whether the post-start rules popup belongs on screen. Deliberately
// checked at render time rather than baked into the stored
// `showGameRulesAfterStart` flag: that flag is persisted in AsyncStorage, so a
// device that joined before a rule like the Ryzykanci exclusion existed would
// otherwise resume with a stale `true`.
export function shouldShowGameRulesPopup(
  session: OnboardingSession | null,
  isWaitingForAdminStart: boolean,
) {
  if (!session || isWaitingForAdminStart) return false;
  if (!session.showGameRulesAfterStart) return false;

  // No type is excluded any more — Ryzykanci included. The admin forms offer the
  // "Zasady gry" field for every type, so gating it here would leave operators
  // filling a box nobody ever sees. Having rules text is the whole switch.
  return Boolean(session.realization?.gameRules?.trim());
}
