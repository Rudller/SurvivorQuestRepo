import type { ClipboardEvent } from "react";
import type { ChallengeDifficulty, ChallengeDifficultyMode, StationQuiz, StationTranslations, StationType } from "./types/station";
import { stationTypeOptions } from "./types/station";

export type ImageInputMode = "upload" | "paste" | "url";
export type StationSortField = "name" | "type";
export type SortDirection = "asc" | "desc";
export type CompletionCodeGeneratorMode = "digits" | "letters";
export type UploadImageFileFn = (file: File) => Promise<string>;
export const COMPLETION_CODE_REGEX = /^[A-Z0-9-]{3,32}$/;
export const MEMORY_SYSTEM_STATION_PROMPT = "Znajdź wszystkie pary ikon w maksymalnie 6 pomyłkach.";
export const MINI_SUDOKU_SYSTEM_STATION_PROMPT =
  "to jest placeholder, treść tego inputu nie zmieni zadania bo jest generowane po stronie mobilki a musi coś być w tym inpucie w celu walidacji :)";
export const MATCHING_SYSTEM_STATION_PROMPT =
  "Twoim zadaniem jest poprawnie dopasować elementy z lewej i prawej strony zgodnie z poleceniem.";
export const STRONG_PASSWORD_SYSTEM_STATION_PROMPT = "Ułóż mocne hasło spełniające reguły.";

export const STATION_TYPE_DEFAULT_COLOR: Record<StationType, string> = {
  quiz: "#f59e0b",
  "audio-quiz": "#06b6d4",
  time: "#3b82f6",
  points: "#a855f7",
  wordle: "#22c55e",
  hangman: "#f97316",
  mastermind: "#6366f1",
  anagram: "#14b8a6",
  "caesar-cipher": "#0ea5e9",
  memory: "#8b5cf6",
  simon: "#ec4899",
  rebus: "#f59e0b",
  boggle: "#10b981",
  "mini-sudoku": "#ef4444",
  matching: "#22c55e",
  "strong-password": "#f43f5e",
  "photo-task": "#84cc16",
  "qr-hunt": "#0891b2",
  "open-quiz": "#eab308",
  "reviewed-answer": "#d946ef",
  "true-false": "#2dd4bf",
  "fill-blank": "#fb7185",
};

export const challengeDifficultyModeOptions: { value: ChallengeDifficultyMode; label: string }[] = [
  { value: "admin", label: "Admin ustala" },
  { value: "player", label: "Gracz wybiera" },
];
export const challengeDifficultyOptions: { value: ChallengeDifficulty; label: string; description: string }[] = [
  { value: "easy", label: "Łatwy", description: "Prostsza wersja zadania, 50% punktów" },
  { value: "medium", label: "Średni", description: "Standardowa wersja zadania, 100% punktów" },
  { value: "hard", label: "Trudny", description: "Trudniejsza wersja zadania, 150% punktów" },
];
const COMPLETION_CODE_DIGITS_ONLY_REGEX = /^\d{3,32}$/;
const COMPLETION_CODE_LETTERS_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COMPLETION_CODE_DIGITS_ALPHABET = "0123456789";
const SIMON_SEQUENCE_DIGITS_ALPHABET = "123456789";
const SIMON_SEQUENCE_LENGTH = 10;
export const QUIZ_ANSWER_COUNT = 4;
const DEFAULT_STATION_DESCRIPTION = "Opis stanowiska będzie dostępny po rozpoczęciu zadania.";
const WORDLE_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odgadnąć ukryte słowo w maksymalnie 6 próbach. Po każdej próbie otrzymasz podpowiedzi: zielony kolor oznacza poprawną literę na poprawnej pozycji, żółty oznacza poprawną literę na innej pozycji, a szary oznacza brak litery w haśle.";
const HANGMAN_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odgadnąć ukryte hasło, podając litery. Każda błędna litera przybliża do przegranej, a każda poprawna odsłania odpowiednie miejsca w haśle.";
const MASTERMIND_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odgadnąć ukryty kod. Po każdej próbie otrzymasz informację, ile znaków jest poprawnych i na właściwej pozycji oraz ile jest poprawnych, ale na niewłaściwej pozycji.";
const ANAGRAM_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odgadnąć poprawne słowo lub frazę na podstawie przestawionych liter (anagramu). Wpisz właściwą odpowiedź, aby zaliczyć stanowisko.";
const CAESAR_CIPHER_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odszyfrować tekst zakodowany szyfrem Cezara i podać poprawne hasło lub wiadomość.";
const REBUS_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odgadnąć hasło na podstawie rebusu. Przeanalizuj symbole, litery i podpowiedzi, a następnie wpisz poprawne rozwiązanie.";
const BOGGLE_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odnaleźć jedno docelowe słowo na planszy Boggle 3x3. Słowo musi dać się przejść po sąsiadujących polach (również po skosie), bez użycia tego samego pola dwa razy.";
const MEMORY_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odnaleźć i dopasować wszystkie pary kart. Zapamiętuj odkryte symbole i łącz je poprawnie.";
const SIMON_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odtworzyć poprawną sekwencję sygnałów w odpowiedniej kolejności.";
const MINI_SUDOKU_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest uzupełnić mini Sudoku tak, aby liczby nie powtarzały się w wierszach i kolumnach.";
const MATCHING_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest poprawnie dopasować elementy z lewej i prawej strony zgodnie z poleceniem.";
const PHOTO_TASK_DEFAULT_STATION_DESCRIPTION =
  "Np. „Znajdź młotek i zrób jego zdjęcie”. To pole jest jedyną instrukcją, którą zobaczy gracz.";
