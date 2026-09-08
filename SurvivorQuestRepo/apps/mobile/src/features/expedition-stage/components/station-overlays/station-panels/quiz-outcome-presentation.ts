/**
 * Popup wyniku stanowiska renderuje się w dwóch skórach: `rounded` w overlayu
 * ekspedycji i na ekranie mapy, oraz `chamfered` na stole karcianym Ryzykantów.
 * Zachowuje się w obu tak samo — różnią się wyłącznie wartości wyglądu.
 *
 * Stoją tutaj, w dwóch gałęziach obok siebie, zamiast rozsypane po ciele
 * komponentu. Dzięki temu zmiana wyglądu jednej skóry jest edycją gałęzi,
 * której druga nie czyta, a całą skórę widać naraz.
 *
 * **Kolumna `chamfered` jest zamrożona świadomie.** Odtwarza dosłownie wartości
 * sprzed odświeżenia popupu — łącznie z surowymi kolorami Tailwinda, których w
 * gałęzi `rounded` już nie ma. Nie jest niespójna przez zaniedbanie: Ryzykanci
 * mają własny, zestrojony wygląd i ta gałąź ma go trzymać nieruchomo. Pilnuje
 * tego quiz-outcome-presentation.test.ts.
 *
 * Co tu NIE trafia: różnice strukturalne (ChamferedPanel vs View) i behawioralne
 * (czy w ogóle działa maszyna animacji). Te zostają jawnymi warunkami w
 * komponencie, bo są nieliczne i właśnie je warto widzieć.
 */

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { resolveActionLabelColor, withAlpha } from "./shared-ui";

export type QuizOutcomeSkinName = "rounded" | "chamfered";
export type QuizOutcomeVariant = "success" | "failed" | "timeout" | "pending";

export type QuizOutcomePresentationInput = {
  presentation: QuizOutcomeSkinName;
  variant: QuizOutcomeVariant;
  isTablet: boolean;
  isLightTheme: boolean;
  /** `adaptiveLayout.s` — skalowanie do gęstości ekranu z widełkami. */
  scaled: (value: number, min: number, max: number) => number;
  /** `adaptiveLayout.fs` — to samo dla rozmiarów czcionek. */
  fontScaled: (value: number, min: number, max: number) => number;
  /** `adaptiveLayout.hit` — podłoga pola dotyku. */
  hit: (value: number) => number;
};

export type QuizOutcomeSkin = {
  horizontalInset: number;
  cardMaxWidth: number;
  cardRadius: number;
  cardBorderColor: string;
  cardBorderWidth: number;
  cardBackgroundColor: string;
  cardPaddingHorizontal: number;
  cardPaddingVertical: number;
  /** Tylko `chamfered` — promień poświaty pod panelem. */
  glowRadius: number;

  wellRadius: number;
  wellBorderColor: string;
  wellBackgroundColor: string;
  wellMinHeight: number;
  wellMarginBottom: number;

  /**
   * Odznaka glifu o stałym rozmiarze, wewnątrz studzienki. Tylko `rounded` —
   * u Ryzykantów glif siedzi wprost w kaflu i `badgeSize` wynosi 0.
   * Stały rozmiar nie jest kosmetyką: pierścień nagrody skaluje się do 1.45, a
   * przy kaflu na pełną szerokość wyszedłby poza kartę.
   */
  badgeSize: number;
  badgeRadius: number;
  badgeBorderColor: string;
  badgeBackgroundColor: string;
  /** Kolor pierścienia nagrody; "transparent" tam, gdzie pierścienia nie ma. */
  ringColor: string;

  glyph: string;
  glyphColor: string;
  glyphFontSize: number;

  titleColor: string;
  titleFontSize: number;

  messageColor: string;
  messageFontSize: number;
  messageLineHeight: number;
  messageMaxWidth: number;

  countdownOffset: number;
  countdownRadius: number;
  countdownBorderColor: string;
  countdownBackgroundColor: string;
  countdownTextColor: string;
  countdownFontSize: number;
  countdownPaddingHorizontal: number;
  countdownPaddingVertical: number;

  actionMarginTop: number;
  actionRadius: number;
  actionMinHeight: number;
  actionBackgroundColor: string;
  actionLabelColor: string;
  actionLabelFontSize: number;
  actionPaddingHorizontal: number;
  actionPaddingVertical: number;

  hasEnterAnimation: boolean;
  hasSuccessPulse: boolean;
  hasFailureShake: boolean;
  hasPendingBreath: boolean;
};

