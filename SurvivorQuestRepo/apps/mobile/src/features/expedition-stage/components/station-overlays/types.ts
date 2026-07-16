import type { ExpeditionLeaderboardEntry, ExpeditionSessionEndReason, ExpeditionTaskStatus } from "../../model/types";

export type StationTestType =
  | "quiz"
  | "audio-quiz"
  | "time"
  | "points"
  | "wordle"
  | "hangman"
  | "mastermind"
  | "anagram"
  | "caesar-cipher"
  | "memory"
  | "simon"
  | "rebus"
  | "boggle"
  | "mini-sudoku"
  | "matching"
  | "strong-password"
  | "photo-task";

export type ChallengeDifficulty = "easy" | "medium" | "hard";

export type StationTestViewModel = {
  stationId: string;
  stationType: StationTestType;
  completionCodeInputMode?: "numeric" | "alphanumeric";
  completionCodeLength?: number;
  challengeDifficultyMode?: "admin" | "player";
  challengeDifficulty?: ChallengeDifficulty;
  completionStopwatchEnabled?: boolean;
  name: string;
  typeLabel: string;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  timeLimitLabel: string;
  quizQuestion?: string;
  quizAnswers?: [string, string, string, string];
  quizCorrectAnswerIndex?: number;
  quizAudioUrl?: string;
  status: ExpeditionTaskStatus;
  quizFailed?: boolean;
  startedAt: string | null;
};

export type StationTestMenuOverlayProps = {
  visible: boolean;
  stations: StationTestViewModel[];
  onClose: () => void;
  onEnterStation: (stationId: string) => void;
  onOpenWelcomeScreen: () => void;
  onOpenFinishScreen: () => void;
  onPreviewSuccessPopup: () => void;
  onPreviewFailedPopup: () => void;
  onExitRealization: () => void;
};

export type StationPreviewOverlayProps = {
  station: StationTestViewModel | null;
  onClose: () => void;
  onRequestClose?: () => void;
  onCompleteTask?: (stationId: string, completionCode: string, startedAt?: string, challengeDifficulty?: string) => Promise<string | null>;
  onSubmitPhotoTask?: (stationId: string, fileUri: string) => Promise<string | null>;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  onTimeExpired?: (stationId: string) => void;
  timedStationPointsDecayEnabled?: boolean;
  debugOutcomePreview?: {
    id: number;
    variant: "success" | "failed";
    message: string;
  } | null;
  onDebugOutcomePreviewConsumed?: () => void;
};

export type QuizPrestartOverlayProps = {
  visible: boolean;
  stationName: string | null;
  stationType?: StationTestType;
  timeLimitSeconds?: number;
  points?: number;
  timedStationPointsDecayEnabled?: boolean;
  challengeDifficultyMode?: "admin" | "player";
  challengeDifficulty?: ChallengeDifficulty;
  isStarting?: boolean;
  onStart: (challengeDifficulty?: ChallengeDifficulty) => void;
  onClose: () => void;
};

export type WelcomePreviewOverlayProps = {
  visible: boolean;
  introText?: string;
  onClose: () => void;
};

export type RealizationFinishOverlayProps = {
  visible: boolean;
  reason: ExpeditionSessionEndReason | "manual-preview" | null;
  endedAt: string | null;
  leaderboardEntries: ExpeditionLeaderboardEntry[];
  currentTeamId: string;
  showLeaderboard: boolean;
  canClose: boolean;
  onClose: () => void;
};

