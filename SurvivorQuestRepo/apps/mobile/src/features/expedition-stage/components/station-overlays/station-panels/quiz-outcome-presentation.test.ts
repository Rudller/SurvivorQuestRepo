import { EXPEDITION_THEME, setExpeditionThemeMode } from "../../../../onboarding/model/constants";
import {
  resolveQuizOutcomePresentation,
  type QuizOutcomeSkinName,
  type QuizOutcomeVariant,
} from "./quiz-outcome-presentation";

/**
 * Popup wyniku ma dwie skóry. `rounded` (ekspedycja) została odświeżona;
 * `chamfered` (Ryzykanci) ma zostać nieruchoma.
 *
 * Najważniejsza część tego pliku to zamrożenie kolumny `chamfered` — jest to
 * jedyna maszynowa gwarancja, że odświeżenie ekspedycji nie ruszyło stołu
 * karcianego. Oczekiwania są celowo dosłowne i przepisane z komponentu sprzed
 * zmiany, łącznie z surowymi kolorami Tailwinda, których w `rounded` już nie ma.
 */

// scale = 1, więc `scaled`/`fontScaled` tylko przycinają do widełek — dzięki temu
// w oczekiwaniach widać surowe wartości z projektu, a nie wynik mnożenia.
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const hit = (value: number) => Math.max(44, value);

function resolve(
  presentation: QuizOutcomeSkinName,
  variant: QuizOutcomeVariant,
  options: { isTablet?: boolean; isLightTheme?: boolean } = {},
) {
  return resolveQuizOutcomePresentation({
    presentation,
    variant,
    isTablet: options.isTablet ?? false,
    isLightTheme: options.isLightTheme ?? false,
    scaled: clamp,
    fontScaled: clamp,
    hit,
  });
}

// Bez tego globalny stan motywu wycieka na kolejne pliki testowe w tym workerze.
afterEach(() => {
  setExpeditionThemeMode("dark", "expedition");
});

/** Geometria karty jest wspólna dla obu skór — to kształt popupu, nie jego skóra. */
const sharedPhoneGeometry = {
  horizontalInset: 24,
  cardMaxWidth: 460,
  cardRadius: 24,
  cardPaddingHorizontal: 20,
  cardPaddingVertical: 22,
  wellMinHeight: 84,
  wellMarginBottom: 16,
  messageFontSize: 16,
  messageLineHeight: 28,
  messageMaxWidth: 400,
  countdownOffset: 14,
  countdownRadius: 9,
  countdownFontSize: 12,
  countdownPaddingHorizontal: 8,
  countdownPaddingVertical: 4,
  actionMarginTop: 24,
  actionRadius: 12,
  actionMinHeight: 50,
  actionPaddingHorizontal: 12,
  actionPaddingVertical: 10,
  actionLabelFontSize: 16,
};

