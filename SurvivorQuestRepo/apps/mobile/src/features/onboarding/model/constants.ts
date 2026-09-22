import type { TeamColor, TeamColorOption } from "./types";

export type ExpeditionThemePalette = {
  background: string;
  mapLine: string;
  mapNode: string;
  panel: string;
  panelMuted: string;
  panelStrong: string;
  border: string;
  accent: string;
  accentStrong: string;
  textPrimary: string;
  textMuted: string;
  textSubtle: string;
  danger: string;
  // Zieleń "zaliczone". Do 2026-09-08 nie było tego tokenu i #34d399 siedziało
  // zahardkodowane w kilku miejscach — czyli nie przełączało się na motyw jasny,
  // gdzie na bladym panelu jest praktycznie nieczytelne.
  success: string;
  // Overlay scrims, stored as bare "r, g, b" triplets because every call site
  // picks its own opacity: `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)`.
  // wash  = light-mode dimming over light panels
  // deep  = dark-mode dimming behind full-screen overlays
  // abyss = the darkest dimming, for overlays that must black out the screen
  scrimWashRgb: string;
  scrimDeepRgb: string;
  scrimAbyssRgb: string;
};

export type ExpeditionThemeMode = "dark" | "light";

// Which palette set a screen draws from. "expedition" is the green field-journal
// look every regular realization uses; "risk" is the navy/gold card-table look
// reserved for risk-quiz ("Ryzykanci") realizations; "crime" is the noir
// case-file look for realizations carrying the crime theme pack; "christmas" is
// the seasonal one. All three of those run the same map and station mechanics as
// expedition and differ only in dress. Every family carries a full dark and
// light variant, so the user's theme toggle keeps working either way.
export type ExpeditionThemeFamily = "expedition" | "risk" | "crime" | "christmas";

const EXPEDITION_THEME_DARK: ExpeditionThemePalette = {
  background: "#0f1914",
  mapLine: "#365344",
  mapNode: "#567562",
  panel: "rgba(22, 41, 33, 0.92)",
  panelMuted: "rgba(18, 34, 27, 0.94)",
  panelStrong: "rgba(34, 60, 47, 0.92)",
  border: "#446251",
  accent: "#f0c977",
  accentStrong: "#ffd98d",
  textPrimary: "#f3f5ef",
  textMuted: "#bdcdbf",
  textSubtle: "#98ad9c",
  danger: "#ef6f6c",
  success: "#34d399",
  scrimWashRgb: "17, 30, 23",
  scrimDeepRgb: "15, 25, 20",
  scrimAbyssRgb: "5, 10, 8",
};

const EXPEDITION_THEME_LIGHT: ExpeditionThemePalette = {
  background: "#dde2c9",
  mapLine: "#9cab88",
  mapNode: "#81946f",
  panel: "rgba(233, 239, 213, 0.96)",
  panelMuted: "rgba(226, 234, 203, 0.98)",
  panelStrong: "rgba(214, 224, 190, 0.98)",
  border: "#9fad87",
  accent: "#b99046",
  accentStrong: "#9d7736",
  textPrimary: "#243123",
  textMuted: "#4e6148",
  textSubtle: "#67795f",
  danger: "#ae5954",
  success: "#2f7d5c",
  scrimWashRgb: "17, 30, 23",
  scrimDeepRgb: "15, 25, 20",
  scrimAbyssRgb: "5, 10, 8",
};

const RISK_THEME_DARK: ExpeditionThemePalette = {
  background: "#071017",
  mapLine: "#1b2c38",
  mapNode: "#2c4152",
  panel: "rgba(13, 25, 35, 0.92)",
  panelMuted: "rgba(9, 19, 27, 0.94)",
  panelStrong: "rgba(20, 37, 50, 0.92)",
  // Borders carry the gold too, dimmed enough that a screen full of panel edges
  // reads as a card-table trim rather than a wall of accent.
  border: "#8a6626",
  accent: "#c89439",
  accentStrong: "#dfab52",
  textPrimary: "#f0f0f0",
  textMuted: "#a9b7c1",
  textSubtle: "#7d8d99",
  danger: "#ef6f6c",
  success: "#34d399",
  scrimWashRgb: "7, 16, 23",
  scrimDeepRgb: "6, 14, 20",
  scrimAbyssRgb: "3, 8, 12",
};

