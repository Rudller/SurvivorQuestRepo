"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { stationTypeOptions, type Station } from "@/features/games/types/station";
import { useUploadStationImageMutation } from "@/features/games/api/station.api";
import {
  clampTimeLimitSeconds,
  createEmptyQuizAnswers,
  normalizeStationQuizForType,
  QUIZ_ANSWER_COUNT,
  isCompletionCodeRequired,
  isQuizStationType,
  isWordPuzzleStationType,
  isMatchingStationType,
  isImageSupportedStationType,
  formatTimeLimit,
  handleImageFile,
  handleImagePaste,
  imageModeOptions,
  normalizeCompletionCode,
  generateSampleCompletionCode,
  type ImageInputMode,
  splitMatchingPairAnswer,
  joinMatchingPairAnswer,
  resolveCompletionCodeGeneratorMode,
  type CompletionCodeGeneratorMode,
  completionCodeModeOptions,
  isValidCompletionCodeForMode,
  getQuizLikeStationCopy,
  MEMORY_SYSTEM_STATION_PROMPT,
  MINI_SUDOKU_SYSTEM_STATION_PROMPT,
  MATCHING_SYSTEM_STATION_PROMPT,
  generateSimonSequence,
  normalizeSimonSequenceInput,
} from "@/features/games/station.utils";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  type RealizationLanguage,
  type RealizationStationDraft,
} from "../types/realization";

const RealizationLocationPickerMap = dynamic(
  () => import("./realization-location-picker-map").then((module) => module.RealizationLocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">
        Ładowanie mapy...
      </div>
    ),
  },
);

interface RealizationStationsEditorProps {
  stations: RealizationStationDraft[];
  onChange: (stations: RealizationStationDraft[]) => void;
  showValidation?: boolean;
  selectedLanguages?: RealizationLanguage[];
}

const DEFAULT_STATION_DESCRIPTION = "Opis stanowiska będzie dostępny po rozpoczęciu zadania.";

const supportedStationTranslationLanguages: RealizationLanguage[] = [
  "polish",
  "english",
  "ukrainian",
  "russian",
  "other",
];

function isRealizationLanguage(value: string): value is RealizationLanguage {
  return (
    value === "polish" ||
    value === "english" ||
    value === "ukrainian" ||
    value === "russian" ||
    value === "other"
  );
}

function toQuizAnswersTuple(answers: string[]) {
  return [answers[0] ?? "", answers[1] ?? "", answers[2] ?? "", answers[3] ?? ""] as [string, string, string, string];
}

export function createEmptyRealizationStationDraft(): RealizationStationDraft {
  return {
    name: "",
    type: "quiz",
    description: DEFAULT_STATION_DESCRIPTION,
    imageUrl: "",
    points: 100,
    timeLimitSeconds: 0,
    completionCode: "",
    quiz: {
      question: "",
      answers: createEmptyQuizAnswers(),
      correctAnswerIndex: 0,
      audioUrl: "",
    },
    latitude: undefined,
    longitude: undefined,
  };
}

function cloneStationTranslations(translations: Station["translations"] | undefined) {
  if (!translations) {
    return undefined;
  }

  const cloned = Object.entries(translations).reduce<NonNullable<Station["translations"]>>((acc, [language, value]) => {
    if (!value) {
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
        name: value.name,
        description: value.description,
        quiz: value.quiz
          ? {
              question: value.quiz.question,
              answers: [...value.quiz.answers],
              correctAnswerIndex: value.quiz.correctAnswerIndex,
              audioUrl: value.quiz.audioUrl,
            }
          : undefined,
      };
    }

    return acc;
  }, {});

  return Object.keys(cloned).length > 0 ? cloned : undefined;
}

function normalizeStationTranslations(
  translations: RealizationStationDraft["translations"],
  stationType: RealizationStationDraft["type"],
) {
  if (!translations) {
    return undefined;
  }

  const normalized = Object.entries(translations).reduce<NonNullable<RealizationStationDraft["translations"]>>(
    (acc, [language, value]) => {
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
                answers: toQuizAnswersTuple(normalizedQuiz.answers),
                correctAnswerIndex: normalizedQuiz.correctAnswerIndex,
                audioUrl: normalizedQuiz.audioUrl,
              }
            : undefined,
        };
      }

      return acc;
    },
    {},
  );

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function toRealizationStationDraft(station: Station): RealizationStationDraft {
  return {
    id: station.id,
    name: station.name,
    type: station.type,
    description: station.description,
    imageUrl: station.imageUrl,
    points: station.points,
    timeLimitSeconds: station.timeLimitSeconds,
    completionCode: station.completionCode ?? "",
    quiz: station.quiz
        ? {
            question:
              station.type === "memory" && !station.quiz.question.trim()
                ? MEMORY_SYSTEM_STATION_PROMPT
                : station.type === "mini-sudoku" && !station.quiz.question.trim()
                  ? MINI_SUDOKU_SYSTEM_STATION_PROMPT
                  : station.type === "matching" && !station.quiz.question.trim()
                    ? MATCHING_SYSTEM_STATION_PROMPT
                : station.quiz.question,
            answers: toQuizAnswersTuple(station.quiz.answers),
            correctAnswerIndex: station.quiz.correctAnswerIndex,
            audioUrl: station.quiz.audioUrl ?? "",
          }
      : {
          question:
            station.type === "memory"
              ? MEMORY_SYSTEM_STATION_PROMPT
              : station.type === "mini-sudoku"
                ? MINI_SUDOKU_SYSTEM_STATION_PROMPT
                : station.type === "matching"
                  ? MATCHING_SYSTEM_STATION_PROMPT
                : "",
          answers: createEmptyQuizAnswers(),
          correctAnswerIndex: 0,
          audioUrl: "",
        },
    translations: cloneStationTranslations(station.translations),
    latitude: station.latitude,
    longitude: station.longitude,
  };
}