const QR_HUNT_DEFAULT_STATION_DESCRIPTION =
  "Np. „Kody znajdziesz przy wejściach do budynków na trasie”. To pole jest wskazówką, gdzie szukać kodów QR.";
const OPEN_QUIZ_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odpowiedzieć na pytanie, wpisując odpowiedź samodzielnie (bez podpowiedzi w postaci gotowych opcji).";
export const TRUE_FALSE_SYSTEM_STATION_PROMPT =
  "Oznaczcie każde zdanie jako prawdziwe lub fałszywe.";
const TRUE_FALSE_DEFAULT_STATION_DESCRIPTION =
  "Przy każdym zdaniu zdecydujcie, czy jest prawdziwe, czy fałszywe. Liczy się komplet — jedna pomyłka przekreśla całe zadanie.";
const FILL_BLANK_DEFAULT_STATION_DESCRIPTION =
  "Uzupełnijcie brakujące słowo w zdaniu. Wielkość liter i polskie znaki diakrytyczne nie mają znaczenia.";
const REVIEWED_ANSWER_DEFAULT_STATION_DESCRIPTION =
  "Odpowiedzcie na pytanie własnymi słowami. Odpowiedź trafi do Mistrza Gry, który zdecyduje, czy ją zaliczyć.";
const QUIZ_SECRET_FALLBACK_ANSWERS = ["A", "B", "C"] as const;
const MATCHING_PAIR_DELIMITER = "->";
const MATCHING_PAIR_SEPARATOR = ` ${MATCHING_PAIR_DELIMITER} `;

export const imageModeOptions: { value: ImageInputMode; label: string }[] = [
  { value: "upload", label: "Upload" },
  { value: "paste", label: "Wklej" },
  { value: "url", label: "URL" },
];
export const completionCodeModeOptions: { value: CompletionCodeGeneratorMode; label: string }[] = [
  { value: "digits", label: "Cyfry" },
  { value: "letters", label: "Litery" },
];

export function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || value.trim().startsWith("data:image/");
}

export function resolveDefaultStationDescription(stationType: StationType) {
  if (stationType === "wordle") {
    return WORDLE_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "hangman") {
    return HANGMAN_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "mastermind") {
    return MASTERMIND_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "anagram") {
    return ANAGRAM_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "caesar-cipher") {
    return CAESAR_CIPHER_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "rebus") {
    return REBUS_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "boggle") {
    return BOGGLE_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "memory") {
    return MEMORY_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "simon") {
    return SIMON_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "mini-sudoku") {
    return MINI_SUDOKU_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "matching") {
    return MATCHING_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "photo-task") {
    return PHOTO_TASK_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "qr-hunt") {
    return QR_HUNT_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "open-quiz") {
    return OPEN_QUIZ_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "reviewed-answer") {
    return REVIEWED_ANSWER_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "true-false") {
    return TRUE_FALSE_DEFAULT_STATION_DESCRIPTION;
  }
  if (stationType === "fill-blank") {
    return FILL_BLANK_DEFAULT_STATION_DESCRIPTION;
  }

  return DEFAULT_STATION_DESCRIPTION;
}

