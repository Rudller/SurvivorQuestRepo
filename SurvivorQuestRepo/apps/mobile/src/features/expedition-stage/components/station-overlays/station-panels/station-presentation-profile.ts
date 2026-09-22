/**
 * Podgląd stanowiska renderuje się w dwóch prezentacjach: jako pełnoekranowy
 * overlay ekspedycji i inline na ekranie Ryzykantów. Mechanika stanowisk jest
 * w obu identyczna — różni się wyłącznie chrome, czyli to, co podgląd rysuje
 * wokół treści.
 *
 * Ten plik zbiera te różnice w dwie gałęzie obok siebie, zamiast trzymać je
 * jako kilkadziesiąt `isInlinePresentation ? … : …` rozsypanych po ciele
 * preview.tsx. Dzięki temu całą prezentację widać naraz, a dołożenie trzeciej
 * jest dopisaniem gałęzi tutaj zamiast przejściem przez cały komponent.
 *
 * Uogólnia `code-station-presentation.ts` i `quiz-outcome-presentation.ts`,
 * które robią to samo dla swoich paneli — i trzyma się tej samej granicy, co
 * one:
 *
 * Co tu NIE trafia: warunki mieszające prezentację z typem stanowiska albo ze
 * stanem danych (np. „ukryj pustą ramkę mediów, jeśli open-quiz inline nie ma
 * zdjęcia"). Te są iloczynem kilku osi naraz, więc wciągnięte tutaj zmusiłyby
 * profil do poznania typu stanowiska i przestałby być jedną decyzją. Zostają
 * w komponencie jako nazwane stałe — nieliczne i właśnie je warto widzieć.
 */

import type { PanelCornerStyle } from "../../../../../shared/ui/chamfered-panel";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

export type StationPresentationMode = "overlay" | "inline";

export type StationPresentationInput = {
  mode: StationPresentationMode;
  isTablet: boolean;
  isLightTheme: boolean;
  /** Szerokość okna — overlay wyprowadza z niej szerokość treści karty. */
  viewportWidth: number;
  /** Wysokość klawiatury ekranowej; overlay kompensuje ją własnym paddingiem. */
  keyboardHeight: number;
  /** `adaptiveLayout.s`: skalowanie do gęstości ekranu z widełkami. */
  scaled: (value: number, min: number, max: number) => number;
};

export type StationPresentationProfile = {
  mode: StationPresentationMode;
  chrome: {
    /**
     * Nagłówek z nazwą stanowiska i przyciskiem zamknięcia. Inline go nie
     * rysuje, bo gospodarz (Ryzykanci) ma własny — dwa naraz to dwa przyciski
     * zamknięcia jeden pod drugim.
     */
    showHeader: boolean;
    /**
     * Pływająca stopka z timerem i punktami. Inline jej nie rysuje — Ryzykanci
     * mają własny dolny panel i własny timer, a nasz nachodziłby na niego.
     */
    showFooterBar: boolean;
  };
  /** Warstwa najwyższa: przyciemnienie tła i sposób wypełnienia ekranu. */
  root: {
    className: string;
    backgroundColor: string;
    /** Inline musi móc się kurczyć wewnątrz gospodarza, stąd jawny minHeight. */
    fillsParent: boolean;
  };
  /** Ramka między przyciemnieniem a kartą. */
  frame: {
    paddingHorizontal: number;
    paddingTop: number;
    paddingBottom: number;
  };
  /** Sama karta stanowiska. */
  card: {
    className: string;
    borderColor: string;
    backgroundColor: string;
    borderRadius: number;
    paddingBottom: number;
    /**
     * Szerokość, jaka zostaje treści po naszym chrome. CodeStationPanel
     * dostaje to jako liczbę, żeby ustalić rozmiar klawiszy już na pierwszym
     * renderze; licząc z własnego onLayout, klawiatura pojawiałaby się w złym
     * rozmiarze i dopiero po pomiarze zjeżdżała do właściwego. Inline nie
     * narzuca szerokości — robi to gospodarz.
     */
    contentWidth: number | undefined;
  };
  /** Kolumna treści między nagłówkiem a stopką. */
  content: {
    /**
     * Overlay przycina to, co nie mieści się w karcie — ma ekran dla siebie.
     * Inline dzieli ekran z chrome gospodarza, więc nadmiar musi dać się
     * doscrollować jego własnym kontenerem zamiast zostać uciętym tutaj.
     */
    overflow: "visible" | "hidden";
  };
  /**
   * Wartości podawane wprost panelom stanowisk. Panele nie znają prezentacji —
   * przyjmują semantyczne propsy i to jest jedyne miejsce, które tłumaczy
   * prezentację na te propsy.
   */
  panels: {
    /** Panel mediów bez własnej ramki i tła — rysuje je gospodarz. */
    minimalChrome: boolean;
    /** Ciaśniejszy wskaźnik prób tam, gdzie karta jest niska. */
    compactAttempts: boolean;
    /** Wskaźnik prób ukryty zupełnie — gospodarz pokazuje go po swojemu. */
    hideAttempts: boolean;
    /** Ścięte narożniki to język wizualny Ryzykantów, zaokrąglone — ekspedycji. */
    cornerStyle: PanelCornerStyle;
  };
  /**
   * Jedyne miejsce, gdzie prezentacja zmienia ZACHOWANIE, a nie wygląd. Warto,
   * żeby ta sekcja została jednomieszkaniowa — gdyby zaczęła rosnąć, znaczyłoby
   * to, że prezentacja przestaje być decyzją o wyglądzie.
   */
  behavior: {
    /**
     * Inline otwiera aparat od razu po wejściu na stanowisko foto: gospodarz
     * (Ryzykanci) wszedł tu jednym tapnięciem w kartę i dodatkowy przycisk
     * "zrób zdjęcie" byłby drugim tapnięciem w to samo.
     */
    autoOpenPhotoCapture: boolean;
  };
};

