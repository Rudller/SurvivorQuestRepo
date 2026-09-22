import {
  RISK_QUIZ_LIVE_POLL_INTERVAL_MS,
  RISK_QUIZ_START_POLL_INTERVAL_MS,
  getRiskQuizSessionPollDelayMs,
} from "./session-poll-delay";

// The Ryzykanci screen used to stop polling the session state the moment the
// realization went `in-progress`, so a company name or logo changed in the
// admin panel mid-game never reached the tablet's top bar — the expedition
// screen, which polls on a plain interval for the whole session, always picked
// it up. The rule below is what keeps the poll alive after the start.
describe("getRiskQuizSessionPollDelayMs", () => {
  it("polls fast while the organiser has not started the game", () => {
    expect(getRiskQuizSessionPollDelayMs("planned")).toBe(RISK_QUIZ_START_POLL_INTERVAL_MS);
  });

  it("keeps polling once the game is open, at the expedition's cadence", () => {
    expect(getRiskQuizSessionPollDelayMs("in-progress")).toBe(RISK_QUIZ_LIVE_POLL_INTERVAL_MS);
  });

  // The actual regression: any answer that reads as "stop" freezes the top bar
  // for the rest of the game.
  it("never asks the screen to stop polling", () => {
    for (const status of ["planned", "in-progress", "done", "cancelled", undefined]) {
      const delay = getRiskQuizSessionPollDelayMs(status);
      expect(typeof delay).toBe("number");
      expect(delay).toBeGreaterThan(0);
    }
  });

  it("falls back to the pre-game cadence for a status it does not know", () => {
    expect(getRiskQuizSessionPollDelayMs(undefined)).toBe(RISK_QUIZ_START_POLL_INTERVAL_MS);
    expect(getRiskQuizSessionPollDelayMs("done")).toBe(RISK_QUIZ_START_POLL_INTERVAL_MS);
  });
});
