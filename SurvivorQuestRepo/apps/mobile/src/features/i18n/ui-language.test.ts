import { resolveUiLanguage } from "./ui-language";

describe("resolveUiLanguage", () => {
  it("returns provided supported language", () => {
    expect(resolveUiLanguage("ukrainian")).toBe("ukrainian");
  });

  it('maps "other" to english', () => {
    expect(resolveUiLanguage("other")).toBe("english");
  });

  it("falls back to polish for missing language", () => {
    expect(resolveUiLanguage(undefined)).toBe("polish");
  });
});
