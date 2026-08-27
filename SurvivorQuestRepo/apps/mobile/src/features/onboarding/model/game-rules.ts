import type { OnboardingSession } from "./types";

// Realization types that carry their whole briefing somewhere else and so have
// no separate rules step. Ryzykanci show everything on the waiting screen the
// team stares at until the admin starts, so a popup afterwards would only
// repeat it. The admin forms hide the "Zasady gry" field for these types too —
// keep the two in step.
const REALIZATION_TYPES_WITHOUT_GAME_RULES = new Set(["risk-quiz"]);

export function isGameRulesSupportedForRealizationType(type: string | undefined) {
  return !type || !REALIZATION_TYPES_WITHOUT_GAME_RULES.has(type);
}

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
  if (!isGameRulesSupportedForRealizationType(session.realization?.type)) return false;

  return Boolean(session.realization?.gameRules?.trim());
}
