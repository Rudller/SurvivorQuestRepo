/**
 * Stanowiska kodowe ("na czas" / "na punkty") renderują się w dwóch
 * prezentacjach: w pełnoekranowym overlayu ekspedycji i inline na ekranie
 * Ryzykantów. Panel zachowuje się w obu tak samo — różnią się wyłącznie liczby
 * układu.
 *
 * Te liczby stoją tutaj, w dwóch obiektach obok siebie, zamiast rozsypane po
 * ciele komponentu jako `minimalChrome ? … : …`. Dzięki temu zmiana wyglądu
 * jednej prezentacji jest edycją jednej gałęzi, której druga nie czyta, a całą
 * prezentację widać naraz zamiast składać ją z kilkunastu miejsc.
 *
 * Co tu NIE trafia: różnice strukturalne (kto rośnie, kto się kurczy) i
 * behawioralne (skąd bierze się szerokość klawiatury). Te zostają jawnymi
 * warunkami w komponencie, bo są nieliczne i właśnie je warto widzieć.
 */

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

export type CodeStationPresentation = "overlay" | "inline";

/**
 * Inline Ryzykanci dzielą ekran z chrome gospodarza, więc cały blok kodu jedzie
 * odrobinę mniejszy niż w overlayu, który ma ekran dla siebie.
 */
const INLINE_BLOCK_SCALE = 0.9;

export type CodeStationPresentationInput = {
  presentation: CodeStationPresentation;
  isTablet: boolean;
  /** Szerokość okna — inline wyprowadza z niej stabilną szerokość klawiatury. */
  viewportWidth: number;
  /** `adaptiveLayout.s`: skalowanie do gęstości ekranu z widełkami. */
  scaled: (value: number, min: number, max: number) => number;
  /** Bazowe rozmiary czcionek ze wspólnego `useStationPanelLayout`. */
  keyLabelFontSize: number;
  actionFontSize: number;
};

export type CodeStationLayout = {
  /** Pusta przestrzeń pod klawiaturą, żeby nie weszła pod pływającą stopkę. */
  footerClearance: number;
  /** Łączny poziomy padding panelu — wchodzi do wyliczenia szerokości klawiatury. */
  horizontalPadding: number;
  numericPadScale: number;
  numericPadMaxWidth: number;
  keyboardGap: number;
  desiredKeySize: number;
  minKeySize: number;
  keyLabelFontSize: number;
  codeRowHeight: number;
  submitButtonWidth: number;
  codeInputPaddingHorizontal: number;
  codeInputPaddingVertical: number;
  codeInputFontSize: number;
  submitLabelFontSize: number;
  keyboardMarginTop: number;
  keyboardMarginBottom: number;
  /** Inline panel nie rysuje własnej ramki ani tła — robi to gospodarz. */
  borderColor: string;
  backgroundColor: string;
  /**
   * Szerokość klawiatury wyprowadzona z ekranu. Inline korzysta z niej zamiast
   * mierzyć własną treść; overlay dostaje szerokość od karty i tu ma 0.
   */
  screenDerivedKeyboardWidth: number;
};

export function resolveCodeStationPresentation({
  presentation,
  isTablet,
  viewportWidth,
  scaled,
  keyLabelFontSize,
  actionFontSize,
}: CodeStationPresentationInput): CodeStationLayout {
  // Minimalne pole dotyku nie zależy od prezentacji — klawisz musi dać się
  // trafić palcem tak samo u Ryzykantów, jak w overlayu.
  const minKeySize = isTablet ? 40 : 24;

  if (presentation === "inline") {
    return {
      footerClearance: 0,
      horizontalPadding: 0,
      numericPadScale: 1,
      numericPadMaxWidth: 320,
      // Kwadratowy klawisz rośnie tylko przez szerokość, więc inline idzie
      // ciaśniejszym odstępem i wyższym sufitem — o rozmiarze decyduje wtedy
      // szerokość rzędu.
      keyboardGap: 2,
      desiredKeySize: isTablet ? 84 : 56,
      minKeySize,
      keyLabelFontSize: keyLabelFontSize * 1.15 * INLINE_BLOCK_SCALE,
      // Karta jest niska, a klawiatura jest tą częścią, która zasługuje na
      // miejsce — więc rząd kodu i przycisk idą tu szczuplej niż w overlayu.
      codeRowHeight: Math.round((isTablet ? 56 : 46) * INLINE_BLOCK_SCALE),
      submitButtonWidth: (isTablet ? 148 : 104) * INLINE_BLOCK_SCALE,
      codeInputPaddingHorizontal: 14,
      codeInputPaddingVertical: 9,
      codeInputFontSize: (isTablet ? 26 : 20) * INLINE_BLOCK_SCALE,
      submitLabelFontSize: actionFontSize * INLINE_BLOCK_SCALE,
      keyboardMarginTop: isTablet ? 8 : 6,
      keyboardMarginBottom: 0,
      borderColor: "transparent",
      backgroundColor: "transparent",
      screenDerivedKeyboardWidth: Math.max(0, (viewportWidth - 24) * INLINE_BLOCK_SCALE),
    };
  }

  return {
    footerClearance: scaled(isTablet ? 100 : 72, 60, 132),
    horizontalPadding: 24,
    numericPadScale: 0.8,
    numericPadMaxWidth: 256,
    keyboardGap: isTablet ? 6 : 2,
    desiredKeySize: isTablet ? 62 : 46,
    minKeySize,
    keyLabelFontSize,
    codeRowHeight: isTablet ? 78 : 57,
    submitButtonWidth: isTablet ? 164 : 132,
    codeInputPaddingHorizontal: 16,
    codeInputPaddingVertical: 12,
    codeInputFontSize: isTablet ? 26 : 20,
    submitLabelFontSize: actionFontSize,
    keyboardMarginTop: isTablet ? 16 : 12,
    keyboardMarginBottom: isTablet ? 8 : 6,
    borderColor: EXPEDITION_THEME.border,
    backgroundColor: EXPEDITION_THEME.panelMuted,
    screenDerivedKeyboardWidth: 0,
  };
}