export function normalizeRealizationStationDrafts(stations: RealizationStationDraft[]) {
  return stations.map((station) => ({
    id: station.id,
    name: station.name.trim(),
    type: station.type,
    description: station.description.trim() || DEFAULT_STATION_DESCRIPTION,
    imageUrl: isImageSupportedStationType(station.type) ? station.imageUrl.trim() : "",
    points: Math.round(station.points),
    timeLimitSeconds: Math.round(station.timeLimitSeconds),
    completionCode: isCompletionCodeRequired(station.type) ? normalizeCompletionCode(station.completionCode ?? "") : undefined,
    quiz:
      isQuizStationType(station.type) && station.quiz
        ? normalizeStationQuizForType(station.type, {
            question: station.quiz.question,
            answers: station.quiz.answers,
            correctAnswerIndex: station.quiz.correctAnswerIndex,
            audioUrl: station.quiz.audioUrl,
          }) ?? undefined
        : undefined,
    translations: normalizeStationTranslations(station.translations, station.type),
    latitude: typeof station.latitude === "number" && Number.isFinite(station.latitude) ? station.latitude : undefined,
    longitude: typeof station.longitude === "number" && Number.isFinite(station.longitude) ? station.longitude : undefined,
  }));
}

export function hasInvalidRealizationStationDrafts(stations: RealizationStationDraft[]) {
  return stations.some((station) => {
    if (!station.name.trim()) {
      return true;
    }

    if (!Number.isFinite(station.points) || station.points <= 0) {
      return true;
    }

    if (!Number.isFinite(station.timeLimitSeconds) || station.timeLimitSeconds < 0 || station.timeLimitSeconds > 600) {
      return true;
    }

    const completionCodeMode = resolveCompletionCodeGeneratorMode(station.completionCode ?? "");
    if (isCompletionCodeRequired(station.type) && !isValidCompletionCodeForMode(station.completionCode ?? "", completionCodeMode)) {
      return true;
    }

    if (isQuizStationType(station.type)) {
      if (
        !station.quiz ||
        !normalizeStationQuizForType(station.type, {
          question: station.quiz.question,
          answers: station.quiz.answers,
          correctAnswerIndex: station.quiz.correctAnswerIndex,
          audioUrl: station.quiz.audioUrl,
        })
      ) {
        return true;
      }
    }

    const hasLatitude = typeof station.latitude === "number" && Number.isFinite(station.latitude);
    const hasLongitude = typeof station.longitude === "number" && Number.isFinite(station.longitude);

    if (hasLatitude !== hasLongitude) {
      return true;
    }

    if (hasLatitude && (station.latitude! < -90 || station.latitude! > 90)) {
      return true;
    }

    if (hasLongitude && (station.longitude! < -180 || station.longitude! > 180)) {
      return true;
    }

    return false;
  });
}

export type RealizationStationValidation = {
  missingName: boolean;
  invalidPoints: boolean;
  invalidTimeLimit: boolean;
  invalidCompletionCode: boolean;
  invalidQuiz: boolean;
  invalidCoordinates: boolean;
};

export function getRealizationStationValidation(station: RealizationStationDraft): RealizationStationValidation {
  const missingName = !station.name.trim();
  const invalidPoints = !Number.isFinite(station.points) || station.points <= 0;
  const invalidTimeLimit =
    !Number.isFinite(station.timeLimitSeconds) || station.timeLimitSeconds < 0 || station.timeLimitSeconds > 600;
  const completionCodeMode = resolveCompletionCodeGeneratorMode(station.completionCode ?? "");
  const invalidCompletionCode =
    isCompletionCodeRequired(station.type) && !isValidCompletionCodeForMode(station.completionCode ?? "", completionCodeMode);
  const invalidQuiz =
    isQuizStationType(station.type) &&
    (!station.quiz ||
      !normalizeStationQuizForType(station.type, {
        question: station.quiz.question,
        answers: station.quiz.answers,
        correctAnswerIndex: station.quiz.correctAnswerIndex,
        audioUrl: station.quiz.audioUrl,
      }));
  const hasLatitude = typeof station.latitude === "number" && Number.isFinite(station.latitude);
  const hasLongitude = typeof station.longitude === "number" && Number.isFinite(station.longitude);
  const invalidCoordinates =
    hasLatitude !== hasLongitude ||
    (hasLatitude && (station.latitude! < -90 || station.latitude! > 90)) ||
    (hasLongitude && (station.longitude! < -180 || station.longitude! > 180));

  return {
    missingName,
    invalidPoints,
    invalidTimeLimit,
    invalidCompletionCode,
    invalidQuiz,
    invalidCoordinates,
  };
}