/** Poziomy padding kolumny treści — ta sama wartość w obu prezentacjach. */
function resolveColumnPaddingHorizontal(input: StationPresentationInput) {
  return input.scaled(input.isTablet ? 16 : 10, 8, 22);
}

/** Poziomy padding ramki overlaya. */
function resolveFramePaddingHorizontal(input: StationPresentationInput) {
  return input.scaled(input.isTablet ? 12 : 8, 6, 16);
}

export function resolveStationPresentationProfile(
  input: StationPresentationInput,
): StationPresentationProfile {
  const { mode, isTablet, isLightTheme, viewportWidth, keyboardHeight, scaled } = input;

  if (mode === "inline") {
    return {
      mode,
      chrome: { showHeader: false, showFooterBar: false },
      root: {
        className: "flex-1",
        backgroundColor: "transparent",
        fillsParent: true,
      },
      frame: {
        paddingHorizontal: 0,
        // Gospodarz (Ryzykanci) daje odstęp nad tym komponentem własnym
        // rowGap między rodzeństwem — nasz własny padding stackowałby się na
        // nim i odstęp po timerze byłby widocznie większy niż przed nim.
        paddingTop: 0,
        paddingBottom: 0,
      },
      card: {
        className: "flex-1",
        borderColor: "transparent",
        backgroundColor: "transparent",
        borderRadius: 0,
        // Gospodarz owija to własnym KeyboardAvoidingView, który już skurczył
        // dostępne miejsce — własny padding klawiatury kompensowałby drugi raz
        // i przesunął treść za daleko.
        paddingBottom: 0,
        contentWidth: undefined,
      },
      content: { overflow: "visible" },
      panels: {
        minimalChrome: true,
        compactAttempts: true,
        hideAttempts: true,
        cornerStyle: "chamfered",
      },
      behavior: { autoOpenPhotoCapture: true },
    };
  }

  const framePaddingHorizontal = resolveFramePaddingHorizontal(input);
  const columnPaddingHorizontal = resolveColumnPaddingHorizontal(input);
  // Padding ramki + ramka karty (1 px) + padding kolumny, po obu stronach.
  const cardChromeWidth = 2 * (framePaddingHorizontal + 1 + columnPaddingHorizontal);

  return {
    mode,
    chrome: { showHeader: true, showFooterBar: true },
    root: {
      className: "absolute inset-0 z-50",
      backgroundColor: isLightTheme
        ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)`
        : `rgba(${EXPEDITION_THEME.scrimDeepRgb}, 0.9)`,
      fillsParent: false,
    },
    frame: {
      paddingHorizontal: framePaddingHorizontal,
      paddingTop: scaled(isTablet ? 36 : 20, 16, 44),
      paddingBottom: scaled(isTablet ? 20 : 12, 10, 28),
    },
    card: {
      className: "flex-1 border",
      borderColor: EXPEDITION_THEME.border,
      backgroundColor: EXPEDITION_THEME.panel,
      borderRadius: scaled(isTablet ? 24 : 18, 16, 30),
      paddingBottom: keyboardHeight,
      contentWidth: Math.max(0, viewportWidth - cardChromeWidth),
    },
    content: { overflow: "hidden" },
    panels: {
      minimalChrome: false,
      compactAttempts: false,
      hideAttempts: false,
      cornerStyle: "rounded",
    },
    behavior: { autoOpenPhotoCapture: false },
  };
}
