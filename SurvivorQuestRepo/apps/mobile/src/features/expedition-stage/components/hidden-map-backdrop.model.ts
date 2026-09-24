import type { ExpeditionThemeFamily, ExpeditionThemeMode } from "../../onboarding/model/constants";

/**
 * Geometria i decyzje tła ekranu rozgrywki przy ukrytej mapie.
 *
 * Wszystko, co jest decyzją, siedzi tutaj jako czyste dane — komponent ma
 * wyłącznie zamienić to na elementy SVG. Powód jest testowy: repo nie
 * snapshotuje grafiki i nie ma zacząć (snapshot rysunku zamienia każde
 * strojenie na urządzeniu w czerwony build i uczy ludzi `-u` bez patrzenia).
 * Da się za to przypiąć testem REGUŁY — budżet czerwieni, wykrważanie poza
 * kadr, który token niesie kolor — i to są rzeczy trwałe, w odróżnieniu od
 * samych współrzędnych.
 */

/**
 * Kanwa. Ta sama proporcja co risk-quiz-background.tsx — jedna konwencja dla
 * teł w tej aplikacji.
 *
 * Przy `preserveAspectRatio="xMidYMid slice"` i orientacji zablokowanej na
 * portret (app.json) kadrowanie wychodzi tak:
 *   tablet 800x1280  -> skala 2,0    widoczne y ∈ [80, 720], pełna szerokość
 *   telefon 390x844  -> skala 1,055  widoczne x ∈ [15, 385], pełna wysokość
 *
 * Gdyby na urządzeniu kreska wyszła za gruba, NIE ruszać grubości ani
 * współrzędnych — podbić kanwę do 520x1040. Ta sama proporcja, więc to samo
 * kadrowanie, a wszystko na ekranie robi się cieńsze i jest go więcej. Jedna
 * stała zamiast przechodzenia po kilkudziesięciu wartościach.
 */
export const BACKDROP_VIEWBOX_WIDTH = 400;
export const BACKDROP_VIEWBOX_HEIGHT = 800;

/**
 * Część kanwy widoczna przy każdej proporcji ekranu. Cokolwiek MUSI być
 * widoczne zawsze, mieści się tutaj; wszystko inne ma przekraczać krawędzie
 * kanwy, żeby kadr nigdy nie odsłonił uciętego kikuta.
 */
export const BACKDROP_SAFE_FRAME = { minX: 15, maxX: 385, minY: 80, maxY: 720 } as const;

/** Poza kanwą z każdej strony — stąd zaczynają i tu kończą się wykrwawienia. */
const BLEED_LEFT = -24;
const BLEED_RIGHT = BACKDROP_VIEWBOX_WIDTH + 24;
const BLEED_TOP = -40;
const BLEED_BOTTOM = BACKDROP_VIEWBOX_HEIGHT + 40;

export type BackdropMotif = "access-card";

/** Token palety niosący dany kolor. Jawna unia, żeby test mógł pilnować wyboru. */
export type BackdropColorToken = "border" | "textSubtle" | "accent" | "accentStrong";

export type BackdropPath = { id: string; d: string };

export type BackdropAccentMark = { x: number; y: number; width: number; height: number };

export type BackdropSpec = {
  /** `null` = sama baza: tło, poświata, winieta. Bez motywu. */
  motif: BackdropMotif | null;
  glowToken: BackdropColorToken;
  glowOpacity: number;
  vignetteOpacity: number;
  /** Ciemny maluje pasy na płasko, jasny pokazuje wyłącznie ich pasowanie. */
  bandStyle: "fill" | "stroke";
  bandColorToken: BackdropColorToken;
  bandOpacity: number;
  traceColorToken: BackdropColorToken;
  traceOpacity: number;
  dotOpacity: number;
  arcColorToken: BackdropColorToken;
  arcOpacities: readonly [number, number, number];
  accentMarkOpacity: number;
  /**
   * Prostokąty w kolorze `accent`. Na karcie dostępu czerwień to 0,51%
   * powierzchni i dwa elementy; tutaj jest jeden i 0,14%, bo to tło, nie
   * pierwszy plan.
   *
   * ŻADNEGO drugiego elementu w `accent` w tej warstwie. W oprawie kryminalnej
   * `accent` ma już ponad sto wywołań na ramkach i stanach aktywnych —
   * ambientowa czerwień w tle zamieniłaby pomiar z constants.ts w fikcję.
   * Pilnuje tego test budżetu powierzchni.
   */
  accentMarks: readonly BackdropAccentMark[];
  hasScanSweep: boolean;
};