const RISK_THEME_LIGHT: ExpeditionThemePalette = {
  background: "#e8ecef",
  mapLine: "#9fadb8",
  mapNode: "#7d8d99",
  panel: "rgba(248, 250, 251, 0.96)",
  panelMuted: "rgba(238, 242, 246, 0.98)",
  panelStrong: "rgba(226, 232, 238, 0.98)",
  border: "#bf9a52",
  // The raw gold accent is unreadable on a light surface, so the light variant
  // walks it down until it carries text-grade contrast against `background`.
  accent: "#96691f",
  accentStrong: "#7a5416",
  textPrimary: "#071017",
  textMuted: "#3c4c58",
  textSubtle: "#5b6c78",
  danger: "#ae5954",
  success: "#1f7a53",
  scrimWashRgb: "7, 16, 23",
  scrimDeepRgb: "6, 14, 20",
  scrimAbyssRgb: "3, 8, 12",
};

// Corporate noir: wewnętrzny system dochodzeniowy dużej korporacji, oglądany
// późnym wieczorem w dyskretnie oświetlonym centrum operacyjnym. Nie gra
// policyjna, nie kasyno, nie cyberpunk.
//
// Proporcje, które ta paleta ma trzymać: ~70% obsydian i grafit, ~20% jasne
// powierzchnie dokumentów, ~10% bursztyn i statusy. Bursztyn ma przypominać
// światło starej lampy albo podświetlenie terminala — jeśli zacznie wyglądać
// jak pomarańcz z aplikacji sportowej, znaczy, że jest go za dużo albo jest
// za nasycony.
const CRIME_THEME_DARK: ExpeditionThemePalette = {
  background: "#0B0D10",
  mapLine: "#262C34",
  mapNode: "#3A414A",
  // Panele zachowują alfę, mimo że specyfikacja mówi o płaskich
  // powierzchniach: pod nimi leży gradient tła i scrimy overlayów, a pełna
  // nieprzezroczystość spłaszczyłaby warstwowanie, na którym stoi cała reszta
  // aplikacji.
  panel: "rgba(32, 38, 46, 0.92)",
  panelMuted: "rgba(17, 20, 25, 0.94)",
  panelStrong: "rgba(42, 48, 56, 0.92)",
  border: "#454B53",
  accent: "#F5A623",
  // NIE Burnished Amber ze specyfikacji, mimo nazwy "przygaszony akcent".
  // `accentStrong` jest w tym kodzie kolorem TEKSTU dla podkreślenia — tytuły,
  // wartość odliczania, spinnery. Na ciemnym tle podkreślenie musi być
  // jaśniejsze od akcentu, inaczej hierarchia się odwraca i czytelność spada.
  // Burnished Amber pracuje w wariancie jasnym, gdzie faktycznie niesie
  // kontrast.
  accentStrong: "#FFBE5C",
  textPrimary: "#F5F1E8",
  textMuted: "#A7ABB0",
  textSubtle: "#7C8187",
  // Dark Crimson ze specyfikacji to #9F3D3D, co na Deep Obsidian daje kontrast
  // 2.97 — o włos pod progiem 3.0. Podniesione o pięć punktów na kanał: jako
  // zmiana barwy niezauważalna, ale `danger` bywa kolorem tekstu błędu, a
  // takiego na prawie czarnym tle nie chcemy mieć na granicy czytelności.
  danger: "#A44242",
  success: "#667B5A",
  scrimWashRgb: "11, 13, 16",
  scrimDeepRgb: "8, 10, 12",
  scrimAbyssRgb: "4, 5, 7",
};

