// Team.color stores a palette key ("amber"), not a hex — handing it straight to
// a CSS colour silently produces nothing. Mirrors TEAM_COLOR_DEFINITIONS in
// apps/mobile/src/features/onboarding/model/constants.ts, which is what actually
// paints the team banner on the tablet.
//
// Lived inside current-realization-teams-map.tsx until the chat needed the same
// lookup; importing it from there would have dragged Leaflet along with it.
const TEAM_COLOR_HEX_BY_KEY: Record<string, string> = {
  red: "#ef4444",
  rose: "#f43f5e",
  pink: "#ec4899",
  magenta: "#d946ef",
  violet: "#8b5cf6",
  purple: "#7e22ce",
  indigo: "#6366f1",
  navy: "#1e3a8a",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  turquoise: "#06b6b8",
  teal: "#14b8a6",
  mint: "#2dd4bf",
  aquamarine: "#34d399",
  emerald: "#10b981",
  green: "#22c55e",
  lime: "#84cc16",
  orange: "#f97316",
  amber: "#f59e0b",
  gold: "#d4af37",
  yellow: "#eab308",
  brown: "#92400e",
  gray: "#6b7280",
  slate: "#64748b",
  black: "#111827",
  white: "#f8fafc",
};

export const DEFAULT_TEAM_COLOR_HEX = "#0ea5e9";

// Accepts a palette key, a literal hex (older rows and imports carry those), or
// nothing at all.
export function resolveTeamColorHex(color: string | null | undefined, fallback = DEFAULT_TEAM_COLOR_HEX) {
  if (!color) {
    return fallback;
  }

  const normalized = color.trim().toLowerCase();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)) {
    return normalized;
  }

  return TEAM_COLOR_HEX_BY_KEY[normalized] || fallback;
}
