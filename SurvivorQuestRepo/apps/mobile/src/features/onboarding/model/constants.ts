import type { TeamColorOption } from "./types";

export const EXPEDITION_THEME = {
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
} as const;

export const TEAM_COLORS: TeamColorOption[] = [
  { key: "red", label: "Czerwony", hex: "#ef4444" },
  { key: "orange", label: "Pomarańczowy", hex: "#f97316" },
  { key: "amber", label: "Bursztynowy", hex: "#f59e0b" },
  { key: "yellow", label: "Żółty", hex: "#eab308" },
  { key: "lime", label: "Limonkowy", hex: "#84cc16" },
  { key: "emerald", label: "Szmaragdowy", hex: "#10b981" },
  { key: "teal", label: "Morski", hex: "#14b8a6" },
  { key: "cyan", label: "Cyjan", hex: "#06b6d4" },
  { key: "sky", label: "Błękitny", hex: "#0ea5e9" },
  { key: "blue", label: "Niebieski", hex: "#3b82f6" },
  { key: "indigo", label: "Indygo", hex: "#6366f1" },
  { key: "violet", label: "Fioletowy", hex: "#8b5cf6" },
  { key: "rose", label: "Różowy", hex: "#f43f5e" },
  { key: "pink", label: "Jasnoróżowy", hex: "#ec4899" },
  { key: "slate", label: "Grafitowy", hex: "#64748b" },
];

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
];

export const TEAM_SLOTS = Array.from({ length: 8 }, (_, index) => index + 1);

export const DEFAULT_REALIZATION_CODE = "TEST";