export function isKnownDefaultStationDescription(value: string) {
  const normalized = value.trim();
  return (
    normalized === DEFAULT_STATION_DESCRIPTION ||
    normalized === WORDLE_DEFAULT_STATION_DESCRIPTION ||
    normalized === HANGMAN_DEFAULT_STATION_DESCRIPTION ||
    normalized === MASTERMIND_DEFAULT_STATION_DESCRIPTION ||
    normalized === ANAGRAM_DEFAULT_STATION_DESCRIPTION ||
    normalized === CAESAR_CIPHER_DEFAULT_STATION_DESCRIPTION ||
    normalized === REBUS_DEFAULT_STATION_DESCRIPTION ||
    normalized === BOGGLE_DEFAULT_STATION_DESCRIPTION ||
    normalized === MEMORY_DEFAULT_STATION_DESCRIPTION ||
    normalized === SIMON_DEFAULT_STATION_DESCRIPTION ||
    normalized === MINI_SUDOKU_DEFAULT_STATION_DESCRIPTION ||
    normalized === MATCHING_DEFAULT_STATION_DESCRIPTION ||
    normalized === PHOTO_TASK_DEFAULT_STATION_DESCRIPTION ||
    normalized === QR_HUNT_DEFAULT_STATION_DESCRIPTION ||
    normalized === OPEN_QUIZ_DEFAULT_STATION_DESCRIPTION ||
    normalized === REVIEWED_ANSWER_DEFAULT_STATION_DESCRIPTION ||
    normalized === TRUE_FALSE_DEFAULT_STATION_DESCRIPTION ||
    normalized === FILL_BLANK_DEFAULT_STATION_DESCRIPTION
  );
}

export function isSvgImageUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("data:image/svg+xml")) return true;
  return normalized.includes("/svg?") || normalized.includes(".svg");
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
    reader.readAsDataURL(file);
  });
}

export function getStationTypeLabel(type: StationType) {
  return stationTypeOptions.find((option) => option.value === type)?.label ?? "Quiz";
}

export function clampTimeLimitSeconds(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(600, Math.round(value));
}

export function formatTimeLimit(seconds: number) {
  if (seconds === 0) return "Brak limitu czasu";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const paddedSeconds = String(remainingSeconds).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}

export function parseQrScanCodesInput(value: string): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const line of value.split("\n")) {
    const normalized = line.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    codes.push(normalized);
  }

  return codes;
}

export function parseAcceptedAnswersInput(value: string): string[] {
  const seen = new Set<string>();
  const answers: string[] = [];

  for (const line of value.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    answers.push(trimmed);
  }

  return answers;
}

export function isCompletionCodeRequired(stationType: StationType) {
  return stationType === "time" || stationType === "points";
}

export function isQuizStationType(stationType: StationType) {
  return (
    stationType === "quiz" ||
    stationType === "audio-quiz" ||
    stationType === "wordle" ||
    stationType === "hangman" ||
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching" ||
    stationType === "strong-password" ||
    stationType === "open-quiz" ||
    stationType === "reviewed-answer" ||
    stationType === "true-false" ||
    stationType === "fill-blank"
  );
}

// fill-blank shares open-quiz's storage and its single typed-answer form: one
// correct word plus optional accepted variants. Only the card differs.
export function isOpenQuizStationType(stationType: StationType) {
  return stationType === "open-quiz" || stationType === "fill-blank";
}

export function isFillBlankStationType(stationType: StationType) {
  return stationType === "fill-blank";
}

export function isTrueFalseStationType(stationType: StationType) {
  return stationType === "true-false";
}

// An open question judged by the Game Master rather than by string comparison.
// The quiz row keeps the question plus an optional list of key points the
// reviewer ticks off; nothing is ever matched against the team's text.
export function isReviewedAnswerStationType(stationType: StationType) {
  return stationType === "reviewed-answer";
}

export function isWordPuzzleStationType(stationType: StationType) {
  return (
    stationType === "wordle" ||
    stationType === "hangman" ||
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "mini-sudoku" ||
    stationType === "strong-password"
  );
}

export function supportsChallengeDifficulty(stationType: StationType) {
  return stationType === "strong-password" || stationType === "mastermind" || stationType === "mini-sudoku";
}

export function isMatchingStationType(stationType: StationType) {
  return stationType === "matching";
}

export function isImageSupportedStationType(stationType: StationType) {
  return (
    stationType !== "wordle" &&
    stationType !== "hangman" &&
    stationType !== "anagram" &&
    stationType !== "caesar-cipher" &&
    stationType !== "boggle" &&
    stationType !== "memory" &&
    stationType !== "simon" &&
    stationType !== "mini-sudoku" &&
    stationType !== "matching" &&
    stationType !== "strong-password" &&
    stationType !== "qr-hunt"
  );
}

