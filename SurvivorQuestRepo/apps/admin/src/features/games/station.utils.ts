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

export function createEmptyQuizAnswers() {
  return Array.from({ length: QUIZ_ANSWER_COUNT }, () => "");
}

export type StationQuizInput = {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
};

export function normalizeStationQuiz(input: StationQuizInput): StationQuiz | null {
  const question = input.question.trim();
  const answers = input.answers.map((answer) => answer.trim());
  const correctAnswerIndex = Math.round(input.correctAnswerIndex);

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
  };
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
