import {
  CAESAR_TEXT_GLYPH_WIDTH_RATIO,
  CAESAR_TEXT_LINE_HEIGHT_RATIO,
  fitCaesarFontSize,
  wrapWordsToWidth,
} from "./puzzle-helpers";

const LETTER_SPACING = 5;

function layoutOf(text: string, fontSize: number, width: number) {
  const charWidth = fontSize * CAESAR_TEXT_GLYPH_WIDTH_RATIO + LETTER_SPACING;
  return wrapWordsToWidth(text.split(" "), charWidth, width);
}

describe("fitCaesarFontSize", () => {
  // Tablet panel: roughly what the Galaxy Tab Active5 Pro gives the cipher.
  const tablet = { maxFontSize: 72, minFontSize: 12, letterSpacing: LETTER_SPACING, width: 600, height: 260 };

  it("keeps the full size when a short word fits on one line", () => {
    expect(fitCaesarFontSize({ ...tablet, text: "ALERT" })).toBe(72);
  });

  it("shrinks a four-word phrase until every word is on screen", () => {
    // A short panel: at full size the phrase wraps to three lines that don't fit.
    const panel = { ...tablet, height: 180 };
    const text = "XEOFOP OSHY TVDC QETMI";
    const fontSize = fitCaesarFontSize({ ...panel, text });
    const lines = layoutOf(text, fontSize, panel.width);

    expect(fontSize).toBeLessThan(72);
    expect(lines.flat()).toEqual(text.split(" "));
    expect(lines.length * fontSize * CAESAR_TEXT_LINE_HEIGHT_RATIO).toBeLessThanOrEqual(panel.height);
  });

  it("fits a seven-word English phrase without dropping any word", () => {
    const text = "WIEVGL JSV XLI GSHI SR XLI QET";
    const fontSize = fitCaesarFontSize({ ...tablet, text });
    const lines = layoutOf(text, fontSize, tablet.width);

    expect(lines.flat()).toHaveLength(7);
    expect(lines.length * fontSize * CAESAR_TEXT_LINE_HEIGHT_RATIO).toBeLessThanOrEqual(tablet.height);
  });

  it("never splits a word: the longest word sets the ceiling", () => {
    const text = "KONSTANTYNOPOLITANCZYKOWIANECZKA";
    const fontSize = fitCaesarFontSize({ ...tablet, text });

    expect(text.length * (fontSize * CAESAR_TEXT_GLYPH_WIDTH_RATIO + LETTER_SPACING)).toBeLessThanOrEqual(tablet.width);
  });

  it("falls back to the floor when even that cannot fit", () => {
    expect(fitCaesarFontSize({ ...tablet, width: 40, height: 10, text: "SZUKAJ KODU" })).toBe(12);
  });

  it("uses the full size before the panel has been measured", () => {
    expect(fitCaesarFontSize({ ...tablet, width: 0, height: 0, text: "SZUKAJ KODU PRZY MAPIE" })).toBe(72);
  });
});
