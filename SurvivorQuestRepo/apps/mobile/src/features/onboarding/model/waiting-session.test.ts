import { applyLiveIntroText } from "./waiting-session";
import type { OnboardingRealizationSummary, OnboardingSession } from "./types";

function buildSession(realization?: Partial<OnboardingRealizationSummary> | null): OnboardingSession {
  return {
    realizationId: "realization-1",
    realizationCode: "ABC123",
    sessionToken: "token",
    apiBaseUrl: "http://localhost:3001",
    awaitingAdminStart: true,
    realization:
      realization === null
        ? null
        : {
            id: "realization-1",
            companyName: "Acme",
            status: "planned",
            scheduledAt: new Date().toISOString(),
            durationMinutes: 120,
            teamCount: 4,
            stationIds: [],
            locationRequired: false,
            showLeaderboard: true,
            introText: "Stara treść",
            ...realization,
          },
    team: {
      slotNumber: 1,
      name: "Drużyna 1",
      colorKey: "amber",
      colorLabel: "Bursztynowy",
      colorHex: "#f59e0b",
      icon: "star",
    },
  };
}

describe("applyLiveIntroText", () => {
  it("hands back a session carrying the text the admin just saved", () => {
    const next = applyLiveIntroText(buildSession(), "Nowa treść");

    expect(next?.realization?.introText).toBe("Nowa treść");
  });

  // The caller writes state (and restarts its poll) on every non-null result,
  // so an unchanged poll MUST come back null or the waiting screen spins.
  it("returns null when the text has not moved", () => {
    expect(applyLiveIntroText(buildSession(), "Stara treść")).toBeNull();
  });

  it("returns null when the poll carried no text at all", () => {
    expect(applyLiveIntroText(buildSession(), undefined)).toBeNull();
  });

  // An admin clearing the field is a real edit, not a missing value.
  it("accepts the text being emptied", () => {
    const next = applyLiveIntroText(buildSession(), "");

    expect(next).not.toBeNull();
    expect(next?.realization?.introText).toBe("");
  });

  it("fills in a realization that joined without any intro text", () => {
    const next = applyLiveIntroText(buildSession({ introText: undefined }), "Nowa treść");

    expect(next?.realization?.introText).toBe("Nowa treść");
  });

  it("leaves the rest of the session untouched", () => {
    const session = buildSession();
    const next = applyLiveIntroText(session, "Nowa treść");

    expect(next).not.toBe(session);
    expect(next?.sessionToken).toBe(session.sessionToken);
    expect(next?.team).toEqual(session.team);
    expect(next?.realization?.companyName).toBe("Acme");
    expect(session.realization?.introText).toBe("Stara treść");
  });

  it("returns null without a realization to update", () => {
    expect(applyLiveIntroText(buildSession(null), "Nowa treść")).toBeNull();
  });
});