// Wariant jasny to rozłożone akta, nie rozjaśniony terminal: bazą jest Aged
// Ivory, czyli ten sam papier, na którym w trybie ciemnym drukują się
// dokumenty. Bursztyn schodzi do Burnished Amber i niżej, bo jasny Amber na
// kości słoniowej nie niesie kontrastu tekstowego — ta sama zasada, co przy
// złocie Ryzykantów.
const CRIME_THEME_LIGHT: ExpeditionThemePalette = {
  background: "#EEE9DE",
  mapLine: "#BCB4A4",
  mapNode: "#9A9283",
  panel: "rgba(250, 247, 240, 0.96)",
  panelMuted: "rgba(243, 239, 230, 0.98)",
  panelStrong: "rgba(232, 226, 214, 0.98)",
  border: "#B3AA99",
  accent: "#B97818",
  accentStrong: "#8C5A11",
  textPrimary: "#14171B",
  textMuted: "#4A4F56",
  textSubtle: "#6B7076",
  danger: "#9F3D3D",
  success: "#4F6146",
  scrimWashRgb: "11, 13, 16",
  scrimDeepRgb: "8, 10, 12",
  scrimAbyssRgb: "4, 5, 7",
};

// Święta: nasycony świerk zamiast oliwkowej zieleni ekspedycji, z czerwienią
// ostrokrzewu na ramkach i akcentach. Zieleń z czerwienią to para, po której
// oprawę widać z drugiego końca sali — i to odróżnia ją od ekspedycji, która
// jest zielona, ale z piaskowym akcentem.
const CHRISTMAS_THEME_DARK: ExpeditionThemePalette = {
  background: "#0b1f17",
  mapLine: "#1f4436",
  mapNode: "#2f5f4a",
  panel: "rgba(16, 45, 34, 0.92)",
  panelMuted: "rgba(11, 35, 26, 0.94)",
  panelStrong: "rgba(24, 61, 46, 0.92)",
  border: "#8c2f33",
  accent: "#e05a55",
  accentStrong: "#f2827c",
  textPrimary: "#f4f7f3",
  textMuted: "#b7c7bd",
  textSubtle: "#8aa096",
  danger: "#ef6f6c",
  success: "#34d399",
  scrimWashRgb: "11, 31, 23",
  scrimDeepRgb: "8, 22, 17",
  scrimAbyssRgb: "4, 12, 9",
};

// Wariant jasny idzie w śnieg. Czerwień schodzi do głębokiej, bo jasna z
// ciemnego wariantu nie niesie kontrastu tekstowego na bladym tle — ta sama
// zasada, co przy złocie Ryzykantów i czerwieni kryminału.
const CHRISTMAS_THEME_LIGHT: ExpeditionThemePalette = {
  background: "#eef3ee",
  mapLine: "#a8bdaf",
  mapNode: "#87a292",
  panel: "rgba(250, 252, 249, 0.96)",
  panelMuted: "rgba(240, 245, 240, 0.98)",
  panelStrong: "rgba(228, 236, 229, 0.98)",
  border: "#a8474a",
  accent: "#a32a2e",
  accentStrong: "#851f23",
  textPrimary: "#0b1f17",
  textMuted: "#3b4f44",
  textSubtle: "#5c7065",
  danger: "#ae5954",
  success: "#1f7a53",
  scrimWashRgb: "11, 31, 23",
  scrimDeepRgb: "8, 22, 17",
  scrimAbyssRgb: "4, 12, 9",
};

const EXPEDITION_THEMES: Record<ExpeditionThemeFamily, Record<ExpeditionThemeMode, ExpeditionThemePalette>> = {
  expedition: {
    dark: EXPEDITION_THEME_DARK,
    light: EXPEDITION_THEME_LIGHT,
  },
  risk: {
    dark: RISK_THEME_DARK,
    light: RISK_THEME_LIGHT,
  },
  crime: {
    dark: CRIME_THEME_DARK,
    light: CRIME_THEME_LIGHT,
  },
  christmas: {
    dark: CHRISTMAS_THEME_DARK,
    light: CHRISTMAS_THEME_LIGHT,
  },
};

let activeExpeditionThemeMode: ExpeditionThemeMode = "dark";
let activeExpeditionThemeFamily: ExpeditionThemeFamily = "expedition";

export function setExpeditionThemeMode(
  mode: ExpeditionThemeMode,
  family: ExpeditionThemeFamily = "expedition",
) {
  activeExpeditionThemeMode = mode;
  activeExpeditionThemeFamily = family;
}

export function getExpeditionThemeMode() {
  return activeExpeditionThemeMode;
}

