import type { ExpeditionTaskStatus } from "../../model/types";

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
  | "matching";

export type StationTestViewModel = {
  stationId: string;
  stationType: StationTestType;
  completionCodeInputMode?: "numeric" | "alphanumeric";
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
  onPreviewSuccessPopup: () => void;
  onPreviewFailedPopup: () => void;
};

export type StationPreviewOverlayProps = {
  station: StationTestViewModel | null;
  onClose: () => void;
  onRequestClose?: () => void;
  onCompleteTask?: (stationId: string, completionCode: string, startedAt?: string) => Promise<string | null>;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  onTimeExpired?: (stationId: string) => void;
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
  isStarting?: boolean;
  onStart: () => void;
  onClose: () => void;
};

export type WelcomePreviewOverlayProps = {
  visible: boolean;
  introText?: string;
  onClose: () => void;
};

