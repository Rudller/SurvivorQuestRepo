import { buildFogPuffs, fogRubbedLevel, fogWipeAmount } from "./risk-quiz-pig-effects";

// The iPad Air the game is actually played on, and a phone for the small branch.
const TABLET = { width: 820, height: 1180 };
const PHONE = { width: 390, height: 844 };

describe("buildFogPuffs", () => {
  it("puts more puffs on a tablet than on a phone", () => {
    const tablet = buildFogPuffs(TABLET.width, TABLET.height, true);
    const phone = buildFogPuffs(PHONE.width, PHONE.height, false);

    expect(phone.length).toBeGreaterThan(0);
    expect(tablet.length).toBeGreaterThan(phone.length);
  });

  it("returns nothing before the layout has been measured", () => {
    expect(buildFogPuffs(0, 0, true)).toEqual([]);
    expect(buildFogPuffs(820, 0, true)).toEqual([]);
  });

  it("gives every other row an extra puff so both side edges stay covered", () => {
    // 4x6 with an extra puff on each of the 3 offset rows, 3x5 with an extra on
    // each of its 2. Offset rows start on the left edge instead of half a step
    // in, which is what stops the bottom-left corner going bare.
    expect(buildFogPuffs(TABLET.width, TABLET.height, true)).toHaveLength(4 * 6 + 3);
    expect(buildFogPuffs(PHONE.width, PHONE.height, false)).toHaveLength(3 * 5 + 2);
  });

  it("varies puff size so the field does not read as a grid of identical circles", () => {
    const diameters = buildFogPuffs(TABLET.width, TABLET.height, true).map((puff) => puff.diameter);
    const smallest = Math.min(...diameters);
    const largest = Math.max(...diameters);

    expect(new Set(diameters).size).toBeGreaterThan(1);
    // Only ever grown from the base size, and never so far that a puff dwarfs
    // its neighbours.
    expect(largest / smallest).toBeGreaterThan(1.05);
    expect(largest / smallest).toBeLessThan(1.4);
  });

  it("covers every corner of the screen, including past the edges", () => {
    for (const { width, height, isTablet } of [
      { ...TABLET, isTablet: true },
      { ...PHONE, isTablet: false },
    ]) {
      const puffs = buildFogPuffs(width, height, isTablet);
      const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
      ];

      for (const corner of corners) {
        const isCovered = puffs.some(
          (puff) =>
            Math.hypot(puff.centreX - corner.x, puff.centreY - corner.y) < puff.diameter / 2,
        );
        expect(isCovered).toBe(true);
      }
    }
  });
});

describe("fogWipeAmount", () => {
  it("takes the most off at the centre of the rub", () => {
    expect(fogWipeAmount(0, 100)).toBeCloseTo(1);
  });

  it("falls off with distance", () => {
    const near = fogWipeAmount(20, 100);
    const far = fogWipeAmount(70, 100);

    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it("takes nothing off outside the radius", () => {
    expect(fogWipeAmount(100, 100)).toBe(0);
    expect(fogWipeAmount(400, 100)).toBe(0);
  });

  it("takes nothing off before the layout has given it a radius", () => {
    expect(fogWipeAmount(0, 0)).toBe(0);
  });
});

// The pig has to visibly answer the finger. An earlier tuning removed so little
// per rub that a whole swipe across the screen barely moved the haze, and every
// test still passed — so the strength of a rub is asserted here directly.
describe("fogRubbedLevel", () => {
  const RADIUS = 190;

  it("takes most of a puff out in a single rub over its centre", () => {
    expect(fogRubbedLevel(1, 0, RADIUS)).toBeLessThan(0.2);
  });

  it("bottoms out rather than going negative", () => {
    expect(fogRubbedLevel(0.1, 0, RADIUS)).toBe(0);
  });

  it("barely touches a puff caught at the edge of the rub", () => {
    expect(fogRubbedLevel(1, RADIUS * 0.9, RADIUS)).toBeGreaterThan(0.95);
  });

  it("leaves a puff outside the rub alone", () => {
    expect(fogRubbedLevel(1, RADIUS * 1.5, RADIUS)).toBe(1);
  });

  it("clears a puff within a couple of rubs as a finger passes over it", () => {
    // A swipe credits a rub every FOG_MIN_TRAVEL_PX, so a puff the finger
    // crosses takes several hits at decreasing distance.
    let level = 1;
    for (const distance of [RADIUS * 0.6, RADIUS * 0.3, 0]) {
      level = fogRubbedLevel(level, distance, RADIUS);
    }

    expect(level).toBe(0);
  });
});
