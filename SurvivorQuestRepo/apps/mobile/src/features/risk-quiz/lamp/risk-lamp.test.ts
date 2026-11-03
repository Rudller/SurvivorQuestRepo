import { lampColorCommand, lampDrawCommand } from "./risk-lamp";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

describe("lampDrawCommand", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends the difficulty alone for a card without a time limit", () => {
    expect(lampDrawCommand({ difficulty: "EASY", remainingSeconds: null, station: {} })()).toBe("easy");
  });

  it("sends remaining and total seconds for a timed card", () => {
    expect(lampDrawCommand({ difficulty: "HARD", station: { timeLimitSeconds: 60 } })()).toBe("hard 60/60");
    expect(lampDrawCommand({ difficulty: "MEDIUM", remainingSeconds: 25, station: { timeLimitSeconds: 60 } })()).toBe(
      "medium 25/60",
    );
  });

  it("recomputes the remaining time when resent after a reconnect", () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const build = lampDrawCommand({ difficulty: "HARD", remainingSeconds: 40, station: { timeLimitSeconds: 60 } });
    jest.setSystemTime(1_000_000 + 15_000);
    expect(build()).toBe("hard 25/60");
    jest.setSystemTime(1_000_000 + 90_000);
    expect(build()).toBe("hard 0/60");
  });
});

describe("lampColorCommand", () => {
  it("expands a team color to the cRRGGBB command", () => {
    expect(lampColorCommand("#F59E0B")).toBe("cf59e0b");
    expect(lampColorCommand("#fa0")).toBe("cffaa00");
  });

  it("falls back to the idle rainbow for an unreadable color", () => {
    expect(lampColorCommand("orange")).toBe("idle");
  });
});