/**
 * Ukośne pasy grafitu.
 *
 * Jawne ścieżki, nie `<Pattern>`: ukośny wzór wymaga `patternTransform`, czyli
 * najsłabiej wspieranego kawałka API między natywnym a webowym backendem
 * react-native-svg — chamfered-panel.tsx omija go tą samą drogą, wpiekając skos
 * w ścieżkę kafla. Do tego kafel daje jednostajny rytm, a karta go nie ma:
 * szerokości są wyraźnie nierówne i to jest połowa charakteru.
 *
 * Każdy pas biegnie przez całą wysokość kanwy z zapasem, więc kadrowanie w
 * pionie nigdy nie odsłoni jego końca. Nachylenie 22° od pionu — 45° czytałoby
 * się jak taśma ostrzegawcza, czyli zupełnie inny rejestr.
 */
const BAND_SHEAR = Math.round((BLEED_BOTTOM - BLEED_TOP) * Math.tan((22 * Math.PI) / 180));

/** Suma szerokości 132 z 400, czyli ~33% kanwy: pasy są przedmiotem kadru, ale nie zalewają go. */
const BAND_LAYOUT: readonly { x: number; width: number }[] = [
  { x: -90, width: 74 },
  { x: 30, width: 36 },
  { x: 130, width: 14 },
  { x: 215, width: 8 },
];

export function buildGraphiteBands(): BackdropPath[] {
  return BAND_LAYOUT.map((band, index) => {
    const left = band.x;
    const right = band.x + band.width;

    return {
      id: `band-${index}`,
      d: `M ${left} ${BLEED_BOTTOM} L ${right} ${BLEED_BOTTOM} L ${right + BAND_SHEAR} ${BLEED_TOP} L ${left + BAND_SHEAR} ${BLEED_TOP} Z`,
    };
  });
}

/**
 * Schodkowe linie włosowe: poziome przebiegi łączone podjazdami pod 45°.
 * Zaczynają przed lewą krawędzią i kończą za prawą, więc kadrowanie w poziomie
 * nie odsłoni końcówki.
 */
type TraceLayout = { y: number; steps: readonly { at: number; delta: number }[] };

const TRACE_LAYOUT: readonly TraceLayout[] = [
  { y: 104, steps: [{ at: 118, delta: 26 }, { at: 268, delta: -26 }] },
  { y: 208, steps: [{ at: 64, delta: -22 }] },
  { y: 322, steps: [{ at: 196, delta: 30 }, { at: 300, delta: -30 }] },
  { y: 468, steps: [{ at: 88, delta: 24 }] },
  { y: 596, steps: [{ at: 152, delta: -28 }, { at: 286, delta: 28 }] },
  { y: 706, steps: [{ at: 230, delta: 20 }] },
];

export function buildSteppedTraces(): BackdropPath[] {
  return TRACE_LAYOUT.map((trace, index) => {
    let y = trace.y;
    let d = `M ${BLEED_LEFT} ${y}`;

    for (const step of trace.steps) {
      // Podjazd pod 45°, więc przesuw w poziomie równa się przesuwowi w pionie.
      d += ` H ${step.at} L ${step.at + Math.abs(step.delta)} ${y + step.delta}`;
      y += step.delta;
    }

    return { id: `trace-${index}`, d: `${d} H ${BLEED_RIGHT}` };
  });
}

