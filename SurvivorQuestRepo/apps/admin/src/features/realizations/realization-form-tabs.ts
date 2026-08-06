export type RealizationFormTabId = "basic" | "gameplay" | "scenario" | "stations" | "summary" | "history";

export const REALIZATION_FORM_TAB_ORDER: RealizationFormTabId[] = [
  "basic",
  "gameplay",
  "scenario",
  "stations",
  "summary",
  "history",
];

export const REALIZATION_FORM_TAB_LABELS: Record<RealizationFormTabId, string> = {
  basic: "Podstawowe informacje",
  gameplay: "Ustawienia rozgrywki",
  scenario: "Scenariusz i treści",
  stations: "Stanowiska",
  summary: "Podsumowanie",
  history: "Historia zmian",
};
