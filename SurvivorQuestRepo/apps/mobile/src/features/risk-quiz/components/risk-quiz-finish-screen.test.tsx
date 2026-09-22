import { render, within } from "@testing-library/react-native";

import { RiskQuizFinishScreen } from "./risk-quiz-finish-screen";
import { RISK_QUIZ_TEXT } from "../model/risk-quiz-text";
import type { ExpeditionLeaderboardEntry } from "../../expedition-stage/model/types";

// The screen a Ryzykanci tablet sits on after the organiser ends the game. It
// used to be the "Tekst wstępu" briefing card, because the screen only knew
// about `status`, and "done" reads the same as "not started yet" to it.

const text = RISK_QUIZ_TEXT.polish.finish;

function entry(
  teamId: string,
  position: number,
  points: number,
  name: string,
  badgeKey: string | null = "🦊",
): ExpeditionLeaderboardEntry {
  return {
    position,
    teamId,
    slotNumber: position,
    name,
    color: null,
    badgeKey,
    badgeImageUrl: null,
    points,
    progressDone: 0,
    progressTotal: 0,
    progressPercent: 0,
  };
}

const entries = [
  entry("t-1", 1, 310, "Zieloni"),
  entry("t-2", 2, 248, "Czerwoni"),
  entry("t-3", 3, 190, "Niebiescy"),
];

function flattenStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]));
}

function renderScreen(overrides: Partial<Parameters<typeof RiskQuizFinishScreen>[0]> = {}) {
  return render(
    <RiskQuizFinishScreen
      language="polish"
      isLightTheme={false}
      currentTeamId="t-2"
      teamPoints={248}
      leaderboardEntries={entries}
      maxPoints={400}
      showLeaderboard
      onExitRealization={() => {}}
      {...overrides}
    />,
  );
}

describe("RiskQuizFinishScreen", () => {
  it("opens on the end-of-game headline", async () => {
    const { getByText } = await renderScreen();

    expect(getByText(text.title)).toBeTruthy();
    expect(getByText(text.subtitle)).toBeTruthy();
  });

  it("gives every team a row with its place, name and score", async () => {
    const { getAllByTestId } = await renderScreen();

    const rows = getAllByTestId("risk-finish-bar-row");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => within(row).getByText(/^\d+\.$/).props.children.join(""))).toEqual(["1.", "2.", "3."]);
    expect(rows.map((row) => within(row).getByText(/^[A-ZŻ]/).props.children)).toEqual([
      "Zieloni",
      "Czerwoni",
      "Niebiescy",
    ]);
    expect(rows.map((row) => within(row).getByText(/^\d+$/).props.children)).toEqual([310, 248, 190]);
  });

  // The bar itself is the row's first child; the label sits on top of it.
  it("measures the bars against the points the deck was worth", async () => {
    const { getAllByTestId } = await renderScreen();

    const widths = getAllByTestId("risk-finish-bar-row").map(
      (row) => flattenStyle(row.props.children[0].props.style).width,
    );
    expect(widths).toEqual(["78%", "62%", "48%"]);
  });

  // badgeKey holds the emoji itself. A team without an uploaded photo still has
  // an icon, and the row used to render an empty coloured square instead.
  it("falls back to the team's emoji badge when there is no photo", async () => {
    const { getAllByTestId } = await renderScreen();

    const rows = getAllByTestId("risk-finish-bar-row");
    expect(rows.map((row) => within(row).getByText("🦊"))).toHaveLength(3);
  });

  it("marks a team with no badge at all rather than leaving a blank", async () => {
    const { getAllByTestId } = await renderScreen({
      leaderboardEntries: [entry("t-1", 1, 310, "Zieloni", null)],
    });

    expect(within(getAllByTestId("risk-finish-bar-row")[0]).getByText("🏁")).toBeTruthy();
  });

  it("picks out the tablet's own team with a halo", async () => {
    const { getByTestId } = await renderScreen();

    const halo = getByTestId("risk-finish-own-halo");
    expect(within(halo).getByText("Czerwoni")).toBeTruthy();
  });

  // `showLeaderboardOnFinish` is an admin setting: some organisers announce the
  // standings themselves and do not want tablets spoiling it.
  it("shows the team's own score alone when the ranking is off", async () => {
    const { queryAllByTestId, getByTestId } = await renderScreen({ showLeaderboard: false });

    expect(queryAllByTestId("risk-finish-bar-row")).toHaveLength(0);
    expect(getByTestId("risk-finish-own-points").props.children).toBe(248);
  });

  it("keeps the hand-back-the-tablets note in front of the team", async () => {
    const { getByText } = await renderScreen();

    expect(getByText(text.handBackTablets)).toBeTruthy();
    expect(getByText(text.thanks)).toBeTruthy();
  });

  // A team missing from the leaderboard (it never scanned a card) still gets a
  // readable screen — its own points, counted by the tablet itself.
  it("falls back to the tablet's own count for a team outside the table", async () => {
    const { getByTestId } = await renderScreen({
      currentTeamId: "t-9",
      teamPoints: 40,
      showLeaderboard: false,
    });

    expect(getByTestId("risk-finish-own-points").props.children).toBe(40);
  });
});
