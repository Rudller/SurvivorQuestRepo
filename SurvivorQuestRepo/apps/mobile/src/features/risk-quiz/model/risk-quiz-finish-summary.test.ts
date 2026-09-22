import {
  buildRiskQuizFinishBars,
  isRiskQuizGameOver,
  resolveRiskQuizBarColors,
  summariseRiskQuizFinish,
} from "./risk-quiz-finish-summary";
import type { ExpeditionLeaderboardEntry } from "../../../shared/model/leaderboard";

function fullEntry(
  teamId: string,
  position: number,
  points: number,
  name = `Drużyna ${position}`,
): ExpeditionLeaderboardEntry {
  return {
    position,
    teamId,
    slotNumber: position,
    name,
    color: null,
    badgeKey: null,
    badgeImageUrl: null,
    points,
    progressDone: 0,
    progressTotal: 0,
    progressPercent: 0,
  };
}

// `endState.isEnded` answers "is this team done", which is not the same question
// in Ryzykanci as "is the game over". Every card a team plays writes a
// TeamTaskProgress row, so a team that works through the whole deck trips
// `all-tasks-completed` while the organiser is still running the game — and the
// deck-exhausted UI, not the end screen, is what should meet them there.
describe("isRiskQuizGameOver", () => {
  it("ends the game when the organiser finishes the realization", () => {
    expect(isRiskQuizGameOver({ isEnded: true, reason: "realization-finished" })).toBe(true);
  });

  it("ends the game when the clock runs out", () => {
    expect(isRiskQuizGameOver({ isEnded: true, reason: "time-expired" })).toBe(true);
  });

  it("does not end the game for a team that merely ran out of cards", () => {
    expect(isRiskQuizGameOver({ isEnded: true, reason: "all-tasks-completed" })).toBe(false);
  });

  it("stays out of the way while the session is live", () => {
    expect(isRiskQuizGameOver({ isEnded: false, reason: null })).toBe(false);
  });

  // An end the server did not label is still an end; only the per-team reason
  // above is special-cased.
  it("trusts an unlabelled end", () => {
    expect(isRiskQuizGameOver({ isEnded: true, reason: null })).toBe(true);
  });
});

// The end screen draws the standings as bars growing left to right. They are
// measured against what was on the table — the whole deck's worth of points —
// so a bar says "we took this much of what there was", not "we got this close
// to the winner".
describe("buildRiskQuizFinishBars", () => {
  const entries = [fullEntry("t-1", 1, 310), fullEntry("t-2", 2, 248), fullEntry("t-3", 3, 190)];

  it("scales every bar against the points the deck was worth", () => {
    const bars = buildRiskQuizFinishBars({ entries, teamId: "t-2", maxPoints: 400 });

    expect(bars.map((bar) => bar.widthPercent)).toEqual([78, 62, 48]);
  });

  // Streak multipliers are not in the deck's face value, so a hot team can end
  // above it. The bar stops at full width rather than overflowing the row.
  it("caps a team that beat the deck's face value", () => {
    const bars = buildRiskQuizFinishBars({ entries, teamId: "t-1", maxPoints: 250 });

    expect(bars[0].widthPercent).toBe(100);
  });

  // An older backend does not send a maximum at all; the leader stands in for
  // it so the screen still draws something proportional.
  it("falls back to the winning score when no maximum is known", () => {
    const bars = buildRiskQuizFinishBars({ entries, teamId: "t-2", maxPoints: 0 });

    expect(bars.map((bar) => bar.widthPercent)).toEqual([100, 80, 61]);
  });

  it("marks the team holding the tablet", () => {
    const bars = buildRiskQuizFinishBars({ entries, teamId: "t-2", maxPoints: 400 });

    expect(bars.map((bar) => bar.isOwnTeam)).toEqual([false, true, false]);
  });

  it("orders by place, whatever order the table arrived in", () => {
    const shuffled = [fullEntry("t-3", 3, 190), fullEntry("t-1", 1, 310), fullEntry("t-2", 2, 248)];

    expect(
      buildRiskQuizFinishBars({ entries: shuffled, teamId: "t-1", maxPoints: 400 }).map((bar) => bar.teamId),
    ).toEqual(["t-1", "t-2", "t-3"]);
  });

  // Ryzykanci teams bet their points, so a total can sit at or below zero.
  // There is no such thing as a negative-width bar — the number carries it.
  it("draws nothing for a team at or below zero", () => {
    const withLosses = [fullEntry("t-1", 1, 310), fullEntry("t-2", 2, 0), fullEntry("t-3", 3, -40)];

    expect(
      buildRiskQuizFinishBars({ entries: withLosses, teamId: "t-1", maxPoints: 400 }).map((bar) => bar.widthPercent),
    ).toEqual([78, 0, 0]);
  });

  it("does not divide by zero when nobody scored and nothing is known", () => {
    const allZero = [fullEntry("t-1", 1, 0), fullEntry("t-2", 2, 0)];

    expect(
      buildRiskQuizFinishBars({ entries: allZero, teamId: "t-1", maxPoints: 0 }).map((bar) => bar.widthPercent),
    ).toEqual([0, 0]);
  });

  it("survives an empty table", () => {
    expect(buildRiskQuizFinishBars({ entries: [], teamId: "t-1", maxPoints: 400 })).toEqual([]);
  });
});

