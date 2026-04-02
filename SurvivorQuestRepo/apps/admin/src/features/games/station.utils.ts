import type { ClipboardEvent } from "react";
import type { StationQuiz, StationType } from "./types/station";
import { stationTypeOptions } from "./types/station";

export type ImageInputMode = "upload" | "paste" | "url";
export type StationSortField = "name" | "type";
export type SortDirection = "asc" | "desc";
export type CompletionCodeGeneratorMode = "digits" | "letters";
export type UploadImageFileFn = (file: File) => Promise<string>;
export const COMPLETION_CODE_REGEX = /^[A-Z0-9-]{3,32}$/;
const COMPLETION_CODE_DIGITS_ONLY_REGEX = /^\d{3,32}$/;
const COMPLETION_CODE_LETTERS_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COMPLETION_CODE_DIGITS_ALPHABET = "0123456789";
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
  "Twoim zadaniem jest ułożyć poprawne słowo na podstawie liter widocznych na planszy Boggle. Wpisz właściwe hasło, aby zaliczyć stanowisko.";
const MEMORY_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odnaleźć i dopasować wszystkie pary kart. Zapamiętuj odkryte symbole i łącz je poprawnie.";
const SIMON_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest odtworzyć poprawną sekwencję sygnałów w odpowiedniej kolejności.";
const MINI_SUDOKU_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest uzupełnić mini Sudoku tak, aby liczby nie powtarzały się w wierszach i kolumnach.";
const MATCHING_DEFAULT_STATION_DESCRIPTION =
  "Twoim zadaniem jest poprawnie dopasować elementy z lewej i prawej strony zgodnie z poleceniem.";
const QUIZ_SECRET_FALLBACK_ANSWERS = ["A", "B", "C"] as const;
const MATCHING_PAIR_DELIMITER = "->";

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
    normalized === MATCHING_DEFAULT_STATION_DESCRIPTION
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
    stationType === "matching"
  );
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
    stationType === "mini-sudoku"
  );
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
    stationType !== "boggle"
  );
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
        questionPlaceholder: "Wpisz sekwencję lub polecenie dla gry Simon",
        answersHint: "Simon używa wyłącznie sekwencji/polecenia jako treści zadania.",
        validationMessage: "Simon wymaga sekwencji/polecenia.",
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
        questionPlaceholder: "Wpisz litery planszy lub hasło do odgadnięcia",
        answersHint: "Boggle używa wyłącznie hasła jako rozwiązania.",
        validationMessage: "Boggle wymaga hasła/zadania.",
      };
    case "mini-sudoku":
      return {
        sectionTitle: "Mini Sudoku",
        questionLabel: "Układ Sudoku",
        questionPlaceholder: "Wpisz układ lub pytanie dla mini Sudoku",
        answersHint: "Mini Sudoku używa wyłącznie treści zadania jako instrukcji.",
        validationMessage: "Mini Sudoku wymaga treści zadania.",
      };
    case "matching":
      return {
        sectionTitle: "Dopasowywanie par",
        questionLabel: "Polecenie dopasowania",
        questionPlaceholder: "Wpisz elementy do dopasowania lub pytanie",
        answersHint: "Uzupełnij 4 pary w formacie lewa -> prawa.",
        validationMessage: "Dopasowywanie wymaga treści i 4 pełnych par.",
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

export type StationQuizInput = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  audioUrl?: string;
};

export type MatchingPairInput = {
  left: string;
  right: string;
};

export function splitMatchingPairAnswer(value: string): MatchingPairInput {
  const normalized = value.trim();
  if (!normalized) {
    return { left: "", right: "" };
  }

  const match = normalized.match(/^(.+?)\s*(?:->|=|:)\s*(.+)$/);
  if (!match) {
    return { left: normalized, right: "" };
  }

  return {
    left: match[1].trim(),
    right: match[2].trim(),
  };
}

export function joinMatchingPairAnswer(left: string, right: string) {
  const normalizedLeft = left.trim();
  const normalizedRight = right.trim();
  if (!normalizedLeft && !normalizedRight) {
    return "";
  }
  if (!normalizedLeft || !normalizedRight) {
    return normalizedLeft || normalizedRight;
  }
  return `${normalizedLeft} ${MATCHING_PAIR_DELIMITER} ${normalizedRight}`;
}

function normalizeMatchingPairAnswers(answers: string[]) {
  return answers.map((answer) => {
    const pair = splitMatchingPairAnswer(answer);
    if (!pair.left || !pair.right) {
      return "";
    }
    return joinMatchingPairAnswer(pair.left, pair.right);
  });
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

  return {
    question,
    answers,
    correctAnswerIndex,
    audioUrl: audioUrl || undefined,
  };
}

export function normalizeStationQuizForType(stationType: StationType, input: StationQuizInput): StationQuiz | null {
  if (isWordPuzzleStationType(stationType)) {
    return normalizeStationQuiz({
      ...input,
      answers: [input.question, ...QUIZ_SECRET_FALLBACK_ANSWERS],
      correctAnswerIndex: 0,
    });
  }

  if (isMatchingStationType(stationType)) {
    return normalizeStationQuiz({
      ...input,
      answers: normalizeMatchingPairAnswers(input.answers),
      correctAnswerIndex: 0,
    });
  }

  return normalizeStationQuiz(input);
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

export function generateSampleCompletionCode(length = 8, mode: CompletionCodeGeneratorMode = "letters") {
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