export function hasVisibleQuizQuestionField(stationType: StationType) {
  // true-false carries a fixed instruction rather than an authored question —
  // the admin only writes the statements, so showing an editable question box
  // would just invite a second, contradictory prompt.
  return stationType !== "mini-sudoku" && stationType !== "true-false";
}

export function getQuizLikeStationCopy(stationType: StationType) {
  switch (stationType) {
    case "wordle":
      return {
        sectionTitle: "Hasło Wordle",
        questionLabel: "Hasło (Wordle)",
        questionPlaceholder: "Wpisz hasło dla stacji Wordle",
        answersHint: "Wordle używa wyłącznie hasła jako rozwiązania.",
        validationMessage: "Wordle wymaga hasła.",
      };
    case "hangman":
      return {
        sectionTitle: "Hasło Wisielca",
        questionLabel: "Hasło (Wisielec)",
        questionPlaceholder: "Wpisz hasło dla stacji Wisielec",
        answersHint: "Wisielec używa wyłącznie hasła jako rozwiązania.",
        validationMessage: "Wisielec wymaga hasła.",
      };
    case "strong-password":
      return {
        sectionTitle: "Konfiguracja Mocnego hasła",
        questionLabel: "Opis / seed gry",
        questionPlaceholder: STRONG_PASSWORD_SYSTEM_STATION_PROMPT,
        answersHint: "Reguły hasła są generowane automatycznie na dany dzień i poziom trudności.",
        validationMessage: "Mocne hasło wymaga krótkiego opisu lub nazwy wyzwania.",
      };
    case "audio-quiz":
      return {
        sectionTitle: "Pytanie audio i odpowiedzi",
        questionLabel: "Pytanie",
        questionPlaceholder: "Wpisz pytanie quizowe",
        answersHint: `Uzupełnij ${QUIZ_ANSWER_COUNT} odpowiedzi i zaznacz jedną prawidłową.`,
        validationMessage: "Quiz audio wymaga pytania, 4 odpowiedzi i jednej poprawnej.",
      };
    case "mastermind":
      return {
        sectionTitle: "Kod Mastermind",
        questionLabel: "Kod / zadanie (Mastermind)",
        questionPlaceholder: "Wpisz kod lub opis zadania dla stacji Mastermind",
        answersHint: "Mastermind używa wyłącznie kodu jako rozwiązania.",
        validationMessage: "Mastermind wymaga kodu/zadania.",
      };
    case "anagram":
      return {
        sectionTitle: "Hasło Anagramu",
        questionLabel: "Anagram",
        questionPlaceholder: "Wpisz słowo lub frazę do ułożenia z anagramu",
        answersHint: "Anagram używa wyłącznie hasła jako rozwiązania.",
        validationMessage: "Anagram wymaga hasła/zadania.",
      };
    case "caesar-cipher":
      return {
        sectionTitle: "Hasło Szyfru Cezara",
        questionLabel: "Hasło / tekst (Szyfr Cezara)",
        questionPlaceholder: "Wpisz zaszyfrowany tekst lub hasło do odszyfrowania",
        answersHint: "Szyfr Cezara używa wyłącznie hasła jako rozwiązania.",
        validationMessage: "Szyfr Cezara wymaga hasła/zadania.",
      };
    case "memory":
      return {
        sectionTitle: "Zadanie Memory",
        questionLabel: "Polecenie (Memory)",
        questionPlaceholder: "Wpisz polecenie lub hasło do gry Memory",
        answersHint: "Memory używa wyłącznie polecenia jako treści zadania.",
        validationMessage: "Memory wymaga polecenia.",
      };
    case "simon":
      return {
        sectionTitle: "Sekwencja Simon",
        questionLabel: "Sekwencja (Simon)",
        questionPlaceholder: "Wpisz sekwencję cyfr 1-9, np. 1-5-9-3",
        answersHint:
          "Wprowadź dokładnie 10 cyfr z zakresu 1-9 (np. 1-5-9-3-2-8-4-7-6-1) lub użyj przycisku generowania.",
        validationMessage: "Simon wymaga sekwencji 10 cyfr (1-9).",
      };
    case "rebus":
      return {
        sectionTitle: "Hasło Rebusu",
        questionLabel: "Hasło / zadanie (Rebus)",
        questionPlaceholder: "Wpisz rebus lub hasło do odgadnięcia",
        answersHint: "Rebus używa wyłącznie hasła jako rozwiązania.",
        validationMessage: "Rebus wymaga hasła/zadania.",
      };
    case "boggle":
      return {
        sectionTitle: "Hasło Boggle",
        questionLabel: "Hasło / zadanie (Boggle)",
        questionPlaceholder: "Wpisz docelowe słowo Boggle (3-8 znaków)",
        answersHint:
          "Boggle używa jednego hasła (3-8 znaków). W mobilce gracz układa je na planszy 3x3 po sąsiadujących polach (także po skosie), bez powtórnego użycia pola.",
        validationMessage: "Boggle wymaga hasła/zadania.",
      };
    case "mini-sudoku":
      return {
        sectionTitle: "Mini Sudoku",
        questionLabel: "Treść techniczna (Mini Sudoku)",
        questionPlaceholder: MINI_SUDOKU_SYSTEM_STATION_PROMPT,
        answersHint: "Mini Sudoku ma stały układ generowany po stronie mobilki. To pole jest technicznym placeholderem.",
        validationMessage: "Mini Sudoku wymaga placeholdera technicznego.",
      };
    case "matching":
      return {
        sectionTitle: "Dopasowywanie par",
        questionLabel: "Treść techniczna (Dopasowywanie)",
        questionPlaceholder: MATCHING_SYSTEM_STATION_PROMPT,
        answersHint: "Uzupełnij 4 pary w formacie lewa -> prawa.",
        validationMessage: "Dopasowywanie wymaga placeholdera technicznego i 4 pełnych par.",
      };
    case "true-false":
      return {
        sectionTitle: "Prawda czy fałsz",
        questionLabel: "Treść techniczna (Prawda/Fałsz)",
        questionPlaceholder: TRUE_FALSE_SYSTEM_STATION_PROMPT,
        answersHint:
          "Wpiszcie 4 zdania i przy każdym zaznaczcie, czy jest prawdziwe. Drużyna musi trafić wszystkie cztery — jedna pomyłka przekreśla zadanie.",
        validationMessage: "Prawda/Fałsz wymaga 4 pełnych zdań.",
      };
    case "fill-blank":
      return {
        sectionTitle: "Uzupełnij lukę",
        questionLabel: "Zdanie z luką",
        questionPlaceholder: "Np. Chrzest Polski miał miejsce w roku ___.",
        answersHint:
          "Zaznaczcie lukę trzema podkreślnikami (___) w treści zdania. Podajcie brakujące słowo — wielkość liter i polskie znaki nie mają znaczenia — a niżej ewentualne dodatkowe warianty.",
        validationMessage: "Uzupełnij lukę wymaga zdania i brakującego słowa.",
      };
    case "reviewed-answer":
      return {
        sectionTitle: "Pytanie do oceny Mistrza Gry",
        questionLabel: "Pytanie",
        questionPlaceholder: "Wpisz pytanie otwarte, np. „Wymieńcie trzy przyczyny…”",
        answersHint:
          "Odpowiedzi nikt nie sprawdza automatycznie — drużyna wpisuje ją na tablecie, a Ty decydujesz w panelu bieżącej realizacji. Klucz odpowiedzi jest opcjonalny i widzi go wyłącznie Mistrz Gry.",
        validationMessage: "Pytanie do oceny Mistrza Gry wymaga treści pytania.",
      };
    case "open-quiz":
      return {
        sectionTitle: "Pytanie otwarte",
        questionLabel: "Pytanie",
        questionPlaceholder: "Wpisz pytanie otwarte",
        answersHint:
          "Podaj poprawną odpowiedź. Wielkość liter i polskie znaki diakrytyczne nie mają znaczenia. Możesz dodać dodatkowe akceptowane warianty odpowiedzi.",
        validationMessage: "Pytanie otwarte wymaga treści pytania i poprawnej odpowiedzi.",
      };
    case "quiz":
    default:
      return {
        sectionTitle: "Pytanie i odpowiedzi",
        questionLabel: "Pytanie",
        questionPlaceholder: "Wpisz pytanie quizowe",
        answersHint: `Uzupełnij ${QUIZ_ANSWER_COUNT} odpowiedzi i zaznacz jedną prawidłową.`,
        validationMessage: "Quiz wymaga pytania, 4 odpowiedzi i jednej poprawnej.",
      };
  }
}

