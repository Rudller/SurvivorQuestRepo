import { shouldShowRiskQuizIntro } from "../model/intro-visibility";

// The screen's own "waiting for the game" card used to appear unconditionally
// on mount and only clear once its first poll came back. After the pre-game
// countdown that meant the tablet showed the briefing again, under "Czekamy na
// rozpoczęcie gry...", one second after it had said START.
describe("shouldShowRiskQuizIntro", () => {
  it("stays out of the way once the game is open", () => {
    expect(shouldShowRiskQuizIntro("in-progress")).toBe(false);
  });

  it("holds the waiting card while the organiser has not started", () => {
    expect(shouldShowRiskQuizIntro("planned")).toBe(true);
  });

  // A session restored from storage can arrive without a status at all; a team
  // waiting is the safe reading, since offering the scan screen for a game that
  // has not started sends them scanning cards that will be rejected.
  it("holds the waiting card when the status is unknown", () => {
    expect(shouldShowRiskQuizIntro(undefined)).toBe(true);
    expect(shouldShowRiskQuizIntro("done")).toBe(true);
  });
});
