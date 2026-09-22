import { TEAM_COLORS } from "./constants";
import type { TeamColor } from "./types";

type JoinedTeamCustomization = {
  name: string | null;
  color: string | null;
  badgeImageUrl: string | null;
  badgeKey?: string | null;
};

export function isTeamColor(value: string | null): value is TeamColor {
  return TEAM_COLORS.some((color) => color.key === value);
}

// An avatar counts as chosen whether it is a photo or an emoji. Requiring the
// photo specifically would send every team that picked an emoji back into the
// editor on each rejoin.
export function hasCompleteTeamCustomization<T extends JoinedTeamCustomization>(
  team: T,
): team is T & { name: string; color: TeamColor } {
  const hasAvatar =
    (typeof team.badgeImageUrl === "string" && team.badgeImageUrl.trim().length > 0) ||
    (typeof team.badgeKey === "string" && team.badgeKey.trim().length > 0);

  return Boolean(team.name?.trim() && isTeamColor(team.color) && hasAvatar);
}

// A join replayed from a recovery intent always stops on the team step, even
// when the team is fully customized. The device got here because its session
// was revoked — by "Reset realizacji", by "Wyrzuć urządzenia do konfiguracji"
// or by a plain expiry — and skipping straight back into the play screen would
// undo the very thing the instructor pressed the button for. It also makes the
// app honour the notice it already shows ("Przekierowaliśmy do Etapu 3, aby
// ponownie potwierdzić drużynę"), which today is untrue for a customized team.
export function shouldSkipTeamStepAfterJoin<T extends JoinedTeamCustomization>(
  team: T,
  isRecoveryJoin: boolean,
): team is T & { name: string; color: TeamColor } {
  return hasCompleteTeamCustomization(team) && !isRecoveryJoin;
}
