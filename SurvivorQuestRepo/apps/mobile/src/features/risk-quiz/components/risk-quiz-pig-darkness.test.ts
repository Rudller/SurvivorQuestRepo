import { darknessRevealAmount, smoothIlluminance } from "./risk-quiz-pig-effects";

// Rough real-world anchors, so the numbers below are not arbitrary:
//   moonlight        ~1 lx
//   candle-lit room  ~10 lx
//   living room      ~100 lx
//   office          ~400 lx
//   overcast day   ~1000 lx
//   direct sun    ~10000 lx

describe("darknessRevealAmount", () => {
  it("fully reveals the screen in the dark", () => {
    expect(darknessRevealAmount(0)).toBe(1);
    expect(darknessRevealAmount(1)).toBeGreaterThan(0.9);
  });

  it("fully hides the screen in a lit room", () => {
    expect(darknessRevealAmount(1000)).toBe(0);
    expect(darknessRevealAmount(10000)).toBe(0);
  });

  it("falls off as the light rises", () => {
    const readings = [0, 5, 25, 60, 120, 400];
    const revealed = readings.map(darknessRevealAmount);

    for (let i = 1; i < revealed.length; i += 1) {
      expect(revealed[i]).toBeLessThan(revealed[i - 1]);
    }
  });

  // The whole reason the curve is logarithmic. Cupping your hands over the
  // tablet in a dim room takes it from ~20 lx to ~2 lx — a 18 lx change that
  // has to be worth far more on screen than the same 18 lx somewhere up near
  // daylight, where it is nothing at all.
  it("weighs a small change far more when it is already dark", () => {
    // Both pairs are 18 lx apart and both sit inside the ramp, so the only
    // thing separating them is where on the curve they land.
    const nearDark = darknessRevealAmount(2) - darknessRevealAmount(20);
    const nearBright = darknessRevealAmount(100) - darknessRevealAmount(118);

    expect(nearBright).toBeGreaterThan(0);
    expect(nearDark).toBeGreaterThan(nearBright * 4);
  });

  it("always stays within 0..1, whatever the sensor reports", () => {
    for (const lux of [-50, -1, 0, 0.5, 12, 800, 1e6, Number.MAX_VALUE]) {
      const value = darknessRevealAmount(lux);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  // A dead or wedged sensor reporting garbage must not black the screen out
  // with no way back — treat it as "cannot tell" and leave the screen readable.
  it("treats a nonsense reading as fully revealed", () => {
    expect(darknessRevealAmount(Number.NaN)).toBe(1);
    expect(darknessRevealAmount(Number.POSITIVE_INFINITY)).toBe(1);
    expect(darknessRevealAmount(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("smoothIlluminance", () => {
  it("takes the first reading as-is", () => {
    expect(smoothIlluminance(null, 120)).toBe(120);
  });

  it("moves toward the new reading without jumping to it", () => {
    const smoothed = smoothIlluminance(0, 100);

    expect(smoothed).toBeGreaterThan(0);
    expect(smoothed).toBeLessThan(100);
  });

  it("converges when the reading holds steady", () => {
    let value = smoothIlluminance(null, 0);
    for (let i = 0; i < 40; i += 1) {
      value = smoothIlluminance(value, 100);
    }

    expect(value).toBeCloseTo(100, 0);
  });

  // Fluorescent tubes and phone torches make the raw feed jump around; the
  // point of smoothing is that one stray sample cannot flash the screen.
  it("barely reacts to a single stray spike", () => {
    const steady = 10;
    const spiked = smoothIlluminance(steady, 5000);

    expect(spiked).toBeLessThan(steady + 5000 * 0.35);
  });

  it("ignores a nonsense reading and keeps the last good value", () => {
    expect(smoothIlluminance(42, Number.NaN)).toBe(42);
    expect(smoothIlluminance(42, Number.POSITIVE_INFINITY)).toBe(42);
  });
});
