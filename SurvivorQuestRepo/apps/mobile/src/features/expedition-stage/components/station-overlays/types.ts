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
  | "photo-task"
  | "qr-hunt"
  | "open-quiz"
  | "reviewed-answer"
  | "true-false"
  | "fill-blank";

export type ChallengeDifficulty = "easy" | "medium" | "hard";

export type StationTestViewModel = {
  stationId: string;
  stationType: StationTestType;
  completionCodeInputMode?: "numeric" | "alphanumeric";
  completionCodeLength?: number;
  challengeDifficultyMode?: "admin" | "player";
  challengeDifficulty?: ChallengeDifficulty;
  completionStopwatchEnabled?: boolean;
  fastestCompletionBonusPoints?: number;
  qrScanRequiredCount?: number;
  qrScanCompletedCount?: number;
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
  quizAcceptedAnswers?: string[];
  // Admin-configured Caesar cipher shift (1-25), caesar-cipher stations only.
  // Left unset, resolveCaesarShift falls back to a shift derived
  // deterministically from the station id.
  quizCaesarShift?: number;
  status: ExpeditionTaskStatus;
  quizFailed?: boolean;
  startedAt: string | null;
  fastestBonusPoints?: number;
};

export type StationTestMenuOverlayProps = {
  visible: boolean;
  stations: StationTestViewModel[];
  onClose: () => void;
  onEnterStation: (stationId: string) => void;
  onOpenWelcomeScreen: () => void;
  onOpenFinishScreen: () => void;
  onExitRealization: () => void;
  isFeedbackPopupEnabled: boolean;
  onToggleFeedbackPopupEnabled: () => void;
};

export type StationPreviewOverlayProps = {
  station: StationTestViewModel | null;
  onClose: () => void;
  onRequestClose?: () => void;
  onCompleteTask?: (stationId: string, completionCode: string, startedAt?: string, challengeDifficulty?: string) => Promise<string | null>;
  onSubmitPhotoTask?: (stationId: string, fileUri: string) => Promise<string | null>;
  // Free-text answer sent for the Game Master to judge (reviewed-answer cards).
  // Resolves to an error message on failure, null on success — same contract as
  // onSubmitPhotoTask, which this mirrors.
  onSubmitReviewedAnswer?: (stationId: string, answerText: string) => Promise<string | null>;
  onSubmitQrScan?: (stationId: string, code: string) => Promise<string | null>;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  onTimeExpired?: (stationId: string) => void;
  timedStationPointsDecayEnabled?: boolean;
  languageFlag?: string;
  showLanguageButton?: boolean;
  onOpenLanguagePicker?: () => void;
  // "overlay" (default): full-screen dimmed popup with its own bordered card,
  // header and close button — the normal in-game station flow. "inline":
  // same station panels/logic, but rendered as a plain block that fills
  // whatever parent it's placed in — no backdrop dimming, no card border, no
  // header row — for hosts (like Ryzykanci) that already render their own
  // header/close affordance and want the station content to look like it's
  // part of the main screen instead of a popup.
  presentation?: "overlay" | "inline";
  // Inline mode only: squeeze the station's media box (image/board) down and
  // stack what's left against the bottom edge, for when the host has very
  // little vertical room — e.g. while the on-screen keyboard is up and the
  // answer input has to stay visible. The picture keeps filling the box (and
  // so stays cropped to it) at the reduced height.
  compactMedia?: boolean;
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

