import { Platform, type TextStyle } from "react-native";

import {
  getExpeditionThemeFamily,
  type ExpeditionThemeFamily,
} from "../../features/onboarding/model/constants";

/**
 * Role typograficzne.
 *
 * Podział 1+N: **Montserrat jest krojem produktu** — wchodzi na wszystkie
 * oprawy przez utility wag w tailwind.config.js, bez edycji w kodzie. Osobną
 * osią jest wyłącznie **krój ozdobny**, który zależy od oprawy: kryminalna
 * dostaje Playfair Display na tytuły spraw i cytaty, reszta zostaje na
 * Montserrat.
 *
 * Dlaczego nie cały krój per oprawa: podmiana kroju interfejsu zmienia metrykę
 * tekstu, czyli przelicza layout i daje widoczny skok przy wejściu w
 * realizację. Do tego dwa kroje interfejsu to dwie niezależne kalibracje
 * `adaptiveLayout.fs` w ~200 miejscach, a każdą da się sprawdzić wyłącznie na
 * tablecie. Ról ozdobnych jest kilkanaście i są pojedyncze, więc ich metryka
 * nie wpływa na zawijanie akapitów.
 *
 * **Role NIE zwracają `fontSize`.** Rozmiary zostają w `adaptiveLayout.fs(...)`
 * per miejsce użycia — wciągnięcie ich tutaj zderzyłoby się ze skalowaniem
 * adaptacyjnym i wymusiło przepisanie `use-adaptive-layout.ts`.
 */

export type TextRole =
  /** Nawigacja, przyciski, etykiety statusów — wersaliki z rozstrzeleniem. */
  | "navigation"
  /** Treść interfejsu. */
  | "body"
  /** Treść wyróżniona w obrębie akapitu. */
  | "bodyStrong"
  /** Tytuł sprawy, nagłówek zeznania — krój ozdobny. */
  | "caseTitle"
  /** Cytat, motto, wyimek — krój ozdobny. */
  | "quote"
  /** Godziny, logi, identyfikatory dowodów. */
  | "mono";

const FAMILY_UI = "Montserrat";
const FAMILY_DISPLAY_NOIR = "PlayfairDisplay";

/**
 * Monospace systemowy, bez piątego pliku w repo. Własny krój nic by tu nie
 * wniósł, a kosztowałby plik, build i decyzję.
 */
const FAMILY_MONO = Platform.select({ android: "monospace", ios: "Menlo", default: "monospace" });

/**
 * Krój ozdobny per oprawa. `Record` wymusza wpis dla każdej rodziny — nowa
 * oprawa bez decyzji o kroju nie przejdzie kompilacji.
 *
 * Playfair jest wgrany w JEDNEJ wadze (400). Przy nim nie wolno ustawiać
 * `fontWeight` innego niż "400": bez pliku Bold system podstawiłby pogrubienie
 * syntetyczne, które na szeryfach wygląda źle.
 */
const DISPLAY_FAMILY_BY_THEME: Record<ExpeditionThemeFamily, string> = {
  expedition: FAMILY_UI,
  risk: FAMILY_UI,
  crime: FAMILY_DISPLAY_NOIR,
  christmas: FAMILY_UI,
};

function resolveDisplayFamily(family: ExpeditionThemeFamily = getExpeditionThemeFamily()) {
  return DISPLAY_FAMILY_BY_THEME[family];
}

export function textRole(
  role: TextRole,
  family: ExpeditionThemeFamily = getExpeditionThemeFamily(),
): TextStyle {
  const displayFamily = resolveDisplayFamily(family);
  const isSerifDisplay = displayFamily === FAMILY_DISPLAY_NOIR;

  switch (role) {
    case "navigation":
      // Rozstrzelenie robi tu połowę wrażenia korporacyjnego — w kodzie jest
      // już `tracking-widest` w kilku miejscach, ta rola to formalizuje.
      return { fontFamily: FAMILY_UI, fontWeight: "600", letterSpacing: 1.2 };
    case "body":
      return { fontFamily: FAMILY_UI, fontWeight: "500" };
    case "bodyStrong":
      return { fontFamily: FAMILY_UI, fontWeight: "600" };
    case "caseTitle":
      return {
        fontFamily: displayFamily,
        // Playfair ma tylko wagę 400; Montserrat w roli tytułu idzie grubiej.
        fontWeight: isSerifDisplay ? "400" : "700",
        letterSpacing: isSerifDisplay ? 0.2 : 0.8,
      };
    case "quote":
      return {
        fontFamily: displayFamily,
        fontWeight: "400",
        fontStyle: isSerifDisplay ? "italic" : "normal",
      };
    case "mono":
      return { fontFamily: FAMILY_MONO, fontWeight: "400", letterSpacing: 0.4 };
  }
}