export function createEmptyQuizAnswers() {
  return Array.from({ length: QUIZ_ANSWER_COUNT }, () => "");
}

// Blank/invalid input leaves the shift unset, so the station falls back to
// its deterministic per-station default on mobile (see resolveCaesarShift).
export function parseCaesarShiftInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 25 ? parsed : undefined;
}

export type StationQuizInput = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  audioUrl?: string;
  acceptedAnswers?: string[];
  caesarShift?: number;
};

export type MatchingPairInput = {
  left: string;
  right: string;
};

// The pair editors round-trip through split/join on every keystroke, so both
// helpers must be lossless while editing — trimming here would eat a space the
// moment it is typed at the end of a side. Trimming happens once, on save, in
// normalizeMatchingPairAnswers/normalizeStationQuiz.
export function splitMatchingPairAnswer(value: string): MatchingPairInput {
  const separatorIndex = value.indexOf(MATCHING_PAIR_SEPARATOR);
  if (separatorIndex >= 0) {
    return {
      left: value.slice(0, separatorIndex),
      right: value.slice(separatorIndex + MATCHING_PAIR_SEPARATOR.length),
    };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { left: value, right: "" };
  }

  // Legacy/imported shapes: "a->b", "a = b", "a: b".
  const match = normalized.match(/^(.+?)\s*(?:->|=|:)\s*(.+)$/);
  if (!match) {
    return { left: value, right: "" };
  }

  return {
    left: match[1].trim(),
    right: match[2].trim(),
  };
}

