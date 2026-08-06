// Dark-mode EXPEDITION_THEME values, copied from
// apps/mobile/src/features/onboarding/model/constants.ts — admin only ever
// previews the dark palette (mobile's default, matches admin's own dark UI).
export const MOBILE_THEME = {
  background: "#0f1914",
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

// Fixed semantic accents used across station panels regardless of theme mode.
export const MOBILE_SEMANTIC_COLORS = {
  success: "#34d399",
  successStrong: "#059669",
  successBorder: "rgba(52, 211, 153, 0.8)",
  successSurface: "rgba(22, 163, 74, 0.24)",
  warning: "#f59e0b",
  warningStrong: "#b45309",
  danger: "#ef4444",
  dangerStrong: "#dc2626",
} as const;