describe("summariseRiskQuizFinish", () => {
  const entries = [fullEntry("t-1", 1, 310), fullEntry("t-2", 2, 248), fullEntry("t-3", 3, 190)];

  it("reports the team's place and how many teams played", () => {
    const summary = summariseRiskQuizFinish({ entries, teamId: "t-2", fallbackPoints: 0 });

    expect(summary.position).toBe(2);
    expect(summary.teamCount).toBe(3);
  });

  it("prefers the leaderboard's points over the tablet's own count", () => {
    const summary = summariseRiskQuizFinish({ entries, teamId: "t-2", fallbackPoints: 208 });

    expect(summary.points).toBe(248);
  });

  it("falls back to the tablet's points for a team missing from the table", () => {
    const summary = summariseRiskQuizFinish({ entries, teamId: "t-9", fallbackPoints: 120 });

    expect(summary.position).toBeNull();
    expect(summary.points).toBe(120);
    expect(summary.teamCount).toBe(3);
  });

  it("survives an empty table", () => {
    const summary = summariseRiskQuizFinish({ entries: [], teamId: "t-1", fallbackPoints: 75 });

    expect(summary).toEqual({ position: null, teamCount: 0, points: 75 });
  });

  // Two teams on the same score share a position server-side; the tablet just
  // repeats what it was given rather than inventing a tie-break of its own.
  it("repeats a shared position as the server sent it", () => {
    const tied = [fullEntry("t-1", 1, 300), fullEntry("t-2", 1, 300), fullEntry("t-3", 3, 100)];

    expect(summariseRiskQuizFinish({ entries: tied, teamId: "t-2", fallbackPoints: 0 }).position).toBe(1);
  });
});

// Every row on the end screen is a lane in its team's colour. Two things make
// that harder than it sounds: the screen's background is nearly black, and
// "black" is itself a colour a team can pick.
describe("resolveRiskQuizBarColors", () => {
  it("leaves a bright team colour alone", () => {
    expect(resolveRiskQuizBarColors("#ef4444").fill).toBe("#ef4444");
  });

  it("lifts a team colour too dark to see on this background", () => {
    // #111827 is the palette's "black" — unchanged it is invisible here.
    const { fill } = resolveRiskQuizBarColors("#111827");

    expect(fill).not.toBe("#111827");
    expect(brightnessOf(fill)).toBeGreaterThan(70);
  });

  it("tints the empty part of the row instead of leaving it black", () => {
    expect(resolveRiskQuizBarColors("#ef4444").track).toBe("rgba(239, 68, 68, 0.16)");
  });

  it("falls back to a neutral for a colour it cannot parse", () => {
    expect(resolveRiskQuizBarColors("not-a-colour").fill).toBe("#64748b");
  });
});

function brightnessOf(hex: string) {
  const parsed = Number.parseInt(hex.replace("#", ""), 16);
  return (((parsed >> 16) & 255) * 299 + ((parsed >> 8) & 255) * 587 + (parsed & 255) * 114) / 1000;
}