export function joinMatchingPairAnswer(left: string, right: string) {
  if (!right) {
    return left;
  }
  return `${left}${MATCHING_PAIR_SEPARATOR}${right}`;
}

// Mirrors TRUE_FALSE_DELIMITER in the backend's station.rules.ts: the verdict
// travels beside the statement inside one answer slot, so the auto-translator
// can rewrite the statement without ever touching the flag.
const TRUE_FALSE_DELIMITER = "::";
const TRUE_FALSE_SEPARATOR = ` ${TRUE_FALSE_DELIMITER} `;

// Shared by the create form and the edit modal so the toggle looks the same in
// both. Written out as whole class strings rather than composed at runtime —
// Tailwind scans source text and never sees a value a template literal builds.
export const TRUE_FALSE_TOGGLE_IDLE_CLASS =
  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-900";
export const TRUE_FALSE_TOGGLE_ACTIVE_TRUE_CLASS =
  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition border-emerald-400/50 bg-emerald-500/15 text-emerald-200";
export const TRUE_FALSE_TOGGLE_ACTIVE_FALSE_CLASS =
  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition border-rose-400/50 bg-rose-500/15 text-rose-200";

export function splitTrueFalseAnswer(value: string) {
  const trimmed = value.trim();
  // Last occurrence, so a statement containing the delimiter still parses —
  // only the trailing flag is structural.
  const markerIndex = trimmed.lastIndexOf(TRUE_FALSE_DELIMITER);
  if (markerIndex < 0) {
    return { statement: trimmed, isTrue: false };
  }

  const flag = trimmed.slice(markerIndex + TRUE_FALSE_DELIMITER.length).trim();
  if (flag !== "T" && flag !== "F") {
    return { statement: trimmed, isTrue: false };
  }

  return { statement: trimmed.slice(0, markerIndex).trim(), isTrue: flag === "T" };
}

export function joinTrueFalseAnswer(statement: string, isTrue: boolean) {
  return `${statement.trim()}${TRUE_FALSE_SEPARATOR}${isTrue ? "T" : "F"}`;
}

function normalizeTrueFalseAnswers(answers: string[]) {
  return answers.map((answer) => {
    const { statement, isTrue } = splitTrueFalseAnswer(answer);
    if (!statement) {
      return "";
    }
    return joinTrueFalseAnswer(statement, isTrue);
  });
}

function normalizeMatchingPairAnswers(answers: string[]) {
  return answers.map((answer) => {
    const pair = splitMatchingPairAnswer(answer);
    const left = pair.left.trim();
    const right = pair.right.trim();
    if (!left || !right) {
      return "";
    }
    return joinMatchingPairAnswer(left, right);
  });
}

