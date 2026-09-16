import type { RiskChatMessage } from "../api/risk-quiz.api";
import { describeRiskFeedEvent } from "./risk-quiz-feed-text";

function event(overrides: Partial<RiskChatMessage> = {}): RiskChatMessage {
  return {
    id: "m-1",
    authorKind: "SYSTEM",
    teamId: "team-1",
    authorName: "System",
    content: "Polski fallback z serwera.",
    systemEvent: null,
    payload: null,
    teamColor: null,
    teamBadgeImageUrl: null,
    createdAt: "2026-09-13T10:05:00.000Z",
    ...overrides,
  };
}

describe("describeRiskFeedEvent", () => {
  it("words a scored card from its payload, with the multiplier only when it bites", () => {
    const scored = event({
      systemEvent: "card-scored",
      payload: { teamName: "Sokoły", points: 15, multiplier: 1.5 },
    });
    expect(describeRiskFeedEvent(scored, "polish")).toBe("Sokoły zdobywa 15 pkt (x1.5)");
    expect(describeRiskFeedEvent(scored, "english")).toBe("Sokoły score 15 pts (x1.5)");

    const flat = event({
      systemEvent: "card-scored",
      payload: { teamName: "Sokoły", points: 10, multiplier: 1 },
    });
    expect(describeRiskFeedEvent(flat, "polish")).toBe("Sokoły zdobywa 10 pkt");
  });

  it("names the pig in the tablet's language and masks a hidden thrower", () => {
    const named = event({
      systemEvent: "pig-thrown",
      payload: { fromName: "Lisy", targetName: "Sokoły", pigType: "FOG" },
    });
    expect(describeRiskFeedEvent(named, "polish")).toBe("Lisy rzuca świnię „Mgła” w Sokoły");
    expect(describeRiskFeedEvent(named, "english")).toBe("Lisy throw the “Fog” pig at Sokoły");

    const masked = event({
      systemEvent: "pig-thrown",
      payload: { fromName: null, targetName: "Sokoły", pigType: "FOG" },
    });
    expect(describeRiskFeedEvent(masked, "polish")).toBe("Ktoś rzuca świnię „Mgła” w Sokoły");
    expect(describeRiskFeedEvent(masked, "english")).toBe("Someone throws the “Fog” pig at Sokoły");
  });

  it("covers the derived game events", () => {
    expect(describeRiskFeedEvent(event({ systemEvent: "game-start", payload: {} }), "english")).toBe(
      "Game on. Good luck!",
    );
    expect(describeRiskFeedEvent(event({ systemEvent: "game-end", payload: {} }), "polish")).toBe(
      "Koniec gry. Dziękujemy za grę!",
    );
    expect(
      describeRiskFeedEvent(
        event({ systemEvent: "lead-change", payload: { teamName: "Orły", points: 40 } }),
        "polish",
      ),
    ).toBe("Orły wychodzi na prowadzenie (40 pkt)");
    expect(
      describeRiskFeedEvent(
        event({ systemEvent: "deck-exhausted", payload: { teamName: "Orły", categoryName: "Historia" } }),
        "english",
      ),
    ).toBe("Orły have used up the “Historia” cards");
  });

  it("prefixes a Game Master announcement with who is speaking", () => {
    const announcement = event({
      authorKind: "GAME_MASTER",
      teamId: null,
      authorName: "Mistrz Gry",
      content: "Przerwa 5 minut.",
    });
    expect(describeRiskFeedEvent(announcement, "polish")).toBe("Mistrz Gry: Przerwa 5 minut.");
    expect(describeRiskFeedEvent(announcement, "english")).toBe("Game Master: Przerwa 5 minut.");
  });

  it("falls back to the server wording for an unknown event or a broken payload", () => {
    expect(describeRiskFeedEvent(event({ systemEvent: "something-new", payload: {} }), "english")).toBe(
      "Polski fallback z serwera.",
    );
    expect(
      describeRiskFeedEvent(event({ systemEvent: "card-scored", payload: { points: "many" } }), "english"),
    ).toBe("Polski fallback z serwera.");
    expect(describeRiskFeedEvent(event({ systemEvent: "card-scored", payload: null }), "english")).toBe(
      "Polski fallback z serwera.",
    );
  });
});
