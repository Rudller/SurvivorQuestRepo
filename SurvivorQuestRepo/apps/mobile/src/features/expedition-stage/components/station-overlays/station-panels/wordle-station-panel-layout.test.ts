import { resolveWordleMediaCellSize } from "./wordle-station-panel";

describe("resolveWordleMediaCellSize", () => {
  it("shrinks cells vertically so all six answer rows fit a short container", () => {
    expect(
      resolveWordleMediaCellSize({
        containerWidth: 320,
        containerHeight: 140,
        displayLength: 5,
        preferredCellSize: 52,
        letterGap: 6,
        rowGap: 6,
      }),
    ).toBe(14);
  });

  it("keeps the preferred size when the container has enough room", () => {
    expect(
      resolveWordleMediaCellSize({
        containerWidth: 500,
        containerHeight: 500,
        displayLength: 5,
        preferredCellSize: 52,
        letterGap: 6,
        rowGap: 6,
      }),
    ).toBe(52);
  });

  it("also shrinks cells horizontally for longer answers", () => {
    expect(
      resolveWordleMediaCellSize({
        containerWidth: 240,
        containerHeight: 500,
        displayLength: 12,
        preferredCellSize: 38,
        letterGap: 2,
        rowGap: 4,
      }),
    ).toBe(16);
  });
});
