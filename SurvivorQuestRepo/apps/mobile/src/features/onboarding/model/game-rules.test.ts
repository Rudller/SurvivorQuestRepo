import { shouldShowGameRulesPopup } from "./game-rules";
import type { OnboardingRealizationSummary, OnboardingSession } from "./types";

function buildSession(
  overrides: {
    session?: Partial<OnboardingSession>;
    realization?: Partial<OnboardingRealizationSummary> | null;
  } = {},
): OnboardingSession {
  const realization: OnboardingRealizationSummary | null =
    overrides.realization === null
      ? null
      : {
          id: "realization-1",
          companyName: "Acme",
          status: "in-progress",
          scheduledAt: new Date().toISOString(),
          durationMinutes: 120,
          teamCount: 4,
          stationIds: [],
          locationRequired: false,
          showLeaderboard: true,
          gameRules: "- Zasada pierwsza",
          ...overrides.realization,
        };

  return {
    realizationId: "realization-1",
    realizationCode: "ABC123",
    sessionToken: "token",
    apiBaseUrl: "http://localhost:3001",
    realization,
    awaitingAdminStart: false,
    showGameRulesAfterStart: true,
    team: {
      slotNumber: 1,
      name: "Drużyna 1",
      colorKey: "amber",
      colorLabel: "Bursztynowy",
      colorHex: "#f59e0b",
      icon: "star",
    },
    ...overrides.session,
  };
}

describe("shouldShowGameRulesPopup", () => {
  it("shows the popup once a normal realization has started", () => {
    expect(shouldShowGameRulesPopup(buildSession(), false)).toBe(true);
  });

  it("still shows the popup for other realization types", () => {
    const session = buildSession({ realization: { type: "expedition" } });

    expect(shouldShowGameRulesPopup(session, false)).toBe(true);
  });

  // Ryzykanci used to be excluded by type. They now get the "Zasady gry" field
  // in the admin panel like every other type, so the popup has to follow.
  it("shows the popup for Ryzykanci once they have rules text", () => {
    const session = buildSession({
      session: { showGameRulesAfterStart: true },
      realization: { type: "risk-quiz" },
    });

    expect(shouldShowGameRulesPopup(session, false)).toBe(true);
  });

  it("keeps Ryzykanci without rules text popup-free", () => {
    const session = buildSession({
      session: { showGameRulesAfterStart: true },
      realization: { type: "risk-quiz", gameRules: "   " },
    });

    expect(shouldShowGameRulesPopup(session, false)).toBe(false);
  });

  it("holds the popup back while the team is still waiting for the admin", () => {
    expect(shouldShowGameRulesPopup(buildSession(), true)).toBe(false);
  });

  it("stays hidden once the popup has been dismissed", () => {
    const session = buildSession({ session: { showGameRulesAfterStart: false } });

    expect(shouldShowGameRulesPopup(session, false)).toBe(false);
  });

  it("stays hidden when the realization has no rules text", () => {
    expect(shouldShowGameRulesPopup(buildSession({ realization: { gameRules: "   " } }), false)).toBe(false);
    expect(shouldShowGameRulesPopup(buildSession({ realization: { gameRules: undefined } }), false)).toBe(false);
  });

  it("stays hidden without a session", () => {
    expect(shouldShowGameRulesPopup(null, false)).toBe(false);
    expect(shouldShowGameRulesPopup(buildSession({ realization: null }), false)).toBe(false);
  });
});
