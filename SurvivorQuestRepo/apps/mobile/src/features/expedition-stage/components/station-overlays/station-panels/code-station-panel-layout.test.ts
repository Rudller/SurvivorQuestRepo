import { resolveCodeKeyboardKeyHeight, resolveCodeKeyboardKeySize } from "./code-station-panel";

describe("resolveCodeKeyboardKeySize", () => {
  it("shrinks keys so the widest row fits a narrow container", () => {
    expect(
      resolveCodeKeyboardKeySize({
        containerWidth: 437,
        containerHeight: 0,
        columnCount: 11,
        rowCount: 4,
        keyGap: 2,
        rowGap: 8,
        preferredKeySize: 46,
        minKeySize: 24,
      }),
    ).toBe(37);
  });

  it("shrinks keys so all four rows fit a short container", () => {
    expect(
      resolveCodeKeyboardKeySize({
        containerWidth: 437,
        containerHeight: 140,
        columnCount: 11,
        rowCount: 4,
        keyGap: 2,
        rowGap: 8,
        preferredKeySize: 46,
        minKeySize: 24,
      }),
    ).toBe(29);
  });

  it("keeps the preferred size when the container has room in both axes", () => {
    expect(
      resolveCodeKeyboardKeySize({
        containerWidth: 700,
        containerHeight: 400,
        columnCount: 11,
        rowCount: 4,
        keyGap: 2,
        rowGap: 8,
        preferredKeySize: 46,
        minKeySize: 24,
      }),
    ).toBe(46);
  });

  it("never shrinks below the minimum tappable key size", () => {
    expect(
      resolveCodeKeyboardKeySize({
        containerWidth: 437,
        containerHeight: 60,
        columnCount: 11,
        rowCount: 4,
        keyGap: 2,
        rowGap: 8,
        preferredKeySize: 46,
        minKeySize: 24,
      }),
    ).toBe(24);
  });

  it("keeps the preferred size until the container has been measured", () => {
    expect(
      resolveCodeKeyboardKeySize({
        containerWidth: 0,
        containerHeight: 0,
        columnCount: 11,
        rowCount: 4,
        keyGap: 2,
        rowGap: 8,
        preferredKeySize: 46,
        minKeySize: 24,
      }),
    ).toBe(46);
  });
});

describe("resolveCodeKeyboardKeyHeight", () => {
  it("stretches keys taller than they are wide to use up spare height", () => {
    expect(
      resolveCodeKeyboardKeyHeight({
        keySize: 58,
        containerHeight: 324,
        rowCount: 4,
        rowGap: 8,
        maxHeightRatio: 1.5,
        minKeyHeight: 24,
      }),
    ).toBe(75);
  });

  it("stops stretching at the tallest key shape allowed", () => {
    expect(
      resolveCodeKeyboardKeyHeight({
        keySize: 58,
        containerHeight: 600,
        rowCount: 4,
        rowGap: 8,
        maxHeightRatio: 1.5,
        minKeyHeight: 24,
      }),
    ).toBe(87);
  });

  it("squashes keys below square when the box is shorter than the rows", () => {
    expect(
      resolveCodeKeyboardKeyHeight({
        keySize: 58,
        containerHeight: 200,
        rowCount: 4,
        rowGap: 8,
        maxHeightRatio: 1.5,
        minKeyHeight: 24,
      }),
    ).toBe(44);
  });

  it("never squashes below the minimum tappable height", () => {
    expect(
      resolveCodeKeyboardKeyHeight({
        keySize: 58,
        containerHeight: 60,
        rowCount: 4,
        rowGap: 8,
        maxHeightRatio: 1.5,
        minKeyHeight: 24,
      }),
    ).toBe(24);
  });

  it("keeps square keys until the box has been measured", () => {
    expect(
      resolveCodeKeyboardKeyHeight({
        keySize: 58,
        containerHeight: 0,
        rowCount: 4,
        rowGap: 8,
        maxHeightRatio: 1.5,
        minKeyHeight: 24,
      }),
    ).toBe(58);
  });
});
