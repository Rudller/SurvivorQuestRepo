import {
  EXPEDITION_THEME,
  getExpeditionThemeFamily,
  getExpeditionThemeMode,
  getExpeditionThemePalette,
  setExpeditionThemeMode,
} from "./constants";

afterEach(() => {
  setExpeditionThemeMode("dark", "expedition");
});

describe("expedition theme registry", () => {
  it("defaults to the expedition family so existing callers keep the green palette", () => {
    setExpeditionThemeMode("dark");

    expect(getExpeditionThemeFamily()).toBe("expedition");
    expect(EXPEDITION_THEME.background).toBe("#0f1914");
  });

  it("switches the live proxy to the risk palette when the risk family is active", () => {
    setExpeditionThemeMode("dark", "risk");

    expect(getExpeditionThemeMode()).toBe("dark");
    expect(getExpeditionThemeFamily()).toBe("risk");
    expect(EXPEDITION_THEME.background).toBe("#071017");
    expect(EXPEDITION_THEME.accent).toBe("#c89439");
    expect(EXPEDITION_THEME.textPrimary).toBe("#f0f0f0");
  });

  it("keeps a light variant per family", () => {
    setExpeditionThemeMode("light", "risk");

    expect(EXPEDITION_THEME.background).toBe("#e8ecef");
    expect(EXPEDITION_THEME.textPrimary).toBe("#071017");
    // Raw gold is unreadable on a light surface, so the light variant darkens it.
    expect(EXPEDITION_THEME.accent).not.toBe("#c89439");
  });

  it("exposes every family/mode combination through getExpeditionThemePalette", () => {
    const combinations = (["dark", "light"] as const).flatMap((mode) =>
      (["expedition", "risk"] as const).map((family) => getExpeditionThemePalette(mode, family)),
    );

    const backgrounds = combinations.map((palette) => palette.background);
    expect(new Set(backgrounds).size).toBe(4);
    for (const palette of combinations) {
      expect(Object.values(palette).every((value) => typeof value === "string" && value.length > 0)).toBe(true);
    }
  });

  it("reads the active palette without mutating it when no argument is given", () => {
    setExpeditionThemeMode("dark", "risk");

    expect(getExpeditionThemePalette()).toEqual(getExpeditionThemePalette("dark", "risk"));
  });
});