function normalizeAcceptedAnswers(acceptedAnswers: string[] | undefined, correctAnswer: string) {
  const seen = new Set<string>([correctAnswer.toLowerCase()]);
  const normalized: string[] = [];

  for (const answer of acceptedAnswers ?? []) {
    const trimmed = answer.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

export function normalizeStationQuiz(input: StationQuizInput): StationQuiz | null {
  const question = input.question.trim();
  const answers = input.answers.map((answer) => answer.trim());
  const correctAnswerIndex = Math.round(input.correctAnswerIndex);
  const audioUrl = input.audioUrl?.trim();

  if (!question) {
    return null;
  }

  if (answers.length !== QUIZ_ANSWER_COUNT || answers.some((answer) => !answer)) {
    return null;
  }

  if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= QUIZ_ANSWER_COUNT) {
    return null;
  }

  const acceptedAnswers = normalizeAcceptedAnswers(input.acceptedAnswers, answers[correctAnswerIndex]);
  const caesarShift =
    Number.isInteger(input.caesarShift) && input.caesarShift! >= 1 && input.caesarShift! <= 25
      ? input.caesarShift
      : undefined;

  return {
    question,
    answers,
    correctAnswerIndex,
    audioUrl: audioUrl || undefined,
    ...(acceptedAnswers.length > 0 ? { acceptedAnswers } : {}),
    ...(caesarShift !== undefined ? { caesarShift } : {}),
  };
}

export function normalizeStationQuizForType(stationType: StationType, input: StationQuizInput): StationQuiz | null {
  if (stationType === "memory") {
    const nextQuestion = input.question.trim() || MEMORY_SYSTEM_STATION_PROMPT;
    return normalizeStationQuiz({
      ...input,
      question: nextQuestion,
      answers: [nextQuestion, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  if (stationType === "mini-sudoku") {
    const nextQuestion = input.question.trim() || MINI_SUDOKU_SYSTEM_STATION_PROMPT;
    return normalizeStationQuiz({
      ...input,
      question: nextQuestion,
      answers: [nextQuestion, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  if (stationType === "simon") {
    const simonDigits = extractSimonSequenceDigits(input.question);
    if (simonDigits.length !== SIMON_SEQUENCE_LENGTH) {
      return null;
    }

    const normalizedSequence = simonDigits.join("-");
    return normalizeStationQuiz({
      ...input,
      question: normalizedSequence,
      answers: [normalizedSequence, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  if (isWordPuzzleStationType(stationType)) {
    const nextQuestion = stationType === "strong-password" ? input.question.trim() || STRONG_PASSWORD_SYSTEM_STATION_PROMPT : input.question;
    return normalizeStationQuiz({
      ...input,
      question: nextQuestion,
      answers: [nextQuestion, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  // The question doubles as the technical secret, exactly like a word puzzle:
  // normalizeStationQuiz rejects empty answers, and this type genuinely has no
  // answer to put there. The reviewer's key points ride along in
  // acceptedAnswers, which normalizeStationQuiz passes through untouched.
  if (isReviewedAnswerStationType(stationType)) {
    const nextQuestion = input.question.trim();
    return normalizeStationQuiz({
      ...input,
      question: nextQuestion,
      answers: [nextQuestion, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  if (isOpenQuizStationType(stationType)) {
    const correctAnswer = (input.answers[0] ?? "").trim();
    return normalizeStationQuiz({
      ...input,
      answers: [correctAnswer, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  if (isTrueFalseStationType(stationType)) {
    const nextQuestion = input.question.trim() || TRUE_FALSE_SYSTEM_STATION_PROMPT;
    return normalizeStationQuiz({
      ...input,
      question: nextQuestion,
      answers: normalizeTrueFalseAnswers(input.answers),
      correctAnswerIndex: 0,
    });
  }

  if (isMatchingStationType(stationType)) {
    const nextQuestion = input.question.trim() || MATCHING_SYSTEM_STATION_PROMPT;
    return normalizeStationQuiz({
      ...input,
      question: nextQuestion,
      answers: normalizeMatchingPairAnswers(input.answers),
      correctAnswerIndex: 0,
    });
  }

  return normalizeStationQuiz(input);
}

export function normalizeStationTranslations(
  translations: StationTranslations | undefined,
  stationType: StationType,
): StationTranslations | undefined {
  if (!translations) {
    return undefined;
  }

  const normalized = Object.entries(translations).reduce<StationTranslations>((acc, [language, value]) => {
    if (!value || typeof value !== "object") {
      return acc;
    }

    const name = typeof value.name === "string" ? value.name.trim() : "";
    const description = typeof value.description === "string" ? value.description.trim() : "";
    const normalizedQuiz = value.quiz ? normalizeStationQuizForType(stationType, value.quiz) ?? undefined : undefined;

    if (!name && !description && !normalizedQuiz) {
      return acc;
    }

    if (
      language === "polish" ||
      language === "english" ||
      language === "ukrainian" ||
      language === "russian" ||
      language === "other"
    ) {
      acc[language] = {
        name: name || undefined,
        description: description || undefined,
        quiz: normalizedQuiz
          ? {
              question: normalizedQuiz.question,
              answers: normalizedQuiz.answers,
              correctAnswerIndex: normalizedQuiz.correctAnswerIndex,
              audioUrl: normalizedQuiz.audioUrl,
              acceptedAnswers: normalizedQuiz.acceptedAnswers,
            }
          : undefined,
      };
    }

    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeCompletionCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidCompletionCode(value: string) {
  return COMPLETION_CODE_REGEX.test(normalizeCompletionCode(value));
}

export function isValidCompletionCodeForMode(value: string, mode: CompletionCodeGeneratorMode) {
  if (mode === "digits") {
    return isDigitsOnlyCompletionCode(value);
  }

  return isValidCompletionCode(value);
}

export function isDigitsOnlyCompletionCode(value: string) {
  return COMPLETION_CODE_DIGITS_ONLY_REGEX.test(normalizeCompletionCode(value));
}

export function resolveCompletionCodeGeneratorMode(value: string): CompletionCodeGeneratorMode {
  return isDigitsOnlyCompletionCode(value) ? "digits" : "letters";
}

function getRandomCompletionCodeChar(mode: CompletionCodeGeneratorMode) {
  const alphabet = mode === "digits" ? COMPLETION_CODE_DIGITS_ALPHABET : COMPLETION_CODE_LETTERS_ALPHABET;
  return getRandomCharFromAlphabet(alphabet);
}

function getRandomCharFromAlphabet(alphabet: string) {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return alphabet[random[0] % alphabet.length];
  }
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function generateCompletionCodeSuffix(length: number, mode: CompletionCodeGeneratorMode) {
  return Array.from({ length }, () => getRandomCompletionCodeChar(mode)).join("");
}

export function extractSimonSequenceDigits(value: string) {
  return value.match(/[1-9]/g) ?? [];
}

export function normalizeSimonSequenceInput(value: string, maxLength = SIMON_SEQUENCE_LENGTH) {
  return extractSimonSequenceDigits(value)
    .slice(0, Math.max(1, Math.round(maxLength)))
    .join("-");
}

export function generateSimonSequence(length = SIMON_SEQUENCE_LENGTH) {
  const normalizedLength = Math.max(1, Math.round(length));
  return Array.from({ length: normalizedLength }, () => getRandomCharFromAlphabet(SIMON_SEQUENCE_DIGITS_ALPHABET)).join(
    "-",
  );
}

export function generateSampleCompletionCode(length = 4, mode: CompletionCodeGeneratorMode = "letters") {
  const normalizedLength = Math.min(32, Math.max(3, Math.round(length)));
  return generateCompletionCodeSuffix(normalizedLength, mode);
}

export async function handleImageFile(
  file: File | null,
  onSuccess: (dataUrl: string) => void,
  onError: (msg: string) => void,
  uploadFile?: UploadImageFileFn,
) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    onError("Wybierz plik obrazu.");
    return;
  }
  if (file.type === "image/svg+xml") {
    onError("Format SVG nie jest obsługiwany. Użyj PNG, JPG lub WEBP.");
    return;
  }
  try {
    if (uploadFile) {
      const uploadedUrl = await uploadFile(file);
      onSuccess(uploadedUrl);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    onSuccess(dataUrl);
  } catch {
    onError(uploadFile ? "Nie udało się przesłać pliku obrazu." : "Nie udało się odczytać pliku obrazu.");
  }
}

export async function handleImagePaste(
  event: ClipboardEvent<HTMLDivElement>,
  onSuccess: (value: string) => void,
  onError: (msg: string) => void,
  uploadFile?: UploadImageFileFn,
) {
  const fileItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
  if (fileItem) {
    event.preventDefault();
    await handleImageFile(fileItem.getAsFile(), onSuccess, onError, uploadFile);
    return;
  }
  const text = event.clipboardData.getData("text");
  if (text && looksLikeUrl(text)) {
    event.preventDefault();
    onSuccess(text.trim());
    return;
  }
  onError("Wklej obraz lub poprawny URL.");
}
