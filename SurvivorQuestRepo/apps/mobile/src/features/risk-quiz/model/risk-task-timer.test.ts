import { resolveRiskTaskStartSeconds, shouldExpireRiskTask } from "./risk-task-timer";

describe("resolveRiskTaskStartSeconds", () => {
  it("starts from what the server says is left, so a rescan keeps counting", () => {
    expect(resolveRiskTaskStartSeconds({ remainingSeconds: 12, station: { timeLimitSeconds: 60 } })).toBe(12);
  });

  it("starts at zero for a card rescanned after its time ran out", () => {
    expect(resolveRiskTaskStartSeconds({ remainingSeconds: 0, station: { timeLimitSeconds: 60 } })).toBe(0);
  });

  it("has no clock for a station without a limit", () => {
    expect(resolveRiskTaskStartSeconds({ remainingSeconds: null, station: { timeLimitSeconds: 60 } })).toBeNull();
  });

  it("falls back to the full limit when an older backend sends no remaining time", () => {
    expect(resolveRiskTaskStartSeconds({ station: { timeLimitSeconds: 45 } })).toBe(45);
    expect(resolveRiskTaskStartSeconds({ station: { timeLimitSeconds: 0 } })).toBeNull();
  });
});

describe("shouldExpireRiskTask", () => {
  const base = {
    remainingSeconds: 0,
    hasActiveDraw: true,
    hasAnswerResult: false,
    alreadySubmitted: false,
    timeoutsDisabled: false,
  };

  it("expires an unanswered card when the clock hits zero", () => {
    expect(shouldExpireRiskTask(base)).toBe(true);
  });

  it("waits while there is time left or no clock at all", () => {
    expect(shouldExpireRiskTask({ ...base, remainingSeconds: 1 })).toBe(false);
    expect(shouldExpireRiskTask({ ...base, remainingSeconds: null })).toBe(false);
  });

  it("leaves alone a card that was already answered or handed in for review", () => {
    expect(shouldExpireRiskTask({ ...base, hasAnswerResult: true })).toBe(false);
    expect(shouldExpireRiskTask({ ...base, alreadySubmitted: true })).toBe(false);
  });

  it("does nothing when the test-menu switch turned timeouts off", () => {
    expect(shouldExpireRiskTask({ ...base, timeoutsDisabled: true })).toBe(false);
  });
});
