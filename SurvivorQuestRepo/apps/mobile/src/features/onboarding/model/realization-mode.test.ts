import {
  parseRealizationType,
  parseThemePack,
  resolveRealizationMode,
  resolveThemeFamily,
} from "./realization-mode";

describe("parseRealizationType", () => {
  it("accepts every type the backend contract defines", () => {
    for (const type of [
      "outdoor-games",
      "hotel-games",
      "workshops",
      "evening-attractions",
      "dj",
      "recreation",
      "risk-quiz",
    ]) {
      expect(parseRealizationType(type)).toBe(type);
    }
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseRealizationType("  risk-quiz  ")).toBe("risk-quiz");
  });

  it.each([
    ["unknown value", "crime-story"],
    ["empty string", ""],
    ["wrong case", "RISK_QUIZ"],
    ["number", 7],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, raw) => {
    expect(parseRealizationType(raw)).toBeUndefined();
  });
});

describe("resolveRealizationMode", () => {
  it("routes risk-quiz realizations to their own engine", () => {
    expect(resolveRealizationMode({ type: "risk-quiz" })).toBe("risk-quiz");
  });

  it.each(["outdoor-games", "hotel-games", "workshops", "evening-attractions", "dj", "recreation"])(
    "routes %s to the expedition engine",
    (type) => {
      expect(resolveRealizationMode({ type })).toBe("expedition");
    },
  );

  it("falls back to the expedition engine for an unknown or missing type", () => {
    // Degrading to expedition rather than throwing is deliberate: a contract
    // drift must not brick a device mid-game in the field. parseRealizationType
    // is what leaves a trace in dev.
    expect(resolveRealizationMode({ type: "crime-story" })).toBe("expedition");
    expect(resolveRealizationMode({})).toBe("expedition");
    expect(resolveRealizationMode(undefined)).toBe("expedition");
    expect(resolveRealizationMode(null)).toBe("expedition");
  });
});

describe("parseThemePack", () => {
  it("accepts the packs the backend defines", () => {
    expect(parseThemePack("standard")).toBe("standard");
    expect(parseThemePack("crime")).toBe("crime");
    expect(parseThemePack("christmas")).toBe("christmas");
    expect(parseThemePack("  crime  ")).toBe("crime");
  });

  it.each([
    ["unknown pack", "noir"],
    ["wrong case", "CRIME"],
    ["missing", undefined],
    ["null", null],
  ])("falls back to standard for %s", (_label, raw) => {
    // An unknown pack must look like an ordinary realization, not break one.
    expect(parseThemePack(raw)).toBe("standard");
  });
});

describe("resolveThemeFamily", () => {
  it("dresses risk-quiz in its own palette and everything else in the expedition one", () => {
    expect(resolveThemeFamily({ type: "risk-quiz" })).toBe("risk");
    expect(resolveThemeFamily({ type: "outdoor-games" })).toBe("expedition");
    expect(resolveThemeFamily(undefined)).toBe("expedition");
  });

  it("dresses a crime theme pack in the noir palette while keeping the expedition engine", () => {
    const crimeRealization = { type: "outdoor-games", themePack: "crime" };

    expect(resolveThemeFamily(crimeRealization)).toBe("crime");
    // The whole point: different dress, same engine.
    expect(resolveRealizationMode(crimeRealization)).toBe("expedition");
  });

  it("lets a crime pack ride on any business category", () => {
    // A crime story can be sold as an outdoor game or a hotel game alike —
    // which is exactly why the pack is not a value of the type enum.
    expect(resolveThemeFamily({ type: "outdoor-games", themePack: "crime" })).toBe("crime");
    expect(resolveThemeFamily({ type: "hotel-games", themePack: "crime" })).toBe("crime");
  });

  it("dresses a christmas theme pack in the seasonal palette, still on the expedition engine", () => {
    const christmasRealization = { type: "hotel-games", themePack: "christmas" };

    expect(resolveThemeFamily(christmasRealization)).toBe("christmas");
    expect(resolveRealizationMode(christmasRealization)).toBe("expedition");
  });

  it("maps every theme pack to a palette family", () => {
    // Guards the pack -> family map against a pack added without a palette,
    // which would silently render as the standard expedition look.
    for (const pack of ["standard", "crime", "christmas"]) {
      const family = resolveThemeFamily({ type: "outdoor-games", themePack: pack });
      expect(family).not.toBeUndefined();
    }

    expect(resolveThemeFamily({ type: "outdoor-games", themePack: "standard" })).toBe("expedition");
  });

  it("keeps the Ryzykanci palette even if a theme pack is set", () => {
    // Their navy/gold is part of the card-table mechanic, not a selectable skin.
    expect(resolveThemeFamily({ type: "risk-quiz", themePack: "crime" })).toBe("risk");
    expect(resolveThemeFamily({ type: "risk-quiz", themePack: "christmas" })).toBe("risk");
  });

  it("is a separate decision from which engine runs", () => {
    // The two axes agree today because only risk-quiz differs on both. They are
    // kept apart so a realization can later carry its own look while running
    // the ordinary expedition engine — which is exactly what the crime variant
    // needs and what a single string comparison could not express.
    expect(resolveThemeFamily({ type: "hotel-games" })).toBe("expedition");
    expect(resolveRealizationMode({ type: "hotel-games" })).toBe("expedition");
  });
});
