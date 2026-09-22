import {
  parseRealizationType,
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

describe("resolveThemeFamily", () => {
  it("dresses risk-quiz in its own palette and everything else in the expedition one", () => {
    expect(resolveThemeFamily({ type: "risk-quiz" })).toBe("risk");
    expect(resolveThemeFamily({ type: "outdoor-games" })).toBe("expedition");
    expect(resolveThemeFamily(undefined)).toBe("expedition");
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
