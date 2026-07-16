export type StationType =
  | 'quiz'
  | 'audio-quiz'
  | 'time'
  | 'points'
  | 'wordle'
  | 'hangman'
  | 'mastermind'
  | 'anagram'
  | 'caesar-cipher'
  | 'memory'
  | 'simon'
  | 'rebus'
  | 'boggle'
  | 'mini-sudoku'
  | 'matching'
  | 'strong-password'
  | 'photo-task';

export type ChallengeDifficultyMode = 'admin' | 'player';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type StationQuiz = {
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: number;
  audioUrl?: string;
};

export type StationTranslation = {
  name?: string;
  description?: string;
  quiz?: StationQuiz;
};

export type StationTranslations = Partial<
  Record<
    'polish' | 'english' | 'ukrainian' | 'russian' | 'other',
    StationTranslation
  >
>;

export type StationKind =
  | 'template'
  | 'scenario-instance'
  | 'realization-instance';

export type StationEntity = {
  id: string;
  name: string;
  type: StationType;
  categories: string[];
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  quiz?: StationQuiz;
  translations?: StationTranslations;
  challengeDifficultyMode: ChallengeDifficultyMode;
  challengeDifficulty: ChallengeDifficulty;
  completionStopwatchEnabled: boolean;
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

export type StationDraftInput = {
  name: string;
  type: StationType;
  categories?: string[];
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  quiz?: StationQuiz;
  translations?: StationTranslations;
  challengeDifficultyMode?: ChallengeDifficultyMode;
  challengeDifficulty?: ChallengeDifficulty;
  completionStopwatchEnabled?: boolean;
  color?: string;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
};

export type ParseTimeLimitResult =
  | { ok: true; value: number }
  | { ok: false; value: null };
