import { render, within } from "@testing-library/react-native";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { RiskQuizEventFeed, RISK_FEED_VISIBLE_ROWS } from "./risk-quiz-event-feed";
import type { RiskChatMessage } from "../api/risk-quiz.api";

// The feed is a fixed three-line window onto the room: newest on top, always
// the same height, own-team lines picked out so a team spots its own score.

function scored(id: string, teamName: string, points: number, teamId = "team-2"): RiskChatMessage {
  return {
    id,
    authorKind: "SYSTEM",
    teamId,
    authorName: "System",
    content: `${teamName} zdobywa ${points} pkt.`,
    systemEvent: "card-scored",
    payload: { teamName, points, multiplier: 1 },
    teamColor: null,
    teamBadgeImageUrl: null,
    createdAt: `2026-09-13T10:0${id.length}:00.000Z`,
  };
}

function flattenStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]));
}

describe("RiskQuizEventFeed", () => {
  it("shows the newest three events, newest first", async () => {
    const events = [
      scored("m-1", "Lisy", 10),
      scored("m-2", "Orły", 20),
      scored("m-3", "Sokoły", 30),
      scored("m-4", "Wilki", 40),
    ];
    const { getAllByTestId, queryByText } = await render(
      <RiskQuizEventFeed events={events} currentTeamId="team-1" />,
    );

    const rows = getAllByTestId("risk-feed-row");
    expect(rows).toHaveLength(RISK_FEED_VISIBLE_ROWS);
    expect(rows.map((row) => within(row).getByText(/pkt/).props.children)).toEqual([
      "Wilki zdobywa 40 pkt",
      "Sokoły zdobywa 30 pkt",
      "Orły zdobywa 20 pkt",
    ]);
    expect(queryByText("Lisy zdobywa 10 pkt")).toBeNull();
  });

  it("keeps its height with blank rows while the room is still quiet", async () => {
    const { getAllByTestId, queryAllByTestId } = await render(
      <RiskQuizEventFeed events={[scored("m-1", "Lisy", 10)]} currentTeamId="team-1" />,
    );

    expect(getAllByTestId("risk-feed-row")).toHaveLength(1);
    expect(queryAllByTestId("risk-feed-blank")).toHaveLength(RISK_FEED_VISIBLE_ROWS - 1);
  });

  it("picks out the reading team's own line", async () => {
    const { getByText } = await render(
      <RiskQuizEventFeed
        events={[scored("m-1", "Lisy", 10, "team-2"), scored("m-2", "Sokoły", 30, "team-1")]}
        currentTeamId="team-1"
      />,
    );

    expect(flattenStyle(getByText("Sokoły zdobywa 30 pkt").props.style).color).toBe(
      EXPEDITION_THEME.accentStrong,
    );
    expect(flattenStyle(getByText("Lisy zdobywa 10 pkt").props.style).color).toBe(EXPEDITION_THEME.textSubtle);
  });
});
