import type { TeamColorOption } from "./types";

export const TEAM_COLORS: TeamColorOption[] = [
  { key: "red", label: "Red", hex: "#ef4444" },
  { key: "orange", label: "Orange", hex: "#f97316" },
  { key: "amber", label: "Amber", hex: "#f59e0b" },
  { key: "yellow", label: "Yellow", hex: "#eab308" },
  { key: "lime", label: "Lime", hex: "#84cc16" },
  { key: "emerald", label: "Emerald", hex: "#10b981" },
  { key: "cyan", label: "Cyan", hex: "#06b6d4" },
  { key: "blue", label: "Blue", hex: "#3b82f6" },
  { key: "violet", label: "Violet", hex: "#8b5cf6" },
  { key: "rose", label: "Rose", hex: "#f43f5e" },
];

export const TEAM_ICONS = ["🦊", "🐺", "🦅", "🦫", "🐯", "🐉", "🦁", "🦈", "🐙", "🐻"];

export const TEAM_SLOTS = Array.from({ length: 8 }, (_, index) => index + 1);

export const DEFAULT_REALIZATION_CODE = "TEST";
