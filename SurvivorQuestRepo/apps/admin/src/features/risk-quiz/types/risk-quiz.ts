import type { StationType } from "@/features/games/types/station";

export type RiskDifficulty = "EASY" | "MEDIUM" | "HARD";

export type RiskStationSummary = {
  id: string;
  name: string;
  type: StationType;
};

// A station from the shared station library assigned to a category's
// (difficulty) pool — the pool's content IS the assigned station, whatever
// type it is (quiz, wordle, hangman, memory, ...).
export type RiskPoolStation = {
  id: string;
  difficulty: RiskDifficulty;
  stationId: string;
  station: RiskStationSummary;
};

export type RiskCard = {
  id: string;
  categoryId: string;
  difficulty: RiskDifficulty;
  code: string;
};

// A standalone, reusable pool of tasks (by difficulty) — a "task bank" for
// one topic, independent of any deck/realization, assignable into many
// decks.
export type RiskCategory = {
  id: string;
  name: string;
  poolStations: RiskPoolStation[];
};

// A category assigned into a scheme ("talia") — the join row, not a copy.
export type RiskSchemeCategory = {
  id: string;
  order: number;
  categoryId: string;
  category: RiskCategory;
};

export type RiskScheme = {
  id: string;
  name: string;
  schemeCategories: RiskSchemeCategory[];
};

export type RiskCardWithCategory = RiskCard & {
  category: { id: string; name: string };
};

export type RiskBoardTeam = {
  id: string;
  name: string | null;
  slotNumber: number;
  color: string | null;
  badgeKey: string | null;
  points: number;
};

export type RiskBoard = {
  teams: RiskBoardTeam[];
  totalPoints: number;
};

export const RISK_DIFFICULTY_OPTIONS: { value: RiskDifficulty; label: string }[] = [
  { value: "EASY", label: "Łatwe" },
  { value: "MEDIUM", label: "Średnie" },
  { value: "HARD", label: "Trudne" },
];