export function getExpeditionThemeFamily() {
  return activeExpeditionThemeFamily;
}

export function getExpeditionThemePalette(
  mode: ExpeditionThemeMode = activeExpeditionThemeMode,
  family: ExpeditionThemeFamily = activeExpeditionThemeFamily,
) {
  return EXPEDITION_THEMES[family][mode];
}

function resolveThemeToken(token: keyof ExpeditionThemePalette) {
  return getExpeditionThemePalette()[token];
}

export const EXPEDITION_THEME: ExpeditionThemePalette = {
  get background() {
    return resolveThemeToken("background");
  },
  get mapLine() {
    return resolveThemeToken("mapLine");
  },
  get mapNode() {
    return resolveThemeToken("mapNode");
  },
  get panel() {
    return resolveThemeToken("panel");
  },
  get panelMuted() {
    return resolveThemeToken("panelMuted");
  },
  get panelStrong() {
    return resolveThemeToken("panelStrong");
  },
  get border() {
    return resolveThemeToken("border");
  },
  get accent() {
    return resolveThemeToken("accent");
  },
  get accentStrong() {
    return resolveThemeToken("accentStrong");
  },
  get textPrimary() {
    return resolveThemeToken("textPrimary");
  },
  get textMuted() {
    return resolveThemeToken("textMuted");
  },
  get textSubtle() {
    return resolveThemeToken("textSubtle");
  },
  get danger() {
    return resolveThemeToken("danger");
  },
  get success() {
    return resolveThemeToken("success");
  },
  get scrimWashRgb() {
    return resolveThemeToken("scrimWashRgb");
  },
  get scrimDeepRgb() {
    return resolveThemeToken("scrimDeepRgb");
  },
  get scrimAbyssRgb() {
    return resolveThemeToken("scrimAbyssRgb");
  },
};

type TeamColorLabelLocale = "polish" | "english" | "ukrainian" | "russian";

type TeamColorDefinition = {
  key: TeamColor;
  hex: string;
  labels: Record<TeamColorLabelLocale, string>;
};