/**
 * Łuki RFID — jedyny element ogniskowy warstwy.
 *
 * Środek leży POZA kanwą przy lewej krawędzi, w połowie wysokości. Dwa powody:
 * łuk wybiegający poza ekran czyta się jako „karta jest większa niż ekran",
 * czyli dokładnie przesłanka tego tła; a lewy bok w połowie wysokości to jedyny
 * rejon bez chromu — góra należy do panelu realizacji i listy zadań, dół do
 * panelu odliczania.
 *
 * Kotwica i promienie to stałe do zweryfikowania na tablecie wobec realnego
 * chromu. Nic poza nimi nie powinno się tam zmieniać.
 */
const ARC_CENTER_X = -60;
const ARC_CENTER_Y = 520;
const ARC_RADII = [150, 186, 222] as const;
/** Rozpiętość dobrana tak, żeby oba końce każdego łuku wypadły za lewą krawędź. */
const ARC_HALF_SWEEP_DEGREES = 110;

export function buildRfidArcs(): BackdropPath[] {
  const radians = (ARC_HALF_SWEEP_DEGREES * Math.PI) / 180;
  const round = (value: number) => Math.round(value * 10) / 10;

  return ARC_RADII.map((radius, index) => {
    const dx = round(ARC_CENTER_X + radius * Math.cos(radians));
    const startY = round(ARC_CENTER_Y - radius * Math.sin(radians));
    const endY = round(ARC_CENTER_Y + radius * Math.sin(radians));

    // large-arc-flag 1, bo rozpiętość 220° przekracza półokrąg; sweep-flag 1,
    // bo przy osi Y skierowanej w dół rosnący kąt biegnie zgodnie z zegarem.
    return {
      id: `arc-${index}`,
      d: `M ${dx} ${startY} A ${radius} ${radius} 0 1 1 ${dx} ${endY}`,
    };
  });
}

/** Kropkowane segmenty. Jeden `<Line>` z przerywaniem zamiast trzydziestu kilku kółek. */
export const BACKDROP_DOT_ROWS = [250, 640] as const;
export const BACKDROP_DOT_ROW_BOUNDS = { x1: BLEED_LEFT, x2: BLEED_RIGHT } as const;
/**
 * Nie `"0 9"` — zerowa długość kreski to znany przypadek brzegowy, na części
 * rendererów nie rysuje się nic mimo zaokrąglonej końcówki.
 */
export const BACKDROP_DOT_DASH = "1 9";

/**
 * Jedyny akcent czerwieni: zakończenie przebiegu z warstwy linii włosowych,
 * a nie pływający prostokąt. Trzymany w bezpiecznej ramce, bo jest jedynym
 * elementem, który ma być widoczny przy każdej proporcji ekranu.
 */
const ACCENT_MARK: BackdropAccentMark = { x: 292, y: 465, width: 90, height: 5 };

const CRIME_DARK: BackdropSpec = {
  motif: "access-card",
  // Biel, NIE akcent. Poświata na 62% promienia w czerwieni wrzuciłaby na ekran
  // wielokrotność całego budżetu czerwieni tej warstwy. Na karcie zresztą to,
  // co ma wybijać, jest białe — czyta się jako lampa nad biurkiem ochrony.
  glowToken: "accentStrong",
  glowOpacity: 0.07,
  vignetteOpacity: 0.56,
  bandStyle: "fill",
  // Nieprzezroczysty hex, nie `panelStrong`: rgba w `fill` mnoży się z
  // `fillOpacity` i traci się kontrolę nad wynikiem. Pas wychodzi ciemniejszy
  // niż panel, więc panele dalej czytają się jako warstwa nad tłem.
  bandColorToken: "border",
  bandOpacity: 0.55,
  traceColorToken: "textSubtle",
  traceOpacity: 0.2,
  dotOpacity: 0.22,
  arcColorToken: "textSubtle",
  arcOpacities: [0.26, 0.18, 0.12],
  accentMarkOpacity: 0.55,
  accentMarks: [ACCENT_MARK],
  hasScanSweep: true,
};

