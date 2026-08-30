import { fireEvent, render } from "@testing-library/react-native";

import { TEAM_COLORS } from "../../onboarding/model/constants";
import { RiskQuizChatDock } from "./risk-quiz-chat-dock";
import type { RiskChatMessage } from "../api/risk-quiz.api";

// The dock has two shapes: a strip that has to carry the newest line on its own
// (that is how "team X takes the lead" gets noticed without anyone opening
// anything) and an expanded panel. These guard the split between them, plus the
// read-only mode used for an announcements-only channel.

function message(overrides: Partial<RiskChatMessage> = {}): RiskChatMessage {
  return {
    id: "m-1",
    authorKind: "TEAM",
    teamId: "team-1",
    authorName: "Lisy",
    content: "Idziemy po historię!",
    systemEvent: null,
    teamColor: "#ef4444",
    teamBadgeImageUrl: null,
    createdAt: "2026-08-30T10:05:00.000Z",
    ...overrides,
  };
}

function renderDock(overrides: Partial<Parameters<typeof RiskQuizChatDock>[0]> = {}) {
  return render(
    <RiskQuizChatDock
      messages={[message()]}
      draft=""
      canPost
      isSending={false}
      errorMessage={null}
      currentTeamId="team-1"
      isExpanded={false}
      unreadCount={0}
      keyboardHeight={0}
      onToggleExpanded={jest.fn()}
      onChangeDraft={jest.fn()}
      onSend={jest.fn()}
      {...overrides}
    />,
  );
}

describe("RiskQuizChatDock — pasek", () => {
  it("previews the newest line with its author", async () => {
    const { getByText } = await renderDock();

    expect(getByText("Lisy: Idziemy po historię!")).toBeTruthy();
  });

  it("previews a system message without an author prefix", async () => {
    const { getByText } = await renderDock({
      messages: [
        message({
          id: "m-sys",
          authorKind: "SYSTEM",
          authorName: "System",
          systemEvent: "lead-change",
          content: "Wilki wychodzi na prowadzenie (40 pkt).",
        }),
      ],
    });

    expect(getByText("Wilki wychodzi na prowadzenie (40 pkt).")).toBeTruthy();
  });

  it("keeps the composer out of the collapsed strip", async () => {
    const { queryByTestId } = await renderDock();

    expect(queryByTestId("risk-chat-input")).toBeNull();
    expect(queryByTestId("risk-chat-send")).toBeNull();
  });

  it("shows the unread count and hides it at zero", async () => {
    const withUnread = await renderDock({ unreadCount: 3 });
    expect(withUnread.getByText("3")).toBeTruthy();

    const withoutUnread = await renderDock({ unreadCount: 0 });
    expect(withoutUnread.queryByTestId("risk-chat-unread")).toBeNull();
  });

  it("expands on tap", async () => {
    const onToggleExpanded = jest.fn();
    const { getByTestId } = await renderDock({ onToggleExpanded });

    await fireEvent.press(getByTestId("risk-chat-strip"));

    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });
});

describe("RiskQuizChatDock — Mistrz Gry", () => {
  const gameMasterMessage = message({
    id: "m-gm",
    authorKind: "GAME_MASTER",
    teamId: null,
    authorName: "Mistrz Gry",
    teamColor: null,
    content: "Za pięć minut przerwa.",
  });

  it("marks the collapsed strip as an announcement", async () => {
    const { getByText, queryByText } = await renderDock({ messages: [gameMasterMessage] });

    expect(getByText("Mistrz Gry")).toBeTruthy();
    expect(getByText("Za pięć minut przerwa.")).toBeTruthy();
    // The label carries the sender, so the preview must not repeat it as a
    // "name: text" line the way a team message does.
    expect(queryByText("Mistrz Gry: Za pięć minut przerwa.")).toBeNull();
  });

  it("keeps the strip label as the room name for a team message", async () => {
    const { getByText } = await renderDock();

    expect(getByText("Czat")).toBeTruthy();
  });

  it("renders the announcement expanded without a team-style author line", async () => {
    const { getByText } = await renderDock({
      messages: [gameMasterMessage],
      isExpanded: true,
    });

    expect(getByText("Mistrz Gry")).toBeTruthy();
    expect(getByText("Za pięć minut przerwa.")).toBeTruthy();
  });
});

