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
  | "matching";
export type StationKind = "template" | "scenario-instance" | "realization-instance";

export type StationQuiz = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  audioUrl?: string;
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
];

export type Station = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  quiz?: StationQuiz;
  translations?: StationTranslations;
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