/**
 * Wariant jasny kryminału to WYDRUK z tego samego systemu, nie przyciemniony
 * wariant ciemny — zgodnie z opisem palety w constants.ts. Stąd asymetrie:
 */
const CRIME_LIGHT: BackdropSpec = {
  motif: "access-card",
  // Poświata wyłączona. `accentStrong` w jasnym to ciemna stal, więc
  // „poświata" byłaby ciemną smugą. Głębiej: wydruk nie ma źródła światła.
  // To świadoma asymetria, nie przeoczenie.
  glowToken: "accentStrong",
  glowOpacity: 0,
  vignetteOpacity: 0.22,
  // Pasy z wypełnienia na kontur: wydruk pokazuje pasowanie pasa, nie jego
  // farbę. Lity szary slab na bladym papierze byłby ciężki i brzydki.
  bandStyle: "stroke",
  bandColorToken: "border",
  bandOpacity: 0.5,
  traceColorToken: "textSubtle",
  // Krycie w GÓRĘ względem ciemnego: ciemny tusz na jasnym papierze potrzebuje
  // więcej, nie mniej.
  traceOpacity: 0.28,
  dotOpacity: 0.3,
  arcColorToken: "border",
  arcOpacities: [0.22, 0.16, 0.12],
  // Głęboka czerwień przy niskim kryciu na bladym papierze robi się różowa,
  // czyli zupełnie inny rejestr. Wyższe krycie, ta sama znikoma powierzchnia.
  accentMarkOpacity: 0.7,
  accentMarks: [ACCENT_MARK],
  // Wydruku się nie skanuje.
  hasScanSweep: false,
};

/**
 * Oprawy bez własnego motywu dostają samą bazę: tło, poświata, winieta. To i
 * tak jest ściśle lepsze od stanu zastanego, w którym tłem była ikona aplikacji
 * 512 px rozciągnięta na cały ekran.
 */
function baseSpec(mode: ExpeditionThemeMode): BackdropSpec {
  return {
    motif: null,
    glowToken: "accent",
    glowOpacity: mode === "dark" ? 0.1 : 0.06,
    vignetteOpacity: mode === "dark" ? 0.48 : 0.2,
    bandStyle: mode === "dark" ? "fill" : "stroke",
    bandColorToken: "border",
    bandOpacity: 0,
    traceColorToken: "textSubtle",
    traceOpacity: 0,
    dotOpacity: 0,
    arcColorToken: "textSubtle",
    arcOpacities: [0, 0, 0],
    accentMarkOpacity: 0,
    accentMarks: [],
    hasScanSweep: false,
  };
}

/**
 * `Record` wymusza wpis dla każdej rodziny — nowa oprawa bez decyzji o tle nie
 * przejdzie kompilacji, zamiast po cichu dostać cudzy motyw. Ten sam wzorzec co
 * DISPLAY_FAMILY_BY_THEME w shared/ui/typography.ts.
 */
const SPEC_BY_FAMILY: Record<
  ExpeditionThemeFamily,
  (mode: ExpeditionThemeMode) => BackdropSpec
> = {
  expedition: baseSpec,
  // Nieosiągalne w tym miejscu: realizacja typu risk-quiz rutuje do
  // RiskQuizScreen (mobile-app.tsx), więc do ekranu ekspedycji trafiają tylko
  // expedition, crime i christmas. Wpis istnieje dla kompletności Recordu —
  // gdyby Ryzykanci kiedyś jechali na tym ekranie, trzeba go wypełnić.
  risk: baseSpec,
  crime: (mode) => (mode === "dark" ? CRIME_DARK : CRIME_LIGHT),
  christmas: baseSpec,
};

export function resolveBackdropSpec(
  family: ExpeditionThemeFamily,
  mode: ExpeditionThemeMode,
): BackdropSpec {
  return SPEC_BY_FAMILY[family](mode);
}
