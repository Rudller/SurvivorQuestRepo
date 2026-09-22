import type { ExpeditionLeaderboardEntry } from "../../expedition-stage/model/types";

/** Only the columns the end screen reads; the poll hands over full entries. */
export type RiskQuizFinishEntry = Pick<ExpeditionLeaderboardEntry, "teamId" | "position" | "points">;

export type RiskQuizFinishSummary = {
  /** null when the team is not in the table at all — see below. */
  position: number | null;
  teamCount: number;
  points: number;
};

export type RiskQuizFinishBar = Pick<
  ExpeditionLeaderboardEntry,
  "teamId" | "position" | "name" | "points" | "slotNumber" | "color" | "badgeImageUrl" | "badgeKey"
> & {
  /** 0–100, measured against the deck's face value. */
  widthPercent: number;
  isOwnTeam: boolean;
};

/**
 * The standings as bars growing left to right: one row per team, measured
 * against what the deck was worth.
 *
 * Against the deck rather than against the winner, so a bar answers "how much
 * of what was on the table did we take" — a room where everybody finished
 * around a third of the deck reads as exactly that, instead of the leader
 * always sitting at full width no matter how the game went.
 */
export function buildRiskQuizFinishBars(input: {
  entries: readonly ExpeditionLeaderboardEntry[];
  teamId: string;
  /** The deck's face value from deck-status; 0 when the backend did not send one. */
  maxPoints: number;
}): RiskQuizFinishBar[] {
  const ordered = [...input.entries].sort((left, right) => left.position - right.position);
  const best = ordered.reduce((highest, entry) => Math.max(highest, entry.points), 0);
  // An older backend sends no maximum; the winner stands in for it so the
  // screen still draws something proportional rather than a row of empties.
  const scale = input.maxPoints > 0 ? input.maxPoints : best;

  return ordered.map((entry) => ({
    teamId: entry.teamId,
    position: entry.position,
    name: entry.name,
    points: entry.points,
    slotNumber: entry.slotNumber,
    color: entry.color,
    badgeImageUrl: entry.badgeImageUrl,
    badgeKey: entry.badgeKey,
    // Betting points means a total can land on or below zero, and a bar cannot
    // go left of its own baseline — those rows show the number alone. At the
    // other end, streak multipliers can carry a team past the deck's face
    // value, so the bar stops at full width instead of overflowing its row.
    widthPercent:
      scale > 0 && entry.points > 0 ? Math.min(100, Math.round((entry.points / scale) * 100)) : 0,
    isOwnTeam: entry.teamId === input.teamId,
  }));
}

/** Used when a team colour cannot be parsed at all. */
const NEUTRAL_BAR_COLOR = "#64748b";
// Below this, a colour disappears into the screen's near-black background.
// The palette's "black" (#111827) sits at 22.
const MIN_BAR_BRIGHTNESS = 70;

/**
 * The two colours one standings row is drawn in: the filled bar and the empty
 * part behind it.
 *
 * The track used to be the theme's panel colour, which on the dark palette is
 * `rgba(18, 34, 27, 0.94)` — near black. That was fine while bars were measured
 * against the winner and the leader's row was full, but against the deck's face
 * value most rows are mostly track, and a screen of black bands was the result.
 * Tinting the track with the team's own colour turns it into that team's lane.
 *
 * The brightness floor handles the other trap: "black" is a colour a team can
 * pick, and left alone its bar is invisible on this background.
 */
export function resolveRiskQuizBarColors(hex: string): { fill: string; track: string } {
  const normalizedHex = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return { fill: NEUTRAL_BAR_COLOR, track: toTrack(NEUTRAL_BAR_COLOR) };
  }

  const parsed = Number.parseInt(normalizedHex, 16);
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  if (brightness >= MIN_BAR_BRIGHTNESS) {
    const fill = `#${normalizedHex.toLowerCase()}`;
    return { fill, track: toTrack(fill) };
  }

  // Mixed towards white rather than replaced, so a dark team still reads as its
  // own colour rather than as somebody else's.
  const lift = (channel: number) => Math.round(channel + (255 - channel) * 0.45);
  const fill = `#${[lift(red), lift(green), lift(blue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

  return { fill, track: toTrack(fill) };
}

function toTrack(hex: string) {
  const parsed = Number.parseInt(hex.replace("#", ""), 16);
  return `rgba(${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}, 0.16)`;
}

/**
 * Whether the session state's end flag means the *game* is over, rather than
 * just this team's run through the deck.
 *
 * The expedition can treat `isEnded` as final because a team that finished
 * every station really is done. Ryzykanci cannot: every card writes a
 * TeamTaskProgress row, so a fast team trips `all-tasks-completed` mid-game and
 * would land on the end screen while the organiser is still playing. That case
 * belongs to the deck-exhausted UI, not here.
 */
export function isRiskQuizGameOver(endState: { isEnded: boolean; reason: string | null }) {
  if (!endState.isEnded) {
    return false;
  }

  return endState.reason !== "all-tasks-completed";
}

/**
 * This team's own score, and where it placed.
 *
 * Its own module so the arithmetic can be tested without rendering the screen,
 * which drags in the background animation and the rest of the mode's graph.
 *
 * A missing entry is a real case, not a bug to throw on: a team that never
 * scanned a card can be absent from the leaderboard, and the tablet still has
 * to show something. It keeps its own points and says nothing about a place.
 */
export function summariseRiskQuizFinish(input: {
  entries: readonly RiskQuizFinishEntry[];
  teamId: string;
  /** Points the tablet already knows, used when the table has no row for it. */
  fallbackPoints: number;
}): RiskQuizFinishSummary {
  const own = input.entries.find((candidate) => candidate.teamId === input.teamId);

  return {
    position: own?.position ?? null,
    teamCount: input.entries.length,
    // The server's number wins: it includes scores this device never saw, such
    // as a photo card the Game Master approved after the last poll.
    points: own?.points ?? input.fallbackPoints,
  };
}
