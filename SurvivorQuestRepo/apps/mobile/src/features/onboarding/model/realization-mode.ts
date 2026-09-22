import type { ExpeditionThemeFamily } from "./constants";

/**
 * Typ realizacji tak, jak podaje go backend (kebab-case kontraktu API — patrz
 * `apps/backend/src/modules/realization/entities/realization.entity.ts`).
 *
 * Do tej pory aplikacja trzymała to jako zwykły `string` i porównywała wprost
 * z `"risk-quiz"` w czterech miejscach. Nieznana wartość wpadała po cichu w
 * gałąź ekspedycji — literówka po stronie backendu albo nowy typ, o którym
 * aplikacja nie wie, wyglądały wtedy identycznie jak poprawna ekspedycja.
 */
export type RealizationType =
  | "outdoor-games"
  | "hotel-games"
  | "workshops"
  | "evening-attractions"
  | "dj"
  | "recreation"
  | "risk-quiz";

const REALIZATION_TYPES: readonly RealizationType[] = [
  "outdoor-games",
  "hotel-games",
  "workshops",
  "evening-attractions",
  "dj",
  "recreation",
  "risk-quiz",
];

/**
 * Tryb rozgrywki: który ekran w ogóle się montuje.
 *
 * Wartości są dwie i mają takie zostać. Typ realizacji to kategoria biznesowa
 * (gry terenowe, hotelowe, warsztaty…) i większość z nich gra dokładnie tak
 * samo — na mapie ze stanowiskami. Ryzykanci to jedyny typ, który uruchamia
 * inny silnik. Oprawa graficzna jedzie osobną osią, patrz `resolveThemeFamily`.
 */
export type RealizationMode = "expedition" | "risk-quiz";

type RealizationLike = {
  type?: string;
};

export function parseRealizationType(raw: unknown): RealizationType | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const candidate = raw.trim();
  const known = REALIZATION_TYPES.find((type) => type === candidate);

  if (!known && candidate.length > 0 && __DEV__) {
    // Nie rzucamy: nieznany typ ma zdegradować się do ekspedycji, a nie
    // wywalić urządzenie w polu. Ale w dev ma zostawić ślad, bo w praktyce
    // znaczy to rozjazd kontraktu z backendem.
    console.warn(`[realization] nieznany typ realizacji: "${candidate}"`);
  }

  return known;
}

export function resolveRealizationMode(
  realization: RealizationLike | undefined | null,
): RealizationMode {
  return parseRealizationType(realization?.type) === "risk-quiz"
    ? "risk-quiz"
    : "expedition";
}

/**
 * Rodzina palety: jak to wygląda.
 *
 * Celowo osobna funkcja od `resolveRealizationMode`, choć dziś obie wynikają z
 * tego samego pola. To są dwie niezależne osie — tryb decyduje, który ekran
 * startuje, rodzina decyduje o kolorach — i zlanie ich w jedno porównanie
 * stringa jest powodem, dla którego wariant o własnej oprawie, ale zwykłej
 * mechanice, nie ma się dziś gdzie wpiąć.
 */
export function resolveThemeFamily(
  realization: RealizationLike | undefined | null,
): ExpeditionThemeFamily {
  return resolveRealizationMode(realization) === "risk-quiz" ? "risk" : "expedition";
}
