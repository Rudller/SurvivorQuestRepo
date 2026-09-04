import { silenceRevealAmount, smoothLoudness } from "./risk-quiz-pig-silence-math";

// Metering arrives in dBFS: 0 is the loudest the hardware can register and the
// scale runs down towards -160 for silence. Rough anchors:
//   quiet room        ~-55 dB
//   whispering        ~-45 dB
//   talking normally  ~-28 dB
//   shouting          ~-10 dB

describe("silenceRevealAmount", () => {
  it("fully reveals the screen in a quiet room", () => {
    expect(silenceRevealAmount(-60)).toBe(1);
    expect(silenceRevealAmount(-45)).toBe(1);
  });

  it("fully hides the screen when the team shouts", () => {
    expect(silenceRevealAmount(-10)).toBe(0);
    expect(silenceRevealAmount(0)).toBe(0);
  });

  it("falls off as the room gets louder", () => {
    const readings = [-45, -38, -30, -24, -18];
    const revealed = readings.map(silenceRevealAmount);

    for (let i = 1; i < revealed.length; i += 1) {
      expect(revealed[i]).toBeLessThan(revealed[i - 1]);
    }
  });

  // dBFS is already a log scale, so the ramp is plain linear across it — unlike
  // the lux curve, which has to take its own logarithm first.
  it("moves evenly across the band", () => {
    const upper = silenceRevealAmount(-40) - silenceRevealAmount(-34);
    const lower = silenceRevealAmount(-28) - silenceRevealAmount(-22);

    expect(upper).toBeCloseTo(lower, 5);
  });

  it("always stays within 0..1, whatever the recorder reports", () => {
    for (const db of [-500, -160, -45, -30, -1, 0, 12, 1e6]) {
      const value = silenceRevealAmount(db);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  // A recorder that reports nothing must not black the screen out with no way
  // back — same rule the light sensor follows.
  it("treats a missing or nonsense reading as silence", () => {
    expect(silenceRevealAmount(Number.NaN)).toBe(1);
    expect(silenceRevealAmount(Number.POSITIVE_INFINITY)).toBe(1);
    expect(silenceRevealAmount(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("smoothLoudness", () => {
  it("takes the first reading as-is", () => {
    expect(smoothLoudness(null, -30)).toBe(-30);
  });

  it("moves toward the new reading without jumping to it", () => {
    const smoothed = smoothLoudness(-50, -10);

    expect(smoothed).toBeGreaterThan(-50);
    expect(smoothed).toBeLessThan(-10);
  });

  it("converges when the room holds steady", () => {
    let value = smoothLoudness(null, -60);
    for (let i = 0; i < 60; i += 1) {
      value = smoothLoudness(value, -20);
    }

    expect(value).toBeCloseTo(-20, 1);
  });

  // One cough or a slammed door should not black the screen out.
  it("barely reacts to a single stray bang", () => {
    const quiet = -50;

    expect(smoothLoudness(quiet, 0)).toBeLessThan(-30);
  });

  it("keeps the last good value when the reading is nonsense", () => {
    expect(smoothLoudness(-30, Number.NaN)).toBe(-30);
    expect(smoothLoudness(-30, Number.POSITIVE_INFINITY)).toBe(-30);
  });

  // Negative is the whole point here — the lux smoother clamps at zero, which
  // would read every dB value as maximum volume.
  it("keeps negative values negative", () => {
    expect(smoothLoudness(-40, -40)).toBeLessThan(0);
  });
});