/** Dzisiejsze akcenty Ryzykantów — surowe wartości Tailwinda, celowo zamrożone. */
function resolveChamferedAccent(variant: QuizOutcomeVariant) {
  if (variant === "success") {
    return { border: "rgba(16, 185, 129, 0.55)", bg: "rgba(16, 185, 129, 0.18)", text: "#6ee7b7", glyph: "✓" };
  }
  if (variant === "timeout" || variant === "pending") {
    return { border: "rgba(245, 158, 11, 0.55)", bg: "rgba(245, 158, 11, 0.16)", text: "#fcd34d", glyph: "⏳" };
  }
  return { border: "rgba(239, 68, 68, 0.55)", bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5", glyph: "✕" };
}

export function resolveQuizOutcomePresentation({
  presentation,
  variant,
  isTablet,
  isLightTheme,
  scaled,
  fontScaled,
  hit,
}: QuizOutcomePresentationInput): QuizOutcomeSkin {
  // Wspólna geometria karty: to jest kształt popupu, a nie jego skóra, i użytkownik
  // prosił, żeby kształt został.
  const shared = {
    horizontalInset: scaled(isTablet ? 44 : 24, 18, 56),
    cardMaxWidth: scaled(isTablet ? 760 : 460, 340, 840),
    cardRadius: scaled(isTablet ? 32 : 24, 18, 40),
    cardBackgroundColor: EXPEDITION_THEME.panel,
    cardPaddingHorizontal: scaled(isTablet ? 28 : 20, 16, 34),
    cardPaddingVertical: scaled(isTablet ? 30 : 22, 18, 36),
    wellMinHeight: scaled(isTablet ? 110 : 84, 72, 140),
    wellMarginBottom: scaled(isTablet ? 22 : 16, 12, 28),
    titleColor: EXPEDITION_THEME.textPrimary,
    messageColor: EXPEDITION_THEME.textMuted,
    messageFontSize: fontScaled(isTablet ? 21 : 16, 14, 25),
    messageLineHeight: scaled(isTablet ? 34 : 28, 24, 40),
    messageMaxWidth: scaled(isTablet ? 620 : 400, 280, 700),
    countdownOffset: scaled(isTablet ? 20 : 14, 10, 24),
    countdownRadius: scaled(isTablet ? 12 : 9, 8, 16),
    countdownFontSize: fontScaled(isTablet ? 14 : 12, 10, 17),
    countdownPaddingHorizontal: scaled(isTablet ? 10 : 8, 7, 14),
    countdownPaddingVertical: scaled(isTablet ? 6 : 4, 3, 8),
    actionMarginTop: scaled(isTablet ? 28 : 24, 18, 34),
    actionRadius: scaled(isTablet ? 16 : 12, 10, 20),
    actionMinHeight: hit(isTablet ? 64 : 50),
    actionPaddingHorizontal: scaled(isTablet ? 16 : 12, 10, 20),
    actionPaddingVertical: scaled(isTablet ? 14 : 10, 8, 18),
    actionLabelFontSize: fontScaled(isTablet ? 23 : 16, 14, 27),
  };

  if (presentation === "chamfered") {
    const accent = resolveChamferedAccent(variant);

    return {
      ...shared,
      cardBorderColor: EXPEDITION_THEME.border,
      cardBorderWidth: scaled(isTablet ? 3 : 2, 2, 4),
      glowRadius: scaled(isTablet ? 18 : 14, 12, 22),

      wellRadius: scaled(isTablet ? 20 : 14, 12, 26),
      wellBorderColor: accent.border,
      wellBackgroundColor: accent.bg,

      badgeSize: 0,
      badgeRadius: 0,
      badgeBorderColor: "transparent",
      badgeBackgroundColor: "transparent",
      ringColor: "transparent",

      glyph: accent.glyph,
      glyphColor: accent.text,
      glyphFontSize: fontScaled(isTablet ? 52 : 38, 32, 62),

      titleFontSize: fontScaled(isTablet ? 42 : 30, 26, 50),

      countdownBorderColor: "rgba(245, 158, 11, 0.45)",
      countdownBackgroundColor: "rgba(245, 158, 11, 0.16)",
      countdownTextColor: "#fcd34d",

      actionBackgroundColor:
        variant === "success" ? "#059669" : variant === "timeout" || variant === "pending" ? "#b45309" : "#dc2626",
      // Odbiega od kanonu (`resolveActionLabelColor` daje `background`, nie
      // `textPrimary`), ale tak jest dziś u Ryzykantów i tak ma zostać.
      actionLabelColor: isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.textPrimary,

      hasEnterAnimation: false,
      hasSuccessPulse: false,
      hasFailureShake: false,
      hasPendingBreath: false,
    };
  }

  // `pending` jest jedynym wariantem bez tintu wyniku — brak koloru jest treścią:
  // werdykt jeszcze nie zapadł, więc nie ma czym zabarwić.
  const accentColor =
    variant === "success"
      ? EXPEDITION_THEME.success
      : variant === "failed"
        ? EXPEDITION_THEME.danger
        : variant === "timeout"
          ? EXPEDITION_THEME.accent
          : null;
  const glyph = variant === "success" ? "✓" : variant === "failed" ? "✕" : variant === "timeout" ? "⏳" : "⋯";
  // Ramka pełnym kolorem, powierzchnia przez withAlpha — kanon z code-station-panel.tsx.
  const surfaceAlpha = variant === "success" ? 0.18 : 0.16;

  return {
    ...shared,
    cardBorderColor: accentColor ? withAlpha(accentColor, 0.55) : EXPEDITION_THEME.border,
    cardBorderWidth: 1,
    glowRadius: 0,

    // Brakujące ogniwo hierarchii teł: kanon to panel -> panelMuted -> panelStrong,
    // a dotąd kafel z tintem siedział wprost na `panel`.
    wellRadius: scaled(isTablet ? 20 : 16, 14, 26),
    wellBorderColor: EXPEDITION_THEME.border,
    wellBackgroundColor: EXPEDITION_THEME.panelMuted,

    badgeSize: scaled(isTablet ? 96 : 76, 64, 116),
    badgeRadius: scaled(isTablet ? 24 : 18, 14, 30),
    badgeBorderColor: accentColor ? withAlpha(accentColor, 0.55) : EXPEDITION_THEME.border,
    badgeBackgroundColor: accentColor ? withAlpha(accentColor, surfaceAlpha) : EXPEDITION_THEME.panelStrong,
    ringColor: variant === "success" && accentColor ? accentColor : "transparent",

    glyph,
    glyphColor: accentColor ?? EXPEDITION_THEME.textMuted,
    glyphFontSize: fontScaled(isTablet ? 44 : 34, 28, 52),

    titleFontSize: fontScaled(isTablet ? 32 : 24, 21, 38),

    countdownBorderColor: withAlpha(EXPEDITION_THEME.accent, 0.45),
    countdownBackgroundColor: withAlpha(EXPEDITION_THEME.accent, 0.16),
    countdownTextColor: EXPEDITION_THEME.accent,

    // Przycisk mówi "Wróć na mapę" — to nawigacja, nie werdykt. Werdykt niosą już
    // glif, ramka i tytuł, więc przycisk jest kanonicznym przyciskiem akcji.
    actionBackgroundColor: EXPEDITION_THEME.accent,
    actionLabelColor: resolveActionLabelColor(false),

    hasEnterAnimation: true,
    hasSuccessPulse: variant === "success",
    hasFailureShake: variant === "failed",
    hasPendingBreath: variant === "pending",
  };
}
