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
  | "open-quiz"
  | "reviewed-answer"
  | "true-false"
  | "fill-blank";
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

export type StationTypeOption = { value: StationType; label: string };
export type StationTypeGroup = { label: string; options: StationTypeOption[] };

// The grouped list is the source of truth for the type pickers; the flat
// stationTypeOptions below is derived from it, so a type can never end up in one
// and not the other. Order inside a group is deliberate (most reached-for
// first), not alphabetical.
//
// The first three groups split by what kind of challenge it is, the last two by
// how the task gets settled — which is the distinction that actually matters
// when you are picking one.
export const stationTypeGroups: StationTypeGroup[] = [
  {
    label: "Pytania i wiedza",
    options: [
      { value: "quiz", label: "Quiz" },
      { value: "audio-quiz", label: "Quiz audio" },
      { value: "open-quiz", label: "Pytanie otwarte" },
      { value: "fill-blank", label: "Uzupełnij lukę" },
      { value: "true-false", label: "Prawda czy fałsz" },
    ],
  },
  {
    label: "Łamigłówki słowne",
    options: [
      { value: "wordle", label: "Wordle" },
      { value: "hangman", label: "Wisielec" },
      { value: "anagram", label: "Anagram" },
      { value: "caesar-cipher", label: "Szyfr Cezara" },
      { value: "rebus", label: "Rebus" },
      { value: "boggle", label: "Boggle" },
    ],
  },
  {
    label: "Łamigłówki logiczne",
    options: [
      { value: "mastermind", label: "Mastermind" },
      { value: "memory", label: "Memory" },
      { value: "simon", label: "Simon mówi" },
      { value: "mini-sudoku", label: "Mini Sudoku" },
      { value: "matching", label: "Dopasowywanie" },
      { value: "strong-password", label: "Mocne hasło" },
    ],
  },
  {
    label: "Zadania terenowe",
    options: [
      { value: "time", label: "Na czas" },
      { value: "points", label: "Na punkty" },
      { value: "qr-hunt", label: "Skanowanie kodów QR" },
    ],
  },
  {
    label: "Ocena Mistrza Gry",
    options: [
      { value: "photo-task", label: "Zadanie fotograficzne" },
      { value: "reviewed-answer", label: "Odpowiedź opisowa" },
    ],
  },
];

export const stationTypeOptions: StationTypeOption[] = stationTypeGroups.flatMap(
  (group) => group.options,
);

// One line per type, written for the admin filling the form — not for the team.
// The player-facing copy lives in resolveDefaultStationDescription and is
// phrased as an instruction ("Twoim zadaniem jest..."), which reads wrong under
// a picker.
export const stationTypeHints: Record<StationType, string> = {
  quiz: "Pytanie i cztery odpowiedzi — drużyna wybiera jedną, poprawność sprawdza serwer.",
  "audio-quiz": "Jak quiz, ale z nagraniem do odsłuchania przed odpowiedzią.",
  "open-quiz": "Drużyna wpisuje odpowiedź z klawiatury. Uznajesz warianty zapisu, wielkość liter i polskie znaki nie mają znaczenia.",
  "fill-blank": "Zdanie z luką (___) do uzupełnienia jednym słowem. Sprawdzane tak samo jak pytanie otwarte.",
  "true-false": "Cztery zdania do oznaczenia prawda/fałsz. Liczy się komplet — jedna pomyłka przekreśla zadanie.",
  wordle: "Odgadywanie hasła literami, z podpowiedziami po każdej próbie.",
  hangman: "Zgadywanie hasła literami z ograniczoną liczbą pomyłek.",
  anagram: "Przestawianie liter tak, by ułożyć ukryte hasło.",
  "caesar-cipher": "Odszyfrowanie tekstu przesuniętego o zadaną liczbę liter.",
  rebus: "Hasło ukryte w obrazku — drużyna wpisuje rozwiązanie.",
  boggle: "Układanie hasła z sąsiadujących pól planszy 3x3.",
  mastermind: "Odgadywanie ukrytego kodu symboli na podstawie podpowiedzi po każdej próbie.",
  memory: "Odkrywanie par ikon w ograniczonej liczbie pomyłek.",
  simon: "Powtórzenie rosnącej sekwencji dźwięków i świateł.",
  "mini-sudoku": "Uzupełnienie planszy sudoku. Układ generuje się po stronie aplikacji.",
  matching: "Łączenie w pary elementów z lewej i prawej strony.",
  "strong-password": "Ułożenie hasła spełniającego zestaw reguł bezpieczeństwa.",
  time: "Zadanie wykonywane poza tabletem. Po jego zaliczeniu podajesz drużynie kod ukończenia.",
  points: "Jak „na czas”, ale punktowane za wynik, a nie za samo ukończenie.",
  "qr-hunt": "Drużyna szuka i skanuje rozłożone w terenie kody QR.",
  "photo-task": "Drużyna wysyła zdjęcie, a Ty zaliczasz je lub odrzucasz w panelu bieżącej realizacji.",
  "reviewed-answer": "Drużyna wpisuje odpowiedź własnymi słowami, a Ty decydujesz w panelu bieżącej realizacji. Tylko talia Ryzykantów.",
};

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

// Types that never go into a Ryzykanci deck. The whole game runs at tables in a
// single conference room: a card is drawn, solved against a countdown and handed
// back within a minute or two. That rules out the long-sitting puzzles (a whole
// sudoku grid, a full mastermind ladder, a boggle sweep) and the slow, quiet
// ones (memory's flip cycle, simon's audio sequence) — and qr-hunt, which sends
// a team walking between stickers spread around a venue nobody leaves here (it
// also has no working wiring on the Ryzykanci screen). Rebus and strong-password
// are out by the client's call, not by a technical limit.
export const RISK_EXCLUDED_STATION_TYPES: StationType[] = [
  "mini-sudoku",
  "mastermind",
  "boggle",
  "memory",
  "simon",
  "qr-hunt",
  "rebus",
  "strong-password",
];

export function isStationTypeAllowedInRiskDeck(type: StationType) {
  return !RISK_EXCLUDED_STATION_TYPES.includes(type);
}

// Keeps a picker's groups in step with whatever that picker is allowed to show:
// filters the options and then drops any group left with nothing in it, so no
// empty heading is ever rendered.
export function buildStationTypeGroups(
  isAllowed: (type: StationType) => boolean,
): StationTypeGroup[] {
  return stationTypeGroups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => isAllowed(option.value)),
    }))
    .filter((group) => group.options.length > 0);
}

export const riskStationTypeGroups = buildStationTypeGroups(
  isStationTypeAllowedInRiskDeck,
);

// The mirror image of the list above: types a normal (non-Ryzykanci)
// realization can't run. A reviewed-answer card is scored through RiskAttempt,
// which only the deck has — outside it there is nowhere for the Game Master's
// verdict to land, so the card would strand the team on a dead "send" button.
// Labels still resolve from stationTypeOptions everywhere; this only hides the
// type in the pickers.
export const REGULAR_EXCLUDED_STATION_TYPES: StationType[] = ["reviewed-answer"];

export const regularStationTypeGroups = buildStationTypeGroups(
  (type) => !REGULAR_EXCLUDED_STATION_TYPES.includes(type),
);
