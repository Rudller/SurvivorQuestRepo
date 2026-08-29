export type StationType =
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
  | "open-quiz";
export type ChallengeDifficultyMode = "admin" | "player";
export type ChallengeDifficulty = "easy" | "medium" | "hard";
export type StationKind = "template" | "scenario-instance" | "realization-instance";

export type StationQuiz = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  audioUrl?: string;
  acceptedAnswers?: string[];
  // Admin-configured Caesar cipher shift (1-25), caesar-cipher stations only.
  // Left unset, the station falls back to a shift derived deterministically
  // from the station id (see resolveCaesarShift on the mobile side).
  caesarShift?: number;
};

export type StationTranslation = {
  name?: string;
  description?: string;
  quiz?: StationQuiz;
};

export type StationTranslations = Partial<
  Record<"polish" | "english" | "ukrainian" | "russian" | "other", StationTranslation>
>;

export const stationTypeOptions: { value: StationType; label: string }[] = [
  { value: "time", label: "Na czas" },
  { value: "points", label: "Na punkty" },
  { value: "quiz", label: "Quiz" },
  { value: "audio-quiz", label: "Quiz audio" },
  { value: "wordle", label: "Wordle" },
  { value: "hangman", label: "Wisielec" },
  { value: "mastermind", label: "Mastermind" },
  { value: "anagram", label: "Anagram" },
  { value: "caesar-cipher", label: "Szyfr Cezara" },
  { value: "memory", label: "Memory" },
  { value: "simon", label: "Simon mówi" },
  { value: "rebus", label: "Rebus" },
  { value: "boggle", label: "Boggle" },
  { value: "mini-sudoku", label: "Mini Sudoku" },
  { value: "matching", label: "Dopasowywanie" },
  { value: "strong-password", label: "Mocne hasło" },
  { value: "photo-task", label: "Zadanie fotograficzne" },
  { value: "qr-hunt", label: "Skanowanie kodów QR" },
  { value: "open-quiz", label: "Quiz – pytanie otwarte" },
];

export type Station = {
  id: string;
  name: string;
  type: StationType;
  categories: string[];
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  qrEntryCode?: string;
  qrScanCodes: string[];
  quiz?: StationQuiz;
  translations?: StationTranslations;
  challengeDifficultyMode: ChallengeDifficultyMode;
  challengeDifficulty: ChallengeDifficulty;
  completionStopwatchEnabled: boolean;
  allowConcurrentTeams: boolean;
  fastestCompletionBonusPoints: number;
  color: string;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  kind: StationKind;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
};

// Which flavour of the station form to render.
//
// "risk" hides the fields a Ryzykanci station can never use: it is drawn from a
// deck rather than scanned at a location, so its entry QR code and coordinates
// are dead weight in the form. It only HIDES them — stored values stay intact,
// because a template station can also be the source of scenario clones, where
// qrEntryCode is a real physical sticker.
export type StationFormVariant = "regular" | "risk";