/** Kolumna Ryzykantów, przepisana z komponentu sprzed odświeżenia. */
function frozenChamferedPhone(variant: QuizOutcomeVariant) {
  const accent =
    variant === "success"
      ? { border: "rgba(16, 185, 129, 0.55)", bg: "rgba(16, 185, 129, 0.18)", text: "#6ee7b7", glyph: "✓" }
      : variant === "timeout" || variant === "pending"
        ? { border: "rgba(245, 158, 11, 0.55)", bg: "rgba(245, 158, 11, 0.16)", text: "#fcd34d", glyph: "⏳" }
        : { border: "rgba(239, 68, 68, 0.55)", bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5", glyph: "✕" };

  return {
    ...sharedPhoneGeometry,
    cardBackgroundColor: EXPEDITION_THEME.panel,
    cardBorderColor: EXPEDITION_THEME.border,
    cardBorderWidth: 2,
    glowRadius: 14,
    wellRadius: 14,
    wellBorderColor: accent.border,
    wellBackgroundColor: accent.bg,
    badgeSize: 0,
    badgeRadius: 0,
    badgeBorderColor: "transparent",
    badgeBackgroundColor: "transparent",
    ringColor: "transparent",
    glyph: accent.glyph,
    glyphColor: accent.text,
    glyphFontSize: 38,
    titleColor: EXPEDITION_THEME.textPrimary,
    titleFontSize: 30,
    messageColor: EXPEDITION_THEME.textMuted,
    countdownBorderColor: "rgba(245, 158, 11, 0.45)",
    countdownBackgroundColor: "rgba(245, 158, 11, 0.16)",
    countdownTextColor: "#fcd34d",
    actionBackgroundColor:
      variant === "success" ? "#059669" : variant === "timeout" || variant === "pending" ? "#b45309" : "#dc2626",
    actionLabelColor: EXPEDITION_THEME.textPrimary,
    hasEnterAnimation: false,
    hasSuccessPulse: false,
    hasFailureShake: false,
    hasPendingBreath: false,
  };
}

const VARIANTS: QuizOutcomeVariant[] = ["success", "failed", "timeout", "pending"];

describe("skóra Ryzykantów jest zamrożona", () => {
  for (const variant of VARIANTS) {
    it(`chamfered / ${variant} / telefon`, () => {
      expect(resolve("chamfered", variant)).toEqual(frozenChamferedPhone(variant));
    });
  }

  it("chamfered / success / tablet — gałąź tabletowa też jest przepisana 1:1", () => {
    expect(resolve("chamfered", "success", { isTablet: true })).toEqual({
      ...frozenChamferedPhone("success"),
      horizontalInset: 44,
      cardMaxWidth: 760,
      cardRadius: 32,
      cardPaddingHorizontal: 28,
      cardPaddingVertical: 30,
      cardBorderWidth: 3,
      glowRadius: 18,
      wellRadius: 20,
      wellMinHeight: 110,
      wellMarginBottom: 22,
      glyphFontSize: 52,
      titleFontSize: 42,
      messageFontSize: 21,
      messageLineHeight: 34,
      messageMaxWidth: 620,
      countdownOffset: 20,
      countdownRadius: 12,
      countdownFontSize: 14,
      countdownPaddingHorizontal: 10,
      countdownPaddingVertical: 6,
      actionMarginTop: 28,
      actionRadius: 16,
      actionMinHeight: 64,
      actionPaddingHorizontal: 16,
      actionPaddingVertical: 14,
      actionLabelFontSize: 23,
    });
  });

  it("chamfered w motywie jasnym zmienia tylko kolor etykiety przycisku", () => {
    setExpeditionThemeMode("light", "expedition");
    const light = resolve("chamfered", "success", { isLightTheme: true });

    expect(light.actionLabelColor).toBe(EXPEDITION_THEME.panel);
    // Akcenty zostają zahardkodowane — dokładnie tak, jak było.
    expect(light.wellBorderColor).toBe("rgba(16, 185, 129, 0.55)");
    expect(light.glyphColor).toBe("#6ee7b7");
    expect(light.actionBackgroundColor).toBe("#059669");
  });

  it("chamfered nie animuje niczego, w żadnym wariancie", () => {
    for (const variant of VARIANTS) {
      const skin = resolve("chamfered", variant);
      expect([skin.hasEnterAnimation, skin.hasSuccessPulse, skin.hasFailureShake, skin.hasPendingBreath]).toEqual([
        false,
        false,
        false,
        false,
      ]);
    }
  });
});

describe("skóra ekspedycji", () => {
  it("bierze kolory z motywu, nie z własnej palety", () => {
    expect(resolve("rounded", "success").glyphColor).toBe(EXPEDITION_THEME.success);
    expect(resolve("rounded", "failed").glyphColor).toBe(EXPEDITION_THEME.danger);
    expect(resolve("rounded", "timeout").glyphColor).toBe(EXPEDITION_THEME.accent);
    expect(resolve("rounded", "pending").glyphColor).toBe(EXPEDITION_THEME.textMuted);
  });

  it("przycisk jest kanonicznym przyciskiem akcji, jednakowym dla każdego wyniku", () => {
    const backgrounds = VARIANTS.map((variant) => resolve("rounded", variant).actionBackgroundColor);

    expect(new Set(backgrounds).size).toBe(1);
    expect(backgrounds[0]).toBe(EXPEDITION_THEME.accent);
  });

  it("sukces przełącza się razem z motywem — to jest cały powód istnienia tokenu", () => {
    const dark = resolve("rounded", "success").glyphColor;
    setExpeditionThemeMode("light", "expedition");
    const light = resolve("rounded", "success").glyphColor;

    expect(light).not.toBe(dark);
  });

  it("pending jest odróżnialny od timeout", () => {
    const timeout = resolve("rounded", "timeout");
    const pending = resolve("rounded", "pending");

    expect(pending.glyph).not.toBe(timeout.glyph);
    expect(pending.badgeBackgroundColor).not.toBe(timeout.badgeBackgroundColor);
    // Brak koloru jest treścią: werdykt jeszcze nie zapadł.
    expect(pending.badgeBackgroundColor).toBe(EXPEDITION_THEME.panelStrong);
    expect(pending.ringColor).toBe("transparent");
  });

  it("studzienka wchodzi w hierarchię teł, a tint wyniku siedzi na odznace", () => {
    const success = resolve("rounded", "success");

    // panel (karta) -> panelMuted (studzienka) -> tint na odznace
    expect(success.wellBackgroundColor).toBe(EXPEDITION_THEME.panelMuted);
    expect(success.wellBorderColor).toBe(EXPEDITION_THEME.border);
    expect(success.badgeBackgroundColor).not.toBe(success.wellBackgroundColor);
    expect(success.badgeSize).toBeGreaterThan(0);
    expect(success.ringColor).toBe(EXPEDITION_THEME.success);
  });

  it("animuje wejście, a efekty są przypisane do właściwych wariantów", () => {
    expect(resolve("rounded", "success")).toMatchObject({ hasEnterAnimation: true, hasSuccessPulse: true, hasFailureShake: false });
    expect(resolve("rounded", "failed")).toMatchObject({ hasEnterAnimation: true, hasSuccessPulse: false, hasFailureShake: true });
    // Timeout ma już własny ruch w odliczającym badge'u — drugi sygnał by z nim walczył.
    expect(resolve("rounded", "timeout")).toMatchObject({ hasFailureShake: false, hasSuccessPulse: false });
    expect(resolve("rounded", "pending")).toMatchObject({ hasPendingBreath: true });
  });
});

describe("obie skóry", () => {
  it("dzielą wyłącznie geometrię karty, nigdy kolorów ani glifów", () => {
    const rounded = resolve("rounded", "success");
    const chamfered = resolve("chamfered", "success");
    const skinKeys: (keyof typeof rounded)[] = [
      "cardBorderColor",
      "cardBorderWidth",
      "wellBorderColor",
      "wellBackgroundColor",
      "badgeSize",
      "glyphColor",
      "glyphFontSize",
      "titleFontSize",
      "countdownTextColor",
      "actionBackgroundColor",
    ];

    for (const key of skinKeys) {
      expect(`${key}: ${String(rounded[key])}`).not.toBe(`${key}: ${String(chamfered[key])}`);
    }

    // Kształt jest wspólny z rozmysłem — użytkownik prosił, żeby został.
    expect(rounded.cardMaxWidth).toBe(chamfered.cardMaxWidth);
    expect(rounded.cardRadius).toBe(chamfered.cardRadius);
    // Glif sukcesu też jest wspólny i tak ma być: odświeżamy paletę, a nie
    // znaczenie symboli. Rozjeżdża się dopiero `pending`, bo tam rozdzieliliśmy
    // stan sklejony wcześniej z `timeout`.
    expect(rounded.glyph).toBe(chamfered.glyph);
    expect(resolve("rounded", "pending").glyph).not.toBe(resolve("chamfered", "pending").glyph);
  });
});
