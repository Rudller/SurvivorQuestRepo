import type { ClipboardEvent } from "react";
import type { StationType } from "./types/station";
import { stationTypeOptions } from "./types/station";

export type ImageInputMode = "upload" | "paste" | "url";
export type StationSortField = "name" | "type";
export type SortDirection = "asc" | "desc";

export const imageModeOptions: { value: ImageInputMode; label: string }[] = [
  { value: "upload", label: "Upload" },
  { value: "paste", label: "Wklej" },
  { value: "url", label: "URL" },
];

export function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || value.trim().startsWith("data:image/");
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

export async function handleImageFile(
  file: File | null,
  onSuccess: (dataUrl: string) => void,
  onError: (msg: string) => void,
) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    onError("Wybierz plik obrazu.");
    return;
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    onSuccess(dataUrl);
  } catch {
    onError("Nie udało się odczytać pliku obrazu.");
  }
}

export async function handleImagePaste(
  event: ClipboardEvent<HTMLDivElement>,
  onSuccess: (value: string) => void,
  onError: (msg: string) => void,
) {
  const fileItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
  if (fileItem) {
    event.preventDefault();
    await handleImageFile(fileItem.getAsFile(), onSuccess, onError);
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
