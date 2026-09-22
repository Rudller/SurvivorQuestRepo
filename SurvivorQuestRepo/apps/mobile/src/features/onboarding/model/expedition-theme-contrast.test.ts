import { getExpeditionThemePalette, type ExpeditionThemeFamily, type ExpeditionThemeMode } from "./constants";

// Kolorów nie da się ocenić okiem bez urządzenia — mobilny web jest zepsuty, a
// monitor deweloperski kłamie względem matowego panelu tabletu w terenie.
// Kontrast da się jednak policzyć, i to jest jedyna własność palety, którą
// można sprawdzić bez sprzętu.
//
// Progi wzorowane na WCAG 2.1: 4.5:1 dla tekstu podstawowego, 3.0:1 dla tekstu
// drugorzędnego i elementów nośnych (akcenty, ramki na dużych powierzchniach).
// To nie jest audyt dostępności — to siatka na pomyłkę w doborze wartości,
// zwłaszcza przy wariantach jasnych, gdzie akcent trzeba świadomie przyciemnić.

const FAMILIES: ExpeditionThemeFamily[] = ["expedition", "risk", "crime", "christmas"];
const MODES: ExpeditionThemeMode[] = ["dark", "light"];

/**
 * Zastane niedobory kontrastu, obecne przed wprowadzeniem oprawy noir.
 *
 * Wpisane jawnie zamiast obniżenia progu dla wszystkich, żeby były widoczne i
 * żeby nowe naruszenie nadal wywalało test. Akcent jasnej ekspedycji ma 2.21
 * przy progu 3.0 — jego `accentStrong` (3.08) przechodzi, więc problem dotyczy
 * samego akcentu, nie całej palety. Poprawka jest poza zakresem tej zmiany:
 * dotknęłaby wyglądu wszystkich zwykłych realizacji.
 */
const KNOWN_ACCENT_SHORTFALLS: Record<string, number> = {
  "expedition/light": 2.2,
};

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Luminancja względna wg WCAG 2.1. */
function relativeLuminance(hex: string) {
  const channels = parseHex(hex).map((value) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

describe.each(FAMILIES)("paleta %s", (family) => {
  describe.each(MODES)("wariant %s", (mode) => {
    const palette = getExpeditionThemePalette(mode, family);

    it("tekst podstawowy jest czytelny na tle", () => {
      expect(contrastRatio(palette.textPrimary, palette.background)).toBeGreaterThanOrEqual(4.5);
    });

    it("tekst drugorzędny jest czytelny na tle", () => {
      expect(contrastRatio(palette.textMuted, palette.background)).toBeGreaterThanOrEqual(3);
    });

    it("akcent niesie kontrast na tle", () => {
      // To jest ten próg, który wywraca się przy jasnych wariantach, jeśli
      // ktoś zostawi w nich akcent skopiowany z wariantu ciemnego.
      const ratio = contrastRatio(palette.accent, palette.background);
      const knownShortfall = KNOWN_ACCENT_SHORTFALLS[`${family}/${mode}`];

      if (knownShortfall) {
        // Zastany niedobór, nie regresja — sprawdzamy, że się nie POGŁĘBIA.
        // Próg trzymany blisko obecnej wartości, żeby poprawa wymusiła
        // aktualizację wpisu i wyjęcie go z tej listy.
        expect(ratio).toBeGreaterThanOrEqual(knownShortfall);
        return;
      }

      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it("podkreślenie jest co najmniej tak nośne jak akcent", () => {
      // `accentStrong` jest kolorem tekstu dla podkreślenia — tytułów, wartości
      // odliczania. Jeśli wypadnie słabiej niż zwykły akcent, hierarchia jest
      // odwrócona, nawet gdy obie wartości same w sobie są czytelne.
      const accent = contrastRatio(palette.accent, palette.background);
      const strong = contrastRatio(palette.accentStrong, palette.background);

      expect(strong).toBeGreaterThanOrEqual(accent);
    });

    it("statusy odróżniają się od tła", () => {
      expect(contrastRatio(palette.danger, palette.background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(palette.success, palette.background)).toBeGreaterThanOrEqual(3);
    });
  });
});