describe("RiskQuizChatDock — kolor drużyny", () => {
  it("paints the author name with the banner colour, not the raw palette key", async () => {
    const amber = TEAM_COLORS.find((color) => color.key === "amber");
    expect(amber).toBeDefined();

    const { getByText } = await renderDock({
      isExpanded: true,
      messages: [message({ teamColor: "amber" })],
    });

    const authorNode = getByText("Lisy");
    const style = Array.isArray(authorNode.props.style)
      ? Object.assign({}, ...authorNode.props.style.filter(Boolean))
      : authorNode.props.style;

    // "amber" is a key into the team palette; handing it to a style produces no
    // colour at all, which is exactly the bug this guards.
    expect(style.color).toBe(amber!.hex);
    expect(style.color).not.toBe("amber");
  });
});

describe("RiskQuizChatDock — animacja", () => {
  it("keeps the strip on screen until the animation reaches its midpoint", async () => {
    const props = {
      messages: [message()],
      draft: "",
      canPost: true,
      isSending: false,
      errorMessage: null,
      currentTeamId: "team-1",
      unreadCount: 0,
      keyboardHeight: 0,
      onToggleExpanded: jest.fn(),
      onChangeDraft: jest.fn(),
      onSend: jest.fn(),
    };

    const { rerender, queryByTestId } = await render(
      <RiskQuizChatDock {...props} isExpanded={false} />,
    );
    expect(queryByTestId("risk-chat-strip")).toBeTruthy();

    await rerender(<RiskQuizChatDock {...props} isExpanded />);

    // The box starts growing straight away, but the contents are swapped at the
    // halfway mark so the two can never overlap and steal each other's taps.
    expect(queryByTestId("risk-chat-strip")).toBeTruthy();
    expect(queryByTestId("risk-chat-input")).toBeNull();
  });

  it("renders one dock container in both states", async () => {
    const collapsed = await renderDock();
    expect(collapsed.getByTestId("risk-chat-dock")).toBeTruthy();

    const expanded = await renderDock({ isExpanded: true });
    expect(expanded.getByTestId("risk-chat-dock")).toBeTruthy();
  });
});

describe("RiskQuizChatDock — rozwinięty", () => {
  it("shows the history and the composer", async () => {
    const { getByText, getByTestId } = await renderDock({ isExpanded: true });

    expect(getByText("Idziemy po historię!")).toBeTruthy();
    expect(getByTestId("risk-chat-input")).toBeTruthy();
  });

  it("does not send an empty draft", async () => {
    const onSend = jest.fn();
    const { getByTestId } = await renderDock({ isExpanded: true, draft: "   ", onSend });

    await fireEvent.press(getByTestId("risk-chat-send"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends a written message", async () => {
    const onSend = jest.fn();
    const { getByTestId } = await renderDock({ isExpanded: true, draft: "Cześć", onSend });

    await fireEvent.press(getByTestId("risk-chat-send"));

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("blocks a second send while the first is still in flight", async () => {
    const onSend = jest.fn();
    const { getByTestId } = await renderDock({
      isExpanded: true,
      draft: "Cześć",
      isSending: true,
      onSend,
    });

    await fireEvent.press(getByTestId("risk-chat-send"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("hides the composer and explains why when teams may only read", async () => {
    const { getByText, queryByTestId } = await renderDock({
      isExpanded: true,
      canPost: false,
    });

    expect(getByText("W tym czacie pisze tylko Mistrz Gry.")).toBeTruthy();
    expect(queryByTestId("risk-chat-input")).toBeNull();
  });

  it("surfaces a send error", async () => {
    const { getByText } = await renderDock({
      isExpanded: true,
      errorMessage: "Nie udało się wysłać wiadomości.",
    });

    expect(getByText("Nie udało się wysłać wiadomości.")).toBeTruthy();
  });

  it("collapses again from the header", async () => {
    const onToggleExpanded = jest.fn();
    const { getByTestId } = await renderDock({ isExpanded: true, onToggleExpanded });

    await fireEvent.press(getByTestId("risk-chat-collapse"));

    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });
});
