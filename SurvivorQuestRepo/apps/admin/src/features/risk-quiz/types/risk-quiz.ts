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

export type RiskTeamCategoryStatus = {
  categoryId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
  attempted: number;
  total: number;
};

export type RiskTeamStatus = {
  teamId: string;
  teamName: string | null;
  slotNumber: number;
  color: string | null;
  totalAttempted: number;
  totalCards: number;
  categories: RiskTeamCategoryStatus[];
};

export type RiskTeamStatusResponse = {
  teams: RiskTeamStatus[];
};

export type RiskTeamResetResult = {
  teamId: string;
  resetCount: number;
  pointsAdjusted: number;
};

// One row per pool station (task) in the team's scheme — the granular unit
// that actually carries a per-team status, mirroring the classic game's
// per-station task table. A printed card is just an interchangeable QR key
// into a (category, difficulty) pool, so it isn't the unit shown here.
export type RiskTeamBoardTaskStatus = "todo" | "done" | "failed";

export type RiskTeamBoardTask = {
  categoryId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
  stationId: string;
  stationName: string;
  status: RiskTeamBoardTaskStatus;
  pointsAwarded: number;
};

export type RiskTeamPendingDraw = {
  categoryId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
};

export type RiskTeamBoard = {
  teamId: string;
  tasks: RiskTeamBoardTask[];
  pendingDraw: RiskTeamPendingDraw | null;
};

export type RiskTeamCardActionResult = {
  teamId: string;
  stationId: string;
  taskStatus: "done" | "failed" | "todo";
  pointsAwarded: number;
  teamPoints: number;
};

export type RiskRemoteDrawResult = {
  id: string;
  teamId: string;
  cardId: string;
  stationId: string;
  createdAt: string;
};

export type RiskCancelRemoteDrawResult = {
  teamId: string;
  cancelled: boolean;
};

export const RISK_DIFFICULTY_OPTIONS: { value: RiskDifficulty; label: string }[] = [
  { value: "EASY", label: "Łatwe" },
  { value: "MEDIUM", label: "Średnie" },
  { value: "HARD", label: "Trudne" },
];