export function RealizationStationsEditor({
  stations,
  onChange,
  showValidation = false,
  selectedLanguages,
}: RealizationStationsEditorProps) {
  const [expandedStationIndex, setExpandedStationIndex] = useState<number | null>(null);
  const [stationImageModes, setStationImageModes] = useState<Record<string, ImageInputMode>>({});
  const [stationCompletionCodeModes, setStationCompletionCodeModes] = useState<Record<string, CompletionCodeGeneratorMode>>({});
  const [stationImageErrors, setStationImageErrors] = useState<Record<string, string>>({});
  const [stationAudioModes, setStationAudioModes] = useState<Record<string, "upload" | "url">>({});
  const [stationAudioErrors, setStationAudioErrors] = useState<Record<string, string>>({});
  const [stationLocationErrors, setStationLocationErrors] = useState<Record<string, string>>({});
  const [stationLocationLoading, setStationLocationLoading] = useState<Record<string, boolean>>({});
  const [stationMapRecenterTokens, setStationMapRecenterTokens] = useState<Record<string, number>>({});
  const [uploadStationImage, { isLoading: isUploadingImage }] = useUploadStationImageMutation();

  const stationTypeLabelByValue = useMemo(
    () => new Map(stationTypeOptions.map((option) => [option.value, option.label])),
    [],
  );
  const availableLanguages = useMemo<RealizationLanguage[]>(() => {
    const source = selectedLanguages?.length ? selectedLanguages : ["polish"];
    const filtered = supportedStationTranslationLanguages.filter((language) => source.includes(language));
    if (!filtered.includes("polish")) {
      return ["polish", ...filtered];
    }
    return filtered;
  }, [selectedLanguages]);
  const [baseLanguage, setBaseLanguage] = useState<RealizationLanguage>("polish");
  const [editingLanguage, setEditingLanguage] = useState<RealizationLanguage>("polish");
  const translationLanguages = useMemo(
    () => availableLanguages.filter((language) => language !== baseLanguage),
    [availableLanguages, baseLanguage],
  );
  const editableLanguages = useMemo(
    () => [baseLanguage, ...translationLanguages],
    [baseLanguage, translationLanguages],
  );

  const activeExpandedStationIndex =
    expandedStationIndex !== null && expandedStationIndex < stations.length ? expandedStationIndex : null;

  useEffect(() => {
    setExpandedStationIndex((current) => {
      if (current === null) {
        return null;
      }

      return current < stations.length ? current : null;
    });
  }, [stations.length]);

  useEffect(() => {
    if (!availableLanguages.includes(baseLanguage)) {
      const fallbackLanguage = availableLanguages[0];
      setBaseLanguage(
        fallbackLanguage === "polish" ||
          fallbackLanguage === "english" ||
          fallbackLanguage === "ukrainian" ||
          fallbackLanguage === "russian" ||
          fallbackLanguage === "other"
          ? fallbackLanguage
          : "polish",
      );
    }
  }, [availableLanguages, baseLanguage]);

  useEffect(() => {
    if (!editableLanguages.includes(editingLanguage)) {
      setEditingLanguage(baseLanguage);
    }
  }, [baseLanguage, editableLanguages, editingLanguage]);

  function updateStation(index: number, patch: Partial<RealizationStationDraft>) {
    onChange(stations.map((station, currentIndex) => (currentIndex === index ? { ...station, ...patch } : station)));
  }

  function updateStationTranslation(
    index: number,
    language: RealizationLanguage,
    patch: Partial<NonNullable<RealizationStationDraft["translations"]>[RealizationLanguage]>,
  ) {
    onChange(
      stations.map((station, currentIndex) => {
        if (currentIndex !== index) {
          return station;
        }

        const currentTranslation = station.translations?.[language] ?? {};
        const nextTranslation = {
          ...currentTranslation,
          ...patch,
        };

        const hasTranslationValue =
          Boolean(nextTranslation.name?.trim()) ||
          Boolean(nextTranslation.description?.trim()) ||
          Boolean(nextTranslation.quiz);

        const nextTranslations = {
          ...(station.translations ?? {}),
        };

        if (hasTranslationValue) {
          nextTranslations[language] = nextTranslation;
        } else {
          delete nextTranslations[language];
        }

        return {
          ...station,
          translations: Object.keys(nextTranslations).length > 0 ? nextTranslations : undefined,
        };
      }),
    );
  }

  function updateStationForSelectedLanguage(
    index: number,
    patch: Partial<Pick<RealizationStationDraft, "name" | "description" | "quiz">>,
  ) {
    if (editingLanguage === baseLanguage) {
      updateStation(index, patch);
      return;
    }

    const translationPatch: Partial<NonNullable<RealizationStationDraft["translations"]>[RealizationLanguage]> = {};

    if (Object.prototype.hasOwnProperty.call(patch, "name")) {
      translationPatch.name = patch.name;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "description")) {
      translationPatch.description = patch.description;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "quiz")) {
      translationPatch.quiz = patch.quiz;
    }

    updateStationTranslation(index, editingLanguage, translationPatch);
  }

  function getStationKey(index: number, station: RealizationStationDraft) {
    return station.id ?? `new-${index}`;
  }

  function setStationImageMode(stationKey: string, mode: ImageInputMode) {
    setStationImageModes((current) => ({ ...current, [stationKey]: mode }));
  }

  function setStationCompletionCodeMode(stationKey: string, mode: CompletionCodeGeneratorMode) {
    setStationCompletionCodeModes((current) => ({ ...current, [stationKey]: mode }));
  }

  function setStationAudioMode(stationKey: string, mode: "upload" | "url") {
    setStationAudioModes((current) => ({ ...current, [stationKey]: mode }));
  }

  function setStationImageError(stationKey: string, error: string | null) {
    setStationImageErrors((current) => {
      if (!error) {
        const next = { ...current };
        delete next[stationKey];
        return next;
      }

      return { ...current, [stationKey]: error };
    });
  }

  function setStationLocationError(stationKey: string, error: string | null) {
    setStationLocationErrors((current) => {
      if (!error) {
        const next = { ...current };
        delete next[stationKey];
        return next;
      }

      return { ...current, [stationKey]: error };
    });
  }

  function setStationAudioError(stationKey: string, error: string | null) {
    setStationAudioErrors((current) => {
      if (!error) {
        const next = { ...current };
        delete next[stationKey];
        return next;
      }

      return { ...current, [stationKey]: error };
    });
  }

  function setStationLocationLoadingState(stationKey: string, isLoading: boolean) {
    setStationLocationLoading((current) => {
      if (!isLoading) {
        const next = { ...current };
        delete next[stationKey];
        return next;
      }

      return { ...current, [stationKey]: true };
    });
  }

  function triggerStationMapRecenter(stationKey: string) {
    setStationMapRecenterTokens((current) => ({
      ...current,
      [stationKey]: (current[stationKey] ?? 0) + 1,
    }));
  }

  function showAutoTranslateNotImplemented() {
    window.alert("Auto-translate nie jest jeszcze zaimplementowany.");
  }

  function requestCurrentLocation(index: number, stationKey: string) {
    if (typeof window === "undefined") {
      return;
    }

    if (!("geolocation" in navigator)) {
      setStationLocationError(stationKey, "Urządzenie nie obsługuje geolokalizacji.");
      return;
    }

    setStationLocationError(stationKey, null);
    setStationLocationLoadingState(stationKey, true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateStation(index, {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        triggerStationMapRecenter(stationKey);
        setStationLocationLoadingState(stationKey, false);
      },
      (error) => {
        setStationLocationLoadingState(stationKey, false);

        if (error.code === 1) {
          setStationLocationError(stationKey, "Brak zgody na lokalizację urządzenia.");
          return;
        }

        if (error.code === 2) {
          setStationLocationError(stationKey, "Nie udało się ustalić lokalizacji urządzenia.");
          return;
        }

        if (error.code === 3) {
          setStationLocationError(stationKey, "Przekroczono czas oczekiwania na lokalizację.");
          return;
        }

        setStationLocationError(stationKey, "Wystąpił błąd pobierania lokalizacji.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }

  function addStation() {
    onChange([...stations, createEmptyRealizationStationDraft()]);
    setExpandedStationIndex(stations.length);
  }

  function removeStation(index: number) {
    const stationKey = getStationKey(index, stations[index]);

    onChange(stations.filter((_, currentIndex) => currentIndex !== index));
    setStationImageModes((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationAudioModes((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationAudioErrors((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationCompletionCodeModes((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationImageErrors((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationLocationErrors((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationLocationLoading((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });
    setStationMapRecenterTokens((current) => {
      const next = { ...current };
      delete next[stationKey];
      return next;
    });

    setExpandedStationIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      if (currentIndex === index) {
        if (stations.length === 1) {
          return null;
        }

        return Math.min(index, stations.length - 2);
      }

      if (currentIndex > index) {
        return currentIndex - 1;
      }

      return currentIndex;
    });
  }

  function moveStation(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= stations.length) {
      return;
    }

    const reorderedStations = [...stations];
    [reorderedStations[index], reorderedStations[targetIndex]] = [reorderedStations[targetIndex], reorderedStations[index]];
    onChange(reorderedStations);

    setExpandedStationIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      if (currentIndex === index) {
        return targetIndex;
      }

      if (currentIndex === targetIndex) {
        return index;
      }

      return currentIndex;
    });
  }

  return (
    <fieldset className="min-w-0 space-y-3 overflow-x-hidden rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Stanowiska realizacji</legend>
        <div className="flex items-center justify-end gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200">
            <span>Język podstawowy</span>
            <select
              value={baseLanguage}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (isRealizationLanguage(nextValue)) {
                  setBaseLanguage(nextValue);
                }
              }}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
            >
              {availableLanguages.map((language) => (
                <option key={language} value={language}>
                  {getRealizationLanguageFlag(language)} {getRealizationLanguageLabel(language)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addStation}
            className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
          >
            + Dodaj stanowisko
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
          <span>{getRealizationLanguageFlag(baseLanguage)}</span>
          <span>Podstawowy: {getRealizationLanguageLabel(baseLanguage)}</span>
        </span>
        <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
          <span>Edytowany język</span>
          <select
            value={editingLanguage}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (isRealizationLanguage(nextValue)) {
                setEditingLanguage(nextValue);
              }
            }}
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
          >
            {editableLanguages.map((language) => (
              <option key={`editing-${language}`} value={language}>
                {getRealizationLanguageFlag(language)} {getRealizationLanguageLabel(language)}
                {language === baseLanguage ? " (podstawowy)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={showAutoTranslateNotImplemented}
          className="rounded-md border border-amber-400/60 px-2.5 py-1 text-xs text-amber-200 transition hover:border-amber-300"
        >
          Auto-tłumacz
        </button>
      </div>

      {stations.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/70 p-3 text-xs text-zinc-500">
          Brak stanowisk. Dodaj przynajmniej jedno stanowisko do realizacji.
        </p>
      )}

      <div className="space-y-3">
        {stations.map((station, index) => {
          const stationKey = getStationKey(index, station);
          const imageMode = stationImageModes[stationKey] ?? "upload";
          const audioMode = stationAudioModes[stationKey] ?? "upload";
          const audioFile = station.pendingAudioFile ?? null;
          const completionCodeMode =
            stationCompletionCodeModes[stationKey] ?? resolveCompletionCodeGeneratorMode(station.completionCode ?? "");
          const stationValidation = getRealizationStationValidation(station);
          const hasStationValidationError = Object.values(stationValidation).some(Boolean);
          const imageError = stationImageErrors[stationKey];
          const audioError = stationAudioErrors[stationKey];
          const locationError = stationLocationErrors[stationKey];
          const isLocating = stationLocationLoading[stationKey] === true;
          const recenterToken = stationMapRecenterTokens[stationKey];
          const isEditingBaseLanguage = editingLanguage === baseLanguage;
          const selectedTranslation = isEditingBaseLanguage ? undefined : station.translations?.[editingLanguage];
          const selectedStationName = isEditingBaseLanguage ? station.name : selectedTranslation?.name ?? "";
          const selectedStationDescription = isEditingBaseLanguage
            ? station.description
            : selectedTranslation?.description ?? "";
          const selectedStationQuiz = isEditingBaseLanguage ? station.quiz : selectedTranslation?.quiz;
          const selectedStationQuizAnswers = selectedStationQuiz?.answers ?? createEmptyQuizAnswers();
          const selectedStationCorrectAnswerIndex = selectedStationQuiz?.correctAnswerIndex ?? 0;
          const quizLikeCopy = getQuizLikeStationCopy(station.type);
          const shouldValidateLanguageFields = showValidation && isEditingBaseLanguage;
          const hasCoordinates =
            typeof station.latitude === "number" &&
            Number.isFinite(station.latitude) &&
            typeof station.longitude === "number" &&
            Number.isFinite(station.longitude);

          return (
            <div
              key={station.id ?? `new-${index}`}
              className={`rounded-lg border bg-zinc-950/70 ${
                showValidation && hasStationValidationError ? "border-red-500/60" : "border-zinc-700"
              }`}
            >
              <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedStationIndex((current) => (current === index ? null : index))}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-100">
                    <span className="inline-flex min-w-9 justify-center rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs font-semibold text-zinc-300">
                      #{index + 1}
                    </span>
                    <span className="min-w-0 break-words">{station.name.trim() || `Stanowisko ${index + 1}`}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {stationTypeLabelByValue.get(station.type) ?? "Quiz"} • {Number.isFinite(station.points) ? station.points : 0} pkt •{" "}
                    {Number.isFinite(station.timeLimitSeconds) ? station.timeLimitSeconds : 0}s •{" "}
                    {typeof station.latitude === "number" && typeof station.longitude === "number"
                      ? `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`
                      : "brak GPS"}
                  </p>
                </button>

                <div className="w-full sm:w-auto">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => moveStation(index, "up")}
                      disabled={index === 0}
                      title="Przesuń w górę"
                      className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStation(index, "down")}
                      disabled={index === stations.length - 1}
                      title="Przesuń w dół"
                      className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedStationIndex((current) => (current === index ? null : index))}
                      className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                    >
                      {activeExpandedStationIndex === index ? "Zwiń" : "Rozwiń"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStation(index)}
                      className="rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs text-red-300 transition hover:border-red-400 hover:text-red-200"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </div>

              {activeExpandedStationIndex === index && (
                <div className="space-y-3 border-t border-zinc-800 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa stanowiska</span>
                      <input
                        value={selectedStationName}
                        onChange={(event) => updateStationForSelectedLanguage(index, { name: event.target.value })}
                        className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                          shouldValidateLanguageFields && stationValidation.missingName
                            ? "border-red-500/70 focus:border-red-400/80"
                            : "border-zinc-700 focus:border-amber-400/80"
                        }`}
                      />
                      {shouldValidateLanguageFields && stationValidation.missingName ? (
                        <p className="text-xs text-red-300">Uzupełnij nazwę stanowiska.</p>
                      ) : null}
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Typ stanowiska</span>
                      <select
                        value={station.type}
                        onChange={(event) => {
                          const nextType = event.target.value as RealizationStationDraft["type"];
                          const existingQuiz = station.quiz;
                          updateStation(index, {
                            type: nextType,
                            completionCode: isCompletionCodeRequired(nextType) ? station.completionCode : "",
                            imageUrl: isImageSupportedStationType(nextType) ? station.imageUrl : "",
                            quiz:
                              isQuizStationType(nextType)
                                ? {
                                    question:
                                      nextType === "memory"
                                        ? existingQuiz?.question?.trim() || MEMORY_SYSTEM_STATION_PROMPT
                                        : nextType === "mini-sudoku"
                                          ? existingQuiz?.question?.trim() || MINI_SUDOKU_SYSTEM_STATION_PROMPT
                                          : nextType === "matching"
                                            ? existingQuiz?.question?.trim() || MATCHING_SYSTEM_STATION_PROMPT
                                        : existingQuiz?.question ?? "",
                                    answers: existingQuiz?.answers ?? createEmptyQuizAnswers(),
                                    correctAnswerIndex: existingQuiz?.correctAnswerIndex ?? 0,
                                    audioUrl: existingQuiz?.audioUrl ?? "",
                                  }
                                  : station.quiz,
                          });
                          if (!isCompletionCodeRequired(nextType)) {
                            setStationCompletionCodeMode(stationKey, "letters");
                          }
                        }}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      >
                        {stationTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {isCompletionCodeRequired(station.type) ? (
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Kod zaliczenia</span>
                      <div className="flex w-full flex-wrap rounded-lg border border-zinc-700 bg-zinc-900 p-1 sm:inline-flex sm:w-fit">
                        {completionCodeModeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setStationCompletionCodeMode(stationKey, option.value)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                              completionCodeMode === option.value
                                ? "bg-amber-400 text-zinc-950"
                                : "text-zinc-300 hover:text-zinc-100"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={station.completionCode ?? ""}
                          onChange={(event) => {
                            const nextValue = event.target.value.toUpperCase();
                            updateStation(index, { completionCode: nextValue });
                            setStationCompletionCodeMode(stationKey, resolveCompletionCodeGeneratorMode(nextValue));
                          }}
                          placeholder={completionCodeMode === "digits" ? "Np. 20481234" : "Np. CODEWXYZ"}
                          className={`flex-1 rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                            showValidation && stationValidation.invalidCompletionCode
                              ? "border-red-500/70 focus:border-red-400/80"
                              : "border-zinc-700 focus:border-amber-400/80"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateStation(index, { completionCode: generateSampleCompletionCode(8, completionCodeMode) })
                          }
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                        >
                          Wygeneruj
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500">Wymagany dla stanowisk Na czas i Na punkty. Kod mieszany będzie traktowany jak tryb literowy.</p>
                      {showValidation && stationValidation.invalidCompletionCode ? (
                        <p className="text-xs text-red-300">
                          {completionCodeMode === "digits"
                            ? "Kod w trybie Cyfry musi zawierać wyłącznie 0-9 (3-32 znaki)."
                            : "Podaj kod 3-32 znaki: A-Z, 0-9 lub '-'."}
                        </p>
                      ) : null}
                    </label>
                  ) : null}

                  {isQuizStationType(station.type) ? (
                    <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{quizLikeCopy.sectionTitle}</h3>
                      {station.type === "audio-quiz" ? (
                        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs uppercase tracking-wider text-zinc-400">Audio (upload lub URL)</span>
                            <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setStationAudioMode(stationKey, "upload");
                                  setStationAudioError(stationKey, null);
                                }}
                                className={`rounded px-2.5 py-1 text-xs transition ${
                                  audioMode === "upload" ? "bg-amber-400 text-zinc-950" : "text-zinc-300"
                                }`}
                              >
                                Upload
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStationAudioMode(stationKey, "url");
                                  updateStation(index, {
                                    pendingAudioFile: null,
                                    pendingAudioLanguage: undefined,
                                  });
                                  setStationAudioError(stationKey, null);
                                }}
                                className={`rounded px-2.5 py-1 text-xs transition ${
                                  audioMode === "url" ? "bg-amber-400 text-zinc-950" : "text-zinc-300"
                                }`}
                              >
                                URL
                              </button>
                            </div>
                          </div>

                          {audioMode === "upload" ? (
                            <div className="space-y-2">
                              <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                                Wybierz plik audio
                                <input
                                  type="file"
                                  accept="audio/mpeg,audio/wav,audio/wave,audio/x-wav,audio/ogg,application/ogg,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/webm,.mp3,.wav,.ogg,.m4a,.aac,.webm"
                                  className="hidden"
                                  onChange={(event) => {
                                    const selected = event.target.files?.[0] ?? null;
                                    updateStation(index, {
                                      pendingAudioFile: selected,
                                      pendingAudioLanguage: selected ? editingLanguage : undefined,
                                    });
                                    setStationAudioError(stationKey, null);
                                    event.currentTarget.value = "";
                                  }}
                                />
                              </label>
                              <p className="text-xs text-zinc-500">
                                Obsługiwane: MP3, WAV, OGG, M4A, AAC, WEBM.{" "}
                                {audioFile
                                  ? `Wybrano: ${audioFile.name} (zostanie przesłane przy zapisie realizacji).`
                                  : "Brak wybranego pliku."}
                              </p>
                            </div>
                          ) : (
                            <label className="space-y-1.5">
                              <span className="text-xs uppercase tracking-wider text-zinc-400">URL audio (opcjonalny)</span>
                              <input
                                type="url"
                                value={selectedStationQuiz?.audioUrl ?? ""}
                                onChange={(event) =>
                                  updateStationForSelectedLanguage(index, {
                                    quiz: {
                                      question: selectedStationQuiz?.question ?? "",
                                      answers: selectedStationQuizAnswers,
                                      correctAnswerIndex: selectedStationCorrectAnswerIndex,
                                      audioUrl: event.target.value,
                                    },
                                  })
                                }
                                placeholder="https://..."
                                className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                                  shouldValidateLanguageFields && stationValidation.invalidQuiz
                                    ? "border-red-500/70 focus:border-red-400/80"
                                    : "border-zinc-700 focus:border-amber-400/80"
                                }`}
                              />
                            </label>
                          )}

                          {audioError ? <p className="text-xs text-red-300">{audioError}</p> : null}
                        </div>
                      ) : null}
                      <label className="space-y-1.5">
                        <span className="text-xs uppercase tracking-wider text-zinc-400">{quizLikeCopy.questionLabel}</span>
                        <textarea
                          rows={2}
                          value={
                            station.type === "memory"
                              ? selectedStationQuiz?.question?.trim() || MEMORY_SYSTEM_STATION_PROMPT
                              : station.type === "mini-sudoku"
                                ? selectedStationQuiz?.question?.trim() || MINI_SUDOKU_SYSTEM_STATION_PROMPT
                                : station.type === "matching"
                                  ? selectedStationQuiz?.question?.trim() || MATCHING_SYSTEM_STATION_PROMPT
                              : selectedStationQuiz?.question ?? ""
                          }
                          onChange={(event) =>
                            updateStationForSelectedLanguage(index, {
                                quiz: {
                                  question:
                                    station.type === "memory" && !event.target.value.trim()
                                      ? MEMORY_SYSTEM_STATION_PROMPT
                                      : station.type === "mini-sudoku" && !event.target.value.trim()
                                        ? MINI_SUDOKU_SYSTEM_STATION_PROMPT
                                        : station.type === "matching" && !event.target.value.trim()
                                          ? MATCHING_SYSTEM_STATION_PROMPT
                                        : station.type === "simon"
                                          ? normalizeSimonSequenceInput(event.target.value)
                                        : event.target.value,
                                  answers: selectedStationQuizAnswers,
                                  correctAnswerIndex: selectedStationCorrectAnswerIndex,
                                  audioUrl: selectedStationQuiz?.audioUrl,
                                },
                              })
                            }
                          className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                            shouldValidateLanguageFields && stationValidation.invalidQuiz
                              ? "border-red-500/70 focus:border-red-400/80"
                              : "border-zinc-700 focus:border-amber-400/80"
                          }`}
                          placeholder={quizLikeCopy.questionPlaceholder}
                        />
                      </label>
                      {station.type === "simon" ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                          <p className="text-xs text-zinc-500">Sekwencja Simon ma zawsze 10 cyfr (1-9).</p>
                          <button
                            type="button"
                            onClick={() =>
                              updateStationForSelectedLanguage(index, {
                                quiz: {
                                  question: generateSimonSequence(10),
                                  answers: selectedStationQuizAnswers,
                                  correctAnswerIndex: selectedStationCorrectAnswerIndex,
                                  audioUrl: selectedStationQuiz?.audioUrl,
                                },
                              })
                            }
                            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                          >
                            Generuj sekwencję
                          </button>
                        </div>
                      ) : null}

                      {!isWordPuzzleStationType(station.type) && !isMatchingStationType(station.type) ? (
                        <div className="space-y-2">
                          {selectedStationQuizAnswers.map((answer, answerIndex) => (
                            <label
                              key={answerIndex}
                              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2"
                            >
                              <input
                                type="radio"
                                name={`realization-station-quiz-correct-${stationKey}`}
                                checked={selectedStationCorrectAnswerIndex === answerIndex}
                                onChange={() =>
                                  updateStationForSelectedLanguage(index, {
                                    quiz: {
                                      question: selectedStationQuiz?.question ?? "",
                                      answers: selectedStationQuizAnswers,
                                      correctAnswerIndex: answerIndex,
                                      audioUrl: selectedStationQuiz?.audioUrl,
                                    },
                                  })
                                }
                                className="h-4 w-4 accent-amber-400"
                              />
                              <input
                                value={answer}
                                onChange={(event) =>
                                  updateStationForSelectedLanguage(index, {
                                    quiz: {
                                      question: selectedStationQuiz?.question ?? "",
                                      answers: selectedStationQuizAnswers.map((item, idx) =>
                                        idx === answerIndex ? event.target.value : item,
                                      ),
                                      correctAnswerIndex: selectedStationCorrectAnswerIndex,
                                      audioUrl: selectedStationQuiz?.audioUrl,
                                    },
                                  })
                                }
                                placeholder={`Odpowiedź ${answerIndex + 1}`}
                                className={`flex-1 rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                                  shouldValidateLanguageFields && stationValidation.invalidQuiz
                                    ? "border-red-500/70 focus:border-red-400/80"
                                    : "border-zinc-700 focus:border-amber-400/80"
                                }`}
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                      {isMatchingStationType(station.type) ? (
                        <div className="space-y-2">
                          {selectedStationQuizAnswers.map((answer, answerIndex) => {
                            const pair = splitMatchingPairAnswer(answer);
                            return (
                              <div key={answerIndex} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-2">
                                <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Para {answerIndex + 1}</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input
                                    value={pair.left}
                                    onChange={(event) =>
                                      updateStationForSelectedLanguage(index, {
                                        quiz: {
                                          question: selectedStationQuiz?.question ?? "",
                                          answers: selectedStationQuizAnswers.map((item, idx) =>
                                            idx === answerIndex
                                              ? joinMatchingPairAnswer(event.target.value, splitMatchingPairAnswer(item).right)
                                              : item,
                                          ),
                                          correctAnswerIndex: selectedStationCorrectAnswerIndex,
                                          audioUrl: selectedStationQuiz?.audioUrl,
                                        },
                                      })
                                    }
                                    placeholder="Lewa strona"
                                    className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                                      shouldValidateLanguageFields && stationValidation.invalidQuiz
                                        ? "border-red-500/70 focus:border-red-400/80"
                                        : "border-zinc-700 focus:border-amber-400/80"
                                    }`}
                                  />
                                  <input
                                    value={pair.right}
                                    onChange={(event) =>
                                      updateStationForSelectedLanguage(index, {
                                        quiz: {
                                          question: selectedStationQuiz?.question ?? "",
                                          answers: selectedStationQuizAnswers.map((item, idx) =>
                                            idx === answerIndex
                                              ? joinMatchingPairAnswer(splitMatchingPairAnswer(item).left, event.target.value)
                                              : item,
                                          ),
                                          correctAnswerIndex: selectedStationCorrectAnswerIndex,
                                          audioUrl: selectedStationQuiz?.audioUrl,
                                        },
                                      })
                                    }
                                    placeholder="Prawa strona"
                                    className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                                      shouldValidateLanguageFields && stationValidation.invalidQuiz
                                        ? "border-red-500/70 focus:border-red-400/80"
                                        : "border-zinc-700 focus:border-amber-400/80"
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        {quizLikeCopy.answersHint}
                      </p>
                      {shouldValidateLanguageFields && stationValidation.invalidQuiz ? (
                        <p className="text-xs text-red-300">{quizLikeCopy.validationMessage}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                    <textarea
                      rows={3}
                      value={selectedStationDescription}
                      onChange={(event) => updateStationForSelectedLanguage(index, { description: event.target.value })}
                      className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                        "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                  </label>

                  {isImageSupportedStationType(station.type) ? (
                  <div className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz stanowiska</span>
                    <div className="space-y-3 rounded-xl border border-amber-400/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3">
                      <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
                        <div className="flex h-36 items-center justify-center bg-zinc-900">
                          {station.imageUrl.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={station.imageUrl} alt="Podgląd obrazu stanowiska" className="h-full w-full object-cover" />
                          ) : (
                            <span className="h-full w-full" />
                          )}
                        </div>
                        <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2">
                          <p className="truncate text-xs text-zinc-300">
                            {station.imageUrl.trim() ? "Podgląd aktualnego obrazu stanowiska" : "Czeka na wybór obrazu"}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="flex flex-wrap rounded-lg border border-zinc-700 bg-zinc-900 p-1 sm:inline-flex">
                          {imageModeOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setStationImageMode(stationKey, option.value)}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                imageMode === option.value
                                  ? "bg-amber-400 text-zinc-950"
                                  : "text-zinc-300 hover:text-zinc-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {imageMode === "upload" && (
                        <div className="mx-auto w-full max-w-md space-y-2 text-center">
                          <label className="mx-auto inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                            Wybierz plik obrazu
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(event) => {
                                void handleImageFile(
                                  event.target.files?.[0] ?? null,
                                  (url) => {
                                    updateStation(index, { imageUrl: url });
                                    setStationImageError(stationKey, null);
                                  },
                                  (error) => setStationImageError(stationKey, error),
                                  async (file) => {
                                    const uploaded = await uploadStationImage(file).unwrap();
                                    return uploaded.url;
                                  },
                                );
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <p className="text-xs text-zinc-500">Obsługiwane: PNG, JPG, WEBP.</p>
                        </div>
                      )}

                      {imageMode === "paste" && (
                        <div
                          onPaste={(event) => {
                            void handleImagePaste(
                              event,
                              (url) => {
                                updateStation(index, { imageUrl: url });
                                setStationImageError(stationKey, null);
                              },
                              (error) => setStationImageError(stationKey, error),
                              async (file) => {
                                const uploaded = await uploadStationImage(file).unwrap();
                                return uploaded.url;
                              },
                            );
                          }}
                          className="mx-auto w-full max-w-md rounded-lg border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-3 text-center text-xs text-zinc-400"
                        >
                          Skopiuj obraz lub link i wklej tutaj (Ctrl+V).
                        </div>
                      )}

                      {imageMode === "url" && (
                        <input
                          type="url"
                          value={station.imageUrl}
                          onChange={(event) => {
                            updateStation(index, { imageUrl: event.target.value });
                            setStationImageError(stationKey, null);
                          }}
                          placeholder="https://..."
                          className="mx-auto block w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                        />
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-zinc-500">{station.imageUrl.trim() ? "Obraz ustawiony" : ""}</p>
                        {station.imageUrl.trim() && (
                          <button
                            type="button"
                            onClick={() => updateStation(index, { imageUrl: "" })}
                            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                          >
                            Wyczyść
                          </button>
                        )}
                      </div>

                      {imageError && <p className="text-xs text-red-300">{imageError}</p>}
                      {isUploadingImage && <p className="text-xs text-amber-300">Przesyłanie obrazu...</p>}
                    </div>
                  </div>
                  ) : null}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
                      <div className="flex items-center gap-2">
                        {[50, 100, 150, 200].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateStation(index, { points: value })}
                            className={`rounded-md border px-2.5 py-1 text-xs transition ${
                              station.points === value
                                ? "border-amber-300 bg-amber-400/20 text-amber-200"
                                : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={station.points}
                      onChange={(event) => updateStation(index, { points: Number(event.target.value) })}
                      className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                        showValidation && stationValidation.invalidPoints
                          ? "border-red-500/70 focus:border-red-400/80"
                          : "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                    {showValidation && stationValidation.invalidPoints ? (
                      <p className="text-xs text-red-300">Punkty muszą być większe od 0.</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu</span>
                    <div
                      className={`space-y-3 rounded-lg border bg-zinc-900 p-3 transition ${
                        showValidation && stationValidation.invalidTimeLimit
                          ? "border-red-500/70"
                          : "border-zinc-700"
                      } ${station.timeLimitSeconds === 0 ? "opacity-60" : "opacity-100"}`}
                    >
                      <p className="text-lg font-semibold leading-none text-zinc-100">{formatTimeLimit(station.timeLimitSeconds)}</p>
                      <input
                        type="range"
                        min={0}
                        max={600}
                        step={15}
                        value={station.timeLimitSeconds}
                        onChange={(event) => updateStation(index, { timeLimitSeconds: clampTimeLimitSeconds(Number(event.target.value)) })}
                        className="w-full accent-amber-400"
                      />
                      <input
                        type="number"
                        min={0}
                        max={600}
                        step={15}
                        value={station.timeLimitSeconds}
                        onChange={(event) => updateStation(index, { timeLimitSeconds: clampTimeLimitSeconds(Number(event.target.value)) })}
                        placeholder="0 = brak limitu"
                        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                          showValidation && stationValidation.invalidTimeLimit
                            ? "border-red-500/70 focus:border-red-400/80"
                            : "border-zinc-700 focus:border-amber-400/80"
                        }`}
                      />
                      <p className="text-xs text-zinc-500">Zakres: 0-10:00 (co 15 sek). Ustaw 0, aby wyłączyć limit czasu.</p>
                      {showValidation && stationValidation.invalidTimeLimit ? (
                        <p className="text-xs text-red-300">Limit czasu musi być w zakresie 0-600 sekund.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Szerokość geograficzna</span>
                        <input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        value={typeof station.latitude === "number" ? station.latitude : ""}
                        onChange={(event) =>
                          updateStation(index, {
                            latitude: event.target.value === "" ? undefined : Number(event.target.value),
                          })
                        }
                        placeholder="np. 52.22970"
                          className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                            showValidation && stationValidation.invalidCoordinates
                              ? "border-red-500/70 focus:border-red-400/80"
                              : "border-zinc-700 focus:border-amber-400/80"
                          }`}
                        />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Długość geograficzna</span>
                        <input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={typeof station.longitude === "number" ? station.longitude : ""}
                        onChange={(event) =>
                          updateStation(index, {
                            longitude: event.target.value === "" ? undefined : Number(event.target.value),
                          })
                        }
                        placeholder="np. 21.01220"
                          className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ${
                            showValidation && stationValidation.invalidCoordinates
                              ? "border-red-500/70 focus:border-red-400/80"
                              : "border-zinc-700 focus:border-amber-400/80"
                          }`}
                        />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Wybór na mapie (OpenStreetMap)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => requestCurrentLocation(index, stationKey)}
                          disabled={isLocating}
                          className="rounded-md border border-amber-400/60 px-2.5 py-1 text-xs text-amber-200 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLocating ? "Pobieranie..." : "Użyj mojej lokalizacji"}
                        </button>
                        {hasCoordinates && (
                          <button
                            type="button"
                            onClick={() => updateStation(index, { latitude: undefined, longitude: undefined })}
                            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                          >
                            Wyczyść GPS
                          </button>
                        )}
                      </div>
                    </div>
                    <RealizationLocationPickerMap
                      latitude={station.latitude}
                      longitude={station.longitude}
                      recenterToken={recenterToken}
                      onPick={({ latitude, longitude }) => {
                        updateStation(index, { latitude, longitude });
                        setStationLocationError(stationKey, null);
                      }}
                    />
                    <p className="text-xs text-zinc-500">Kliknij punkt na mapie, aby automatycznie uzupełnić szerokość i długość geograficzną.</p>
                    {showValidation && stationValidation.invalidCoordinates ? (
                      <p className="text-xs text-red-300">
                        Uzupełnij obie współrzędne razem i sprawdź zakres: szer. -90..90, dł. -180..180.
                      </p>
                    ) : null}
                    {locationError && <p className="text-xs text-red-300">{locationError}</p>}
                  </div>

                  <p className="text-xs text-zinc-500">
                    Jeśli uzupełnisz GPS, mobilka pokaże stanowisko w realnym miejscu zamiast generować pozycję zastępczą.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
