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

/**
 * Oprawa graficzna i fabularna — oś niezależna od typu realizacji. Kryminał
 * może być zarówno grą terenową, jak i hotelową, więc nie jest wartością typu;
 * to samo dotyczy oprawy świątecznej, która jest sezonową skórką na dowolną
 * kategorię.
 */
export type RealizationThemePack = "standard" | "crime" | "christmas";

const THEME_PACKS: readonly RealizationThemePack[] = ["standard", "crime", "christmas"];

type RealizationLike = {
  type?: string;
  themePack?: string;
};

export function parseThemePack(raw: unknown): RealizationThemePack {
  if (typeof raw !== "string") {
    return "standard";
  }

  const candidate = raw.trim();
  return THEME_PACKS.find((pack) => pack === candidate) ?? "standard";
}

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
 * Pakiet oprawy wprost na rodzinę palety. `Record` wymusza wpis dla każdego
 * pakietu — nowa oprawa bez palety nie przejdzie kompilacji, zamiast po cichu
 * wyglądać jak standardowa.
 *
 * Rodziny `risk` tu nie ma celowo: Ryzykanci nie wybierają oprawy, ich paleta
 * wynika z typu realizacji i jest obsłużona wyjątkiem w resolveThemeFamily.
 */
const THEME_FAMILY_BY_PACK: Record<RealizationThemePack, ExpeditionThemeFamily> = {
  standard: "expedition",
  crime: "crime",
  christmas: "christmas",
};

/**
 * Rodzina palety: jak to wygląda.
 *
 * Celowo osobna funkcja od `resolveRealizationMode`, choć dziś obie wynikają z
 * tego samego pola dla Ryzykantów. To są dwie niezależne osie — tryb decyduje,
 * który ekran startuje, rodzina decyduje o kolorach — i właśnie dlatego wariant
 * kryminalny może mieć własną paletę, jadąc na zwykłym silniku ekspedycji.
 */
export function resolveThemeFamily(
  realization: RealizationLike | undefined | null,
): ExpeditionThemeFamily {
  // Ryzykanci wygrywają z pakietem oprawy: ich paleta jest częścią mechaniki
  // stołu karcianego, a nie skórką do wyboru. Poza nimi decyduje themePack.
  if (resolveRealizationMode(realization) === "risk-quiz") {
    return "risk";
  }

  return THEME_FAMILY_BY_PACK[parseThemePack(realization?.themePack)];
}
