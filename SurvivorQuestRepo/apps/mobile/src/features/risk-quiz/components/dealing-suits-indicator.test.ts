import { buildSuitOpacityRange } from "./dealing-suits-indicator";

const COUNT = 4;
const DIM = 0.2;

describe("buildSuitOpacityRange", () => {
  // Animated.interpolate throws on a non-monotonic inputRange, and the wrapping
  // suit is the one that has to be assembled differently to stay sorted.
  it.each([0, 1, 2, 3])("keeps the input range sorted for suit %i", (index) => {
    const { inputRange } = buildSuitOpacityRange(index, COUNT, DIM);

    expect(inputRange).toEqual([...inputRange].sort((a, b) => a - b));
    expect(new Set(inputRange).size).toBe(inputRange.length);
  });

  it.each([0, 1, 2, 3])("spans the whole cycle for suit %i", (index) => {
    const { inputRange, outputRange } = buildSuitOpacityRange(index, COUNT, DIM);

    expect(inputRange[0]).toBe(0);
    expect(inputRange[inputRange.length - 1]).toBe(COUNT);
    expect(outputRange).toHaveLength(inputRange.length);
  });

  it.each([0, 1, 2, 3])("puts full brightness on suit %i's own beat", (index) => {
    const { inputRange, outputRange } = buildSuitOpacityRange(index, COUNT, DIM);
    const lit = inputRange
      .map((value, position) => ({ value, opacity: outputRange[position] }))
      .filter((entry) => entry.opacity === 1)
      .map((entry) => entry.value);

    // Suit 0 peaks at both ends of the cycle — that IS its single beat, split
    // across the loop's seam.
    expect(lit).toEqual(index === 0 ? [0, COUNT] : [index]);
  });

  // The loop resets the driving value from `count` straight back to 0, so a
  // mismatch across that seam would show up as a visible flicker every pass.
  it.each([0, 1, 2, 3])("matches brightness across the loop seam for suit %i", (index) => {
    const { outputRange } = buildSuitOpacityRange(index, COUNT, DIM);

    expect(outputRange[0]).toBe(outputRange[outputRange.length - 1]);
  });

  it("rests every other suit at the dim value", () => {
    const { outputRange } = buildSuitOpacityRange(2, COUNT, DIM);

    expect(outputRange.filter((value) => value !== 1)).toEqual([DIM, DIM, DIM, DIM]);
  });
});
