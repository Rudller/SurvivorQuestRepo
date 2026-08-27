import {
  START_COUNTDOWN_GO_MS,
  START_COUNTDOWN_MAX_MS,
  resolveStartCountdown,
} from "./start-countdown";

describe("resolveStartCountdown", () => {
  it("opens on ten and counts down whole seconds", () => {
    expect(resolveStartCountdown(10_000, 0)).toEqual({ phase: "counting", secondsLeft: 10 });
    expect(resolveStartCountdown(10_000, 1_000)).toEqual({ phase: "counting", secondsLeft: 9 });
    expect(resolveStartCountdown(10_000, 9_500)).toEqual({ phase: "counting", secondsLeft: 1 });
  });

  // Anything still on screen counts as that second, so a tablet 200ms into the
  // last second shows "1" rather than rounding itself to zero early.
  it("holds a second until it has fully elapsed", () => {
    expect(resolveStartCountdown(10_000, 8_001)).toEqual({ phase: "counting", secondsLeft: 2 });
    expect(resolveStartCountdown(10_000, 9_999)).toEqual({ phase: "counting", secondsLeft: 1 });
  });

  it("shows START for a beat once the count runs out", () => {
    expect(resolveStartCountdown(10_000, 10_000)).toEqual({ phase: "go", secondsLeft: 0 });
    expect(resolveStartCountdown(10_000, 10_000 + START_COUNTDOWN_GO_MS - 1)).toEqual({
      phase: "go",
      secondsLeft: 0,
    });
  });

  it("hands over to the game once START has had its beat", () => {
    expect(resolveStartCountdown(10_000, 10_000 + START_COUNTDOWN_GO_MS)).toEqual({
      phase: "done",
      secondsLeft: 0,
    });
  });

  // A team joining after the count finished, and a realization started before
  // the server stamped one, both have to land straight in the game.
  it.each([null, undefined, 0, -5_000, Number.NaN])(
    "treats %p as a game that is already open",
    (remaining) => {
      expect(resolveStartCountdown(remaining, 0)).toEqual({ phase: "done", secondsLeft: 0 });
    },
  );

  it("never renders more than the countdown it is allowed to show", () => {
    expect(resolveStartCountdown(400_000, 0)).toEqual({
      phase: "counting",
      secondsLeft: START_COUNTDOWN_MAX_MS / 1000,
    });
  });

  // A device that noticed the start late gets the tail of the count, not a
  // fresh ten — that is the whole point of the server sending a remainder.
  it("picks up mid-count for a device that polled late", () => {
    expect(resolveStartCountdown(6_400, 0)).toEqual({ phase: "counting", secondsLeft: 7 });
    expect(resolveStartCountdown(6_400, 3_000)).toEqual({ phase: "counting", secondsLeft: 4 });
  });
});
