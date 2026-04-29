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
};

export type ExpeditionThemeMode = "dark" | "light";

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
};

const EXPEDITION_THEMES: Record<ExpeditionThemeMode, ExpeditionThemePalette> = {
  dark: EXPEDITION_THEME_DARK,
  light: EXPEDITION_THEME_LIGHT,
};

let activeExpeditionThemeMode: ExpeditionThemeMode = "dark";

export function setExpeditionThemeMode(mode: ExpeditionThemeMode) {
  activeExpeditionThemeMode = mode;
}

export function getExpeditionThemeMode() {
  return activeExpeditionThemeMode;
}

export function getExpeditionThemePalette(mode: ExpeditionThemeMode = activeExpeditionThemeMode) {
  return EXPEDITION_THEMES[mode];
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

