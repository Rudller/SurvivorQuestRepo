export type RealizationFormTabId =
  | "basic"
  | "gameplay"
  | "scenario"
  | "stations"
  | "pointsQr"
  | "riskQuiz"
  | "summary"
  | "history";

export const REALIZATION_FORM_TAB_ORDER: RealizationFormTabId[] = [
  "basic",
  "gameplay",
  "scenario",
  "stations",
  "pointsQr",
  "riskQuiz",
  "summary",
  "history",
];

export const REALIZATION_FORM_TAB_LABELS: Record<RealizationFormTabId, string> = {
  basic: "Podstawowe informacje",
  gameplay: "Ustawienia rozgrywki",
  scenario: "Scenariusz i treści",
  stations: "Stanowiska",
  pointsQr: "Kody punktowe",
  riskQuiz: "Ryzykanci",
  summary: "Podsumowanie",
  history: "Historia zmian",
};