const TEAM_COLOR_DEFINITIONS: TeamColorDefinition[] = [
  {
    key: "red",
    hex: "#ef4444",
    labels: { polish: "Czerwony", english: "Red", ukrainian: "Червоний", russian: "Красный" },
  },
  {
    key: "rose",
    hex: "#f43f5e",
    labels: { polish: "Różany", english: "Rose", ukrainian: "Трояндовий", russian: "Розовый" },
  },
  {
    key: "pink",
    hex: "#ec4899",
    labels: {
      polish: "Jasnoróżowy",
      english: "Pink",
      ukrainian: "Яскраво-рожевий",
      russian: "Ярко-розовый",
    },
  },
  {
    key: "magenta",
    hex: "#d946ef",
    labels: { polish: "Magenta", english: "Magenta", ukrainian: "Маджента", russian: "Маджента" },
  },
  {
    key: "violet",
    hex: "#8b5cf6",
    labels: { polish: "Fioletowy", english: "Violet", ukrainian: "Фіолетовий", russian: "Фиолетовый" },
  },
  {
    key: "purple",
    hex: "#7e22ce",
    labels: { polish: "Purpurowy", english: "Purple", ukrainian: "Пурпуровий", russian: "Пурпурный" },
  },
  {
    key: "indigo",
    hex: "#6366f1",
    labels: { polish: "Indygo", english: "Indigo", ukrainian: "Індиго", russian: "Индиго" },
  },
  {
    key: "navy",
    hex: "#1e3a8a",
    labels: { polish: "Granatowy", english: "Navy", ukrainian: "Темно-синій", russian: "Тёмно-синий" },
  },
  {
    key: "blue",
    hex: "#3b82f6",
    labels: { polish: "Niebieski", english: "Blue", ukrainian: "Синій", russian: "Синий" },
  },
  {
    key: "sky",
    hex: "#0ea5e9",
    labels: { polish: "Błękitny", english: "Sky blue", ukrainian: "Блакитний", russian: "Голубой" },
  },
  {
    key: "cyan",
    hex: "#06b6d4",
    labels: { polish: "Cyjan", english: "Cyan", ukrainian: "Ціан", russian: "Циан" },
  },
  {
    key: "turquoise",
    hex: "#06b6b8",
    labels: { polish: "Turkusowy", english: "Turquoise", ukrainian: "Бірюзовий", russian: "Бирюзовый" },
  },
  {
    key: "teal",
    hex: "#14b8a6",
    labels: {
      polish: "Morski",
      english: "Teal",
      ukrainian: "Синьо-зелений",
      russian: "Сине-зелёный",
    },
  },
  {
    key: "mint",
    hex: "#2dd4bf",
    labels: { polish: "Miętowy", english: "Mint", ukrainian: "М’ятний", russian: "Мятный" },
  },
  {
    key: "aquamarine",
    hex: "#34d399",
    labels: { polish: "Akwamaryna", english: "Aquamarine", ukrainian: "Аквамарин", russian: "Аквамарин" },
  },
  {
    key: "emerald",
    hex: "#10b981",
    labels: { polish: "Szmaragdowy", english: "Emerald", ukrainian: "Смарагдовий", russian: "Изумрудный" },
  },
  {
    key: "green",
    hex: "#22c55e",
    labels: { polish: "Zielony", english: "Green", ukrainian: "Зелений", russian: "Зелёный" },
  },
  {
    key: "lime",
    hex: "#84cc16",
    labels: { polish: "Limonkowy", english: "Lime", ukrainian: "Лаймовий", russian: "Лаймовый" },
  },
  {
    key: "orange",
    hex: "#f97316",
    labels: { polish: "Pomarańczowy", english: "Orange", ukrainian: "Помаранчевий", russian: "Оранжевый" },
  },
  {
    key: "amber",
    hex: "#f59e0b",
    labels: { polish: "Bursztynowy", english: "Amber", ukrainian: "Бурштиновий", russian: "Янтарный" },
  },
  {
    key: "gold",
    hex: "#d4af37",
    labels: { polish: "Złoty", english: "Gold", ukrainian: "Золотий", russian: "Золотой" },
  },
  {
    key: "yellow",
    hex: "#eab308",
    labels: { polish: "Żółty", english: "Yellow", ukrainian: "Жовтий", russian: "Жёлтый" },
  },
  {
    key: "brown",
    hex: "#92400e",
    labels: { polish: "Brązowy", english: "Brown", ukrainian: "Коричневий", russian: "Коричневый" },
  },
  {
    key: "gray",
    hex: "#6b7280",
    labels: { polish: "Szary", english: "Gray", ukrainian: "Сірий", russian: "Серый" },
  },
  {
    key: "slate",
    hex: "#64748b",
    labels: { polish: "Grafitowy", english: "Slate", ukrainian: "Сланцевий", russian: "Сланцевый" },
  },
  {
    key: "black",
    hex: "#111827",
    labels: { polish: "Czarny", english: "Black", ukrainian: "Чорний", russian: "Чёрный" },
  },
  {
    key: "white",
    hex: "#f8fafc",
    labels: { polish: "Biały", english: "White", ukrainian: "Білий", russian: "Белый" },
  },
];

export function getTeamColors(locale: TeamColorLabelLocale = "polish"): TeamColorOption[] {
  return TEAM_COLOR_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.labels[locale],
    hex: definition.hex,
  }));
}

export const TEAM_COLORS: TeamColorOption[] = getTeamColors("polish");

export const TEAM_ICONS = [
  "🦊",
  "🐺",
  "🦅",
  "🦫",
  "🐯",
  "🐉",
  "🦁",
  "🦈",
  "🐙",
  "🐻",
  "🐼",
  "🦉",
  "🐧",
  "🐢",
  "🐬",
  "🦄",
  "🐸",
  "🦖",
  "🦩",
  "🐝",
  "🐆",
  "🦬",
  "🦓",
  "🦌",
  "🦝",
  "🦔",
  "🐲",
  "🦂",
  "🦋",
  "🐍",
  "🐳",
  "🦀",
  "🐞",
  "🕷️",
  "🦜",
  "🦚",
  "🦢",
  "🦦",
  "🦭",
  "🦇",
];

export const TEAM_SLOTS = Array.from({ length: 8 }, (_, index) => index + 1);

