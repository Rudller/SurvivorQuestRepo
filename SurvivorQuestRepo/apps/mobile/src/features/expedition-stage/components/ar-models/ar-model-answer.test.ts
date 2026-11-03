import { normalizeOpenAnswer } from "../station-overlays/puzzle-helpers";
import {
  BOMB_WIRES,
  PUZZLE_SYMBOLS,
  buildDigitAnswer,
  buildTokenAnswer,
  countDigits,
  parseTokens,
} from "./ar-model-answer";

const WIRE_KEYS = BOMB_WIRES.map((wire) => wire.key);

describe("ar-model-answer", () => {
  it("keeps the admin's separators when building a safe code", () => {
    expect(countDigits("4-1-7")).toBe(3);
    expect(buildDigitAnswer("4-1-7", [4, 1, 7])).toBe("4-1-7");
    expect(buildDigitAnswer("4-1-7", [3, 1, 7])).toBe("3-1-7");
    expect(buildDigitAnswer("", [1, 2, 3])).toBe("123");
  });

  it("reads wire colours regardless of case and Polish characters", () => {
    expect(parseTokens("Niebieski, ZOLTY, czerwony", WIRE_KEYS)).toEqual(["niebieski", "żółty", "czerwony"]);
  });

  it("builds a wire answer that matches the expected one after normalization", () => {
    const expected = "niebieski, żółty, czerwony";
    const correct = buildTokenAnswer(expected, WIRE_KEYS, ["niebieski", "żółty", "czerwony"]);
    const wrong = buildTokenAnswer(expected, WIRE_KEYS, ["żółty", "niebieski", "czerwony"]);
    expect(normalizeOpenAnswer(correct)).toBe(normalizeOpenAnswer(expected));
    expect(normalizeOpenAnswer(wrong)).not.toBe(normalizeOpenAnswer(expected));
  });

  it("never accepts extra picks beyond the expected sequence", () => {
    const answer = buildTokenAnswer("księżyc, gwiazda", PUZZLE_SYMBOLS, ["księżyc", "gwiazda", "klucz"]);
    expect(normalizeOpenAnswer(answer)).not.toBe(normalizeOpenAnswer("księżyc, gwiazda"));
  });

  it("falls back to a comma list when the admin answer has no known words", () => {
    expect(buildTokenAnswer("???", PUZZLE_SYMBOLS, ["słońce", "klucz"])).toBe("słońce, klucz");
  });
});
