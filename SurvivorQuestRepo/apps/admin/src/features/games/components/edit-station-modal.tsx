"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type {
  ChallengeDifficulty,
  ChallengeDifficultyMode,
  Station,
  StationQuiz,
  StationTranslation,
  StationType,
} from "../types/station";
import { stationTypeOptions } from "../types/station";
import { useIsDirty } from "../../../shared/lib/use-is-dirty";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  type RealizationLanguage,
} from "../../realizations/types/realization";
import {
  useUpdateStationMutation,
  useDeleteStationMutation,
  useGetStationsQuery,
  useUploadStationAudioMutation,
  useUploadStationImageMutation,
} from "../api/station.api";
import { useTranslateRealizationTextsMutation } from "../../realizations/api/realization.api";
import {
  imageModeOptions,
  type ImageInputMode,
  clampTimeLimitSeconds,
  formatTimeLimit,
  handleImageFile,
  handleImagePaste,
  isCompletionCodeRequired,
  isQuizStationType,
  isWordPuzzleStationType,
  isImageSupportedStationType,
  isOpenQuizStationType,
  isValidCompletionCodeForMode,
  parseAcceptedAnswersInput,
  parseQrScanCodesInput,
  normalizeCompletionCode,
  generateSampleCompletionCode,
  createEmptyQuizAnswers,
  parseCaesarShiftInput,
  normalizeStationQuizForType,
  normalizeStationTranslations,
  QUIZ_ANSWER_COUNT,
  getQuizLikeStationCopy,
  resolveCompletionCodeGeneratorMode,
  isMatchingStationType,
  splitMatchingPairAnswer,
  joinMatchingPairAnswer,
  MEMORY_SYSTEM_STATION_PROMPT,
  MINI_SUDOKU_SYSTEM_STATION_PROMPT,
  MATCHING_SYSTEM_STATION_PROMPT,
  STRONG_PASSWORD_SYSTEM_STATION_PROMPT,
  generateSimonSequence,
  normalizeSimonSequenceInput,
  challengeDifficultyModeOptions,
  challengeDifficultyOptions,
  supportsChallengeDifficulty,
  hasVisibleQuizQuestionField,
  type CompletionCodeGeneratorMode,
  completionCodeModeOptions,
} from "../station.utils";

interface EditStationModalProps {
  station: Station;
  onClose: () => void;
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

const RealizationLocationPickerMap = dynamic(
  () => import("../../realizations/components/realization-location-picker-map").then((module) => module.RealizationLocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">
        Ładowanie mapy...
      </div>
    ),
  },
);

function resolveApiErrorMessage(error: unknown) {
  const base = error as FetchBaseQueryError & {
    data?: {
      message?: string | string[];
      error?: { message?: string; details?: unknown };
    };
    error?: string;
  };

  if (Array.isArray(base?.data?.message) && base.data.message.length > 0) {
    return base.data.message[0];
  }

  if (typeof base?.data?.message === "string" && base.data.message.trim()) {
    return base.data.message;
  }

  if (typeof base?.data?.error?.message === "string" && base.data.error.message.trim()) {
    return base.data.error.message;
  }

  if (Array.isArray(base?.data?.error?.details) && base.data.error.details.length > 0) {
    const firstDetail = base.data.error.details[0];
    if (typeof firstDetail === "string" && firstDetail.trim()) {
      return firstDetail;
    }
  }

  if (typeof base?.error === "string" && base.error.trim()) {
    return base.error;
  }

  return null;
}

function normalizeCategoryValue(value: string) {
  return value.trim();
}

function normalizeCategories(categories: string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const trimmed = normalizeCategoryValue(category);
    const dedupeKey = trimmed.toLocaleLowerCase();
    if (!trimmed || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(trimmed);
  }

  return normalized;
}

export function EditStationModal({ station, onClose }: EditStationModalProps) {
  const [updateStation, { isLoading: isUpdating }] = useUpdateStationMutation();
  const [deleteStation, { isLoading: isDeleting }] = useDeleteStationMutation();
  const [uploadStationImage, { isLoading: isUploadingImage }] = useUploadStationImageMutation();
  const [uploadStationAudio, { isLoading: isUploadingAudio }] = useUploadStationAudioMutation();
  const [translateRealizationTexts, { isLoading: isAutoTranslating }] = useTranslateRealizationTextsMutation();
  const [autoTranslateMessage, setAutoTranslateMessage] = useState<string | null>(null);
  const { data: allStations } = useGetStationsQuery();
  const qrEntryCodeSuggestions = useMemo(() => {
    const codes = new Set<string>();
    for (const item of allStations ?? []) {
      if (item.kind === "template" && item.qrEntryCode && item.id !== station.id) {
        codes.add(item.qrEntryCode);
      }
    }
    return Array.from(codes);
  }, [allStations, station.id]);

  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const [editAudioError, setEditAudioError] = useState<string | null>(null);
  const [editImageMode, setEditImageMode] = useState<ImageInputMode>("upload");
  const [editAudioMode, setEditAudioMode] = useState<"upload" | "url">("upload");
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [completionCodeMode, setCompletionCodeMode] = useState<CompletionCodeGeneratorMode>(
    resolveCompletionCodeGeneratorMode(station.completionCode ?? ""),
  );
  const [qrScanCodesInput, setQrScanCodesInput] = useState(
    (station.qrScanCodes ?? []).join("\n"),
  );
  const [qrEntryCode, setQrEntryCode] = useState("");
  const [caesarShiftInput, setCaesarShiftInput] = useState(
    station.quiz?.caesarShift !== undefined ? String(station.quiz.caesarShift) : "",
  );
  const [openQuizAcceptedAnswersInput, setOpenQuizAcceptedAnswersInput] = useState(
    (station.quiz?.acceptedAnswers ?? []).join("\n"),
  );
  const [translationAcceptedAnswersInputs, setTranslationAcceptedAnswersInputs] = useState<
    Partial<Record<RealizationLanguage, string>>
  >(() => {
    const initial: Partial<Record<RealizationLanguage, string>> = {};
    for (const language of supportedStationTranslationLanguages) {
      const accepted = station.translations?.[language]?.quiz?.acceptedAnswers;
      if (accepted?.length) {
        initial[language] = accepted.join("\n");
      }
    }
    return initial;
  });

  const [baseLanguage, setBaseLanguage] = useState<RealizationLanguage>("polish");
  const [editingLanguage, setEditingLanguage] = useState<RealizationLanguage>("polish");
  const editableLanguages = useMemo(
    () => [baseLanguage, ...supportedStationTranslationLanguages.filter((language) => language !== baseLanguage)],
    [baseLanguage],
  );

  const [editValues, setEditValues] = useState({
    name: station.name,
    type: station.type as StationType,
    categories: normalizeCategories(station.categories ?? []),
    description: station.description,
    imageUrl: station.imageUrl,
    points: station.points,
    timeLimitSeconds: station.timeLimitSeconds,
    completionCode: station.completionCode ?? "",
    quizQuestion:
      station.type === "memory" && !(station.quiz?.question ?? "").trim()
        ? MEMORY_SYSTEM_STATION_PROMPT
        : station.type === "mini-sudoku" && !(station.quiz?.question ?? "").trim()
          ? MINI_SUDOKU_SYSTEM_STATION_PROMPT
          : station.type === "matching" && !(station.quiz?.question ?? "").trim()
            ? MATCHING_SYSTEM_STATION_PROMPT
        : station.quiz?.question ?? "",
    quizAnswers: station.quiz?.answers?.length === QUIZ_ANSWER_COUNT ? station.quiz.answers : createEmptyQuizAnswers(),
    quizCorrectAnswerIndex: station.quiz?.correctAnswerIndex ?? 0,
    quizAudioUrl: station.quiz?.audioUrl ?? "",
    translations: station.translations,
    challengeDifficultyMode: station.challengeDifficultyMode as ChallengeDifficultyMode,
    challengeDifficulty: station.challengeDifficulty as ChallengeDifficulty,
    completionStopwatchEnabled: station.completionStopwatchEnabled,
    allowConcurrentTeams: station.allowConcurrentTeams,
    fastestCompletionBonusPoints: station.fastestCompletionBonusPoints,
    latitude: typeof station.latitude === "number" && Number.isFinite(station.latitude) ? station.latitude : undefined,
    longitude: typeof station.longitude === "number" && Number.isFinite(station.longitude) ? station.longitude : undefined,
  });
  const hasLatitude = typeof editValues.latitude === "number" && Number.isFinite(editValues.latitude);
  const hasLongitude = typeof editValues.longitude === "number" && Number.isFinite(editValues.longitude);
  const hasCoordinates = hasLatitude && hasLongitude;
  const quizLikeCopy = getQuizLikeStationCopy(editValues.type);

  const isEditingBaseLanguage = editingLanguage === baseLanguage;
  const activeTranslation = isEditingBaseLanguage ? undefined : editValues.translations?.[editingLanguage];
  const activeName = isEditingBaseLanguage ? editValues.name : activeTranslation?.name ?? "";
  const activeDescription = isEditingBaseLanguage ? editValues.description : activeTranslation?.description ?? "";
  const activeQuizQuestion = isEditingBaseLanguage ? editValues.quizQuestion : activeTranslation?.quiz?.question ?? "";
  const activeQuizAnswers = isEditingBaseLanguage
    ? editValues.quizAnswers
    : activeTranslation?.quiz?.answers?.length === QUIZ_ANSWER_COUNT
      ? activeTranslation.quiz.answers
      : createEmptyQuizAnswers();
  const activeQuizCorrectAnswerIndex = isEditingBaseLanguage
    ? editValues.quizCorrectAnswerIndex
    : activeTranslation?.quiz?.correctAnswerIndex ?? 0;
  const activeQuizAudioUrl = isEditingBaseLanguage ? editValues.quizAudioUrl : activeTranslation?.quiz?.audioUrl ?? "";
  const activeQuizAcceptedAnswersText = isEditingBaseLanguage
    ? openQuizAcceptedAnswersInput
    : translationAcceptedAnswersInputs[editingLanguage] ?? "";

  function updateActiveTranslation(patch: Partial<StationTranslation>) {
    setEditValues((prev) => {
      const currentTranslation = prev.translations?.[editingLanguage] ?? {};
      const nextTranslation: StationTranslation = { ...currentTranslation, ...patch };
      const hasValue =
        Boolean(nextTranslation.name?.trim()) ||
        Boolean(nextTranslation.description?.trim()) ||
        Boolean(nextTranslation.quiz);
      const nextTranslations = { ...(prev.translations ?? {}) };

      if (hasValue) {
        nextTranslations[editingLanguage] = nextTranslation;
      } else {
        delete nextTranslations[editingLanguage];
      }

      return {
        ...prev,
        translations: Object.keys(nextTranslations).length > 0 ? nextTranslations : undefined,
      };
    });
  }

  function setActiveName(value: string) {
    if (isEditingBaseLanguage) {
      setEditValues((prev) => ({ ...prev, name: value }));
      return;
    }
    updateActiveTranslation({ name: value });
  }

  function setActiveDescription(value: string) {
    if (isEditingBaseLanguage) {
      setEditValues((prev) => ({ ...prev, description: value }));
      return;
    }
    updateActiveTranslation({ description: value });
  }

  function setActiveQuizField(patch: {
    question?: string;
    answers?: string[];
    correctAnswerIndex?: number;
    audioUrl?: string;
  }) {
    if (isEditingBaseLanguage) {
      setEditValues((prev) => ({
        ...prev,
        ...(patch.question !== undefined ? { quizQuestion: patch.question } : {}),
        ...(patch.answers !== undefined ? { quizAnswers: patch.answers } : {}),
        ...(patch.correctAnswerIndex !== undefined ? { quizCorrectAnswerIndex: patch.correctAnswerIndex } : {}),
        ...(patch.audioUrl !== undefined ? { quizAudioUrl: patch.audioUrl } : {}),
      }));
      return;
    }

    const nextQuiz: StationQuiz = {
      question: patch.question ?? activeQuizQuestion,
      answers: patch.answers ?? activeQuizAnswers,
      correctAnswerIndex: patch.correctAnswerIndex ?? activeQuizCorrectAnswerIndex,
      audioUrl: (patch.audioUrl ?? activeQuizAudioUrl) || undefined,
    };
    updateActiveTranslation({ quiz: nextQuiz });
  }

  function setActiveQuizAcceptedAnswersText(value: string) {
    if (isEditingBaseLanguage) {
      setOpenQuizAcceptedAnswersInput(value);
      return;
    }
    setTranslationAcceptedAnswersInputs((prev) => ({ ...prev, [editingLanguage]: value }));
  }

  async function handleAutoTranslate() {
    if (isEditingBaseLanguage || editingLanguage === "other" || baseLanguage === "other") {
      return;
    }

    type PendingField =
      | { kind: "name" }
      | { kind: "description" }
      | { kind: "question" }
      | { kind: "answer"; answerIndex: number }
      | { kind: "matchingLeft"; pairIndex: number }
      | { kind: "matchingRight"; pairIndex: number };

    const pendingFields: PendingField[] = [];
    const texts: string[] = [];

    function queue(field: PendingField, text: string) {
      pendingFields.push(field);
      texts.push(text);
    }

    const hasQuiz = isQuizStationType(editValues.type);
    const nameFilled = Boolean(activeTranslation?.name?.trim());
    const descriptionFilled = Boolean(activeTranslation?.description?.trim());
    const questionFilled = Boolean(activeTranslation?.quiz?.question?.trim());
    const alreadyTranslated = hasQuiz
      ? nameFilled && descriptionFilled && questionFilled
      : nameFilled && descriptionFilled;

    if (alreadyTranslated) {
      setAutoTranslateMessage("To stanowisko ma już tłumaczenie dla tego języka.");
      return;
    }

    if (!nameFilled && editValues.name.trim()) {
      queue({ kind: "name" }, editValues.name);
    }
    if (!descriptionFilled && editValues.description.trim()) {
      queue({ kind: "description" }, editValues.description);
    }

    if (hasQuiz && !questionFilled && editValues.type !== "simon" && editValues.quizQuestion.trim()) {
      queue({ kind: "question" }, editValues.quizQuestion);

      if (editValues.type === "quiz" || editValues.type === "audio-quiz") {
        editValues.quizAnswers.forEach((answer, answerIndex) => {
          if (answer.trim()) {
            queue({ kind: "answer", answerIndex }, answer);
          }
        });
      } else if (isOpenQuizStationType(editValues.type)) {
        const correctAnswer = editValues.quizAnswers[0] ?? "";
        if (correctAnswer.trim()) {
          queue({ kind: "answer", answerIndex: 0 }, correctAnswer);
        }
      } else if (isMatchingStationType(editValues.type)) {
        editValues.quizAnswers.forEach((answer, pairIndex) => {
          const pair = splitMatchingPairAnswer(answer);
          if (pair.left) {
            queue({ kind: "matchingLeft", pairIndex }, pair.left);
          }
          if (pair.right) {
            queue({ kind: "matchingRight", pairIndex }, pair.right);
          }
        });
      }
      // word-puzzle types skip answers entirely: normalizeStationQuizForType always
      // rebuilds them from the translated question.
    }

    if (texts.length === 0) {
      setAutoTranslateMessage("Brak treści do przetłumaczenia w języku podstawowym.");
      return;
    }

    setAutoTranslateMessage(null);

    let translatedTexts: string[];
    try {
      const response = await translateRealizationTexts({
        sourceLanguage: baseLanguage,
        targetLanguage: editingLanguage,
        texts,
      }).unwrap();
      translatedTexts = response.texts;
    } catch {
      setAutoTranslateMessage("Nie udało się przetłumaczyć stanowiska. Sprawdź konfigurację auto-tłumacza i spróbuj ponownie.");
      return;
    }

    const patch: Partial<StationTranslation> = {};
    let translatedQuestion: string | undefined;
    const answers = createEmptyQuizAnswers();
    const matchingLeft = new Map<number, string>();
    const matchingRight = new Map<number, string>();

    pendingFields.forEach((field, position) => {
      const translated = translatedTexts[position]?.trim();
      if (!translated) {
        return;
      }

      if (field.kind === "name") {
        patch.name = translated;
      } else if (field.kind === "description") {
        patch.description = translated;
      } else if (field.kind === "question") {
        translatedQuestion = translated;
      } else if (field.kind === "answer") {
        answers[field.answerIndex] = translated;
      } else if (field.kind === "matchingLeft") {
        matchingLeft.set(field.pairIndex, translated);
      } else if (field.kind === "matchingRight") {
        matchingRight.set(field.pairIndex, translated);
      }
    });

    if (translatedQuestion) {
      const finalAnswers = isMatchingStationType(editValues.type)
        ? editValues.quizAnswers.map((originalAnswer, pairIndex) => {
            const originalPair = splitMatchingPairAnswer(originalAnswer);
            const left = matchingLeft.get(pairIndex) ?? originalPair.left;
            const right = matchingRight.get(pairIndex) ?? originalPair.right;
            return joinMatchingPairAnswer(left, right);
          })
        : answers;

      const translatedQuiz = normalizeStationQuizForType(editValues.type, {
        question: translatedQuestion,
        answers: finalAnswers,
        // Word-puzzle/memory/mini-sudoku/simon/open-quiz/matching types force
        // their own correctAnswerIndex below regardless of what's passed here
        // — but for a plain multi-choice quiz, this value passes straight
        // through, so hardcoding 0 was silently moving the "correct" answer
        // to whichever option happened to be first once translated.
        correctAnswerIndex: editValues.quizCorrectAnswerIndex,
        audioUrl: activeTranslation?.quiz?.audioUrl,
        acceptedAnswers: activeTranslation?.quiz?.acceptedAnswers,
      });

      if (translatedQuiz) {
        patch.quiz = translatedQuiz;
      }
    }

    if (Object.keys(patch).length > 0) {
      updateActiveTranslation(patch);
      setAutoTranslateMessage("Przetłumaczono stanowisko.");
    } else {
      setAutoTranslateMessage("Nie udało się uzupełnić żadnego pola — spróbuj ponownie.");
    }
  }

  const addCategory = () => {
    const nextCategory = normalizeCategoryValue(categoryInput);
    if (!nextCategory) {
      return;
    }

    setEditValues((prev) => ({
      ...prev,
      categories: normalizeCategories([...prev.categories, nextCategory]),
    }));
    setCategoryInput("");
  };

  const isDirty = useIsDirty({
    editValues,
    qrScanCodesInput,
    qrEntryCode,
    caesarShiftInput,
    openQuizAcceptedAnswersInput,
    translationAcceptedAnswersInputs,
    baseLanguage,
    editingLanguage,
    completionCodeMode,
    editImageMode,
    editAudioMode,
    editAudioFileName: editAudioFile?.name ?? null,
  });

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij edycję"
        onClick={() => {
          if (!isDirty) {
            onClose();
          }
        }}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-950 p-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Edytuj stanowisko</h2>
            <p className="mt-1 text-sm text-zinc-400">Zmieniasz dane stanowiska: {station.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
            <button
              type="submit"
              form="edit-station-form"
              disabled={isUpdating || isUploadingImage || isUploadingAudio}
              className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {isUpdating
                ? "Zapisywanie..."
                : isUploadingImage
                  ? "Przesyłanie obrazu..."
                  : isUploadingAudio
                    ? "Przesyłanie audio..."
                    : "Zapisz"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-5">
          <form
            id="edit-station-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setEditFormError(null);

              if (!editValues.name.trim() || editValues.points <= 0) {
                setEditFormError("Uzupełnij nazwę i poprawną liczbę punktów.");
                return;
              }

              if (!Number.isFinite(editValues.timeLimitSeconds) || editValues.timeLimitSeconds < 0) {
                setEditFormError("Podaj poprawny limit czasu w sekundach.");
                return;
              }

              if (isCompletionCodeRequired(editValues.type) && !isValidCompletionCodeForMode(editValues.completionCode, completionCodeMode)) {
                setEditFormError(
                  completionCodeMode === "digits"
                    ? "Dla trybu Cyfry kod musi mieć 3-32 znaki i zawierać tylko cyfry 0-9."
                    : "Dla stanowisk Na czas / Na punkty podaj kod (3-32 znaki: A-Z, 0-9, -).",
                );
                return;
              }

              if (editValues.type === "qr-hunt" && parseQrScanCodesInput(qrScanCodesInput).length === 0) {
                setEditFormError("Podaj co najmniej jeden kod QR.");
                return;
              }

              const quizConfig =
                isQuizStationType(editValues.type)
                  ? normalizeStationQuizForType(editValues.type, {
                      question:
                        editValues.type === "mini-sudoku"
                          ? MINI_SUDOKU_SYSTEM_STATION_PROMPT
                          : editValues.quizQuestion,
                      answers: editValues.quizAnswers,
                      correctAnswerIndex: editValues.quizCorrectAnswerIndex,
                      audioUrl: editValues.type === "audio-quiz" ? editValues.quizAudioUrl : undefined,
                      acceptedAnswers: isOpenQuizStationType(editValues.type)
                        ? parseAcceptedAnswersInput(openQuizAcceptedAnswersInput)
                        : undefined,
                      caesarShift:
                        editValues.type === "caesar-cipher" ? parseCaesarShiftInput(caesarShiftInput) : undefined,
                    })
                  : null;

              if (isQuizStationType(editValues.type) && !quizConfig) {
                setEditFormError(quizLikeCopy.validationMessage);
                return;
              }

              const nextLatitude =
                typeof editValues.latitude === "number" && Number.isFinite(editValues.latitude)
                  ? editValues.latitude
                  : undefined;
              const nextLongitude =
                typeof editValues.longitude === "number" && Number.isFinite(editValues.longitude)
                  ? editValues.longitude
                  : undefined;

              if ((nextLatitude === undefined) !== (nextLongitude === undefined)) {
                setEditFormError("Uzupełnij jednocześnie szerokość i długość geograficzną albo wyczyść oba pola.");
                return;
              }

              if (nextLatitude !== undefined && (nextLatitude < -90 || nextLatitude > 90)) {
                setEditFormError("Szerokość geograficzna musi mieścić się w zakresie od -90 do 90.");
                return;
              }

              if (nextLongitude !== undefined && (nextLongitude < -180 || nextLongitude > 180)) {
                setEditFormError("Długość geograficzna musi mieścić się w zakresie od -180 do 180.");
                return;
              }

              try {
                const translationsWithAcceptedAnswers = editValues.translations
                  ? (Object.fromEntries(
                      Object.entries(editValues.translations).map(([language, translation]) => {
                        if (!translation?.quiz || !isOpenQuizStationType(editValues.type)) {
                          return [language, translation];
                        }

                        return [
                          language,
                          {
                            ...translation,
                            quiz: {
                              ...translation.quiz,
                              acceptedAnswers: parseAcceptedAnswersInput(
                                translationAcceptedAnswersInputs[language as RealizationLanguage] ?? "",
                              ),
                            },
                          },
                        ];
                      }),
                    ) as typeof editValues.translations)
                  : undefined;

                await updateStation({
                  id: station.id,
                  name: editValues.name.trim(),
                  type: editValues.type,
                  categories: editValues.categories,
                  description: editValues.description.trim() || DEFAULT_STATION_DESCRIPTION,
                  imageUrl: isImageSupportedStationType(editValues.type) ? editValues.imageUrl.trim() || undefined : undefined,
                  points: editValues.points,
                  timeLimitSeconds:
                    editValues.type === "photo-task" ? 0 : clampTimeLimitSeconds(editValues.timeLimitSeconds),
                  completionCode: isCompletionCodeRequired(editValues.type)
                    ? normalizeCompletionCode(editValues.completionCode)
                    : undefined,
                  qrEntryCode: qrEntryCode.trim() ? qrEntryCode.trim().toUpperCase() : undefined,
                  qrScanCodes: editValues.type === "qr-hunt" ? parseQrScanCodesInput(qrScanCodesInput) : undefined,
                  quiz:
                    isQuizStationType(editValues.type) && quizConfig
                      ? {
                          ...quizConfig,
                          audioUrl: editValues.type === "audio-quiz" ? editValues.quizAudioUrl.trim() || undefined : undefined,
                        }
                      : undefined,
                  translations: normalizeStationTranslations(translationsWithAcceptedAnswers, editValues.type),
                  allowConcurrentTeams: editValues.allowConcurrentTeams,
                  challengeDifficultyMode: supportsChallengeDifficulty(editValues.type)
                    ? editValues.challengeDifficultyMode
                    : "admin",
                  challengeDifficulty: supportsChallengeDifficulty(editValues.type)
                    ? editValues.challengeDifficulty
                    : "medium",
                  completionStopwatchEnabled:
                    editValues.type !== "photo-task" && clampTimeLimitSeconds(editValues.timeLimitSeconds) === 0
                      ? editValues.completionStopwatchEnabled
                      : false,
                  fastestCompletionBonusPoints:
                    editValues.type !== "photo-task" &&
                    clampTimeLimitSeconds(editValues.timeLimitSeconds) === 0 &&
                    editValues.completionStopwatchEnabled
                      ? editValues.fastestCompletionBonusPoints
                      : 0,
                  latitude: nextLatitude,
                  longitude: nextLongitude,
                }).unwrap();
                onClose();
              } catch (error) {
                setEditFormError(resolveApiErrorMessage(error) ?? "Nie udało się zapisać zmian stanowiska.");
              }
            }}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
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
                  {supportedStationTranslationLanguages.map((language) => (
                    <option key={language} value={language}>
                      {getRealizationLanguageFlag(language)} {getRealizationLanguageLabel(language)}
                    </option>
                  ))}
                </select>
              </label>
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
                      setEditAudioFile(null);
                      setEditAudioError(null);
                    }
                  }}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
                >
                  {editableLanguages.map((language) => (
                    <option key={`editing-${language}`} value={language}>
                      {getRealizationLanguageFlag(language)} {getRealizationLanguageLabel(language)}
                      {language === baseLanguage ? " (podstawowy)" : ""}
                      {editValues.type === "audio-quiz" &&
                      (language === baseLanguage
                        ? editValues.quizAudioUrl
                        : editValues.translations?.[language]?.quiz?.audioUrl
                      )?.trim()
                        ? " 🔊"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleAutoTranslate()}
                disabled={isAutoTranslating || isEditingBaseLanguage || editingLanguage === "other" || baseLanguage === "other"}
                title={
                  isEditingBaseLanguage
                    ? "Wybierz inny język niż podstawowy, aby przetłumaczyć"
                    : editingLanguage === "other" || baseLanguage === "other"
                      ? "Auto-tłumaczenie jest niedostępne dla języka niestandardowego"
                      : undefined
                }
                className="rounded-md border border-amber-400/60 px-2.5 py-1 text-xs text-amber-200 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAutoTranslating ? "Tłumaczenie..." : "Auto-tłumacz"}
              </button>
            </div>
            {autoTranslateMessage ? (
              <p className="text-xs text-zinc-400">{autoTranslateMessage}</p>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa stanowiska</span>
              <input
                value={activeName}
                onChange={(event) => setActiveName(event.target.value)}
                placeholder="Nazwa stanowiska"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Typ stanowiska</span>
              <select
                value={editValues.type}
                onChange={(event) => {
                  const nextType = event.target.value as StationType;
                  if (nextType !== "qr-hunt") {
                    setQrScanCodesInput("");
                  }
                  if (nextType !== "open-quiz") {
                    setOpenQuizAcceptedAnswersInput("");
                  }
                  setEditValues((prev) => {
                    return {
                      ...prev,
                      type: nextType,
                      completionCode: isCompletionCodeRequired(nextType) ? prev.completionCode : "",
                      quizQuestion:
                        nextType === "memory" && !prev.quizQuestion.trim()
                          ? MEMORY_SYSTEM_STATION_PROMPT
                          : nextType === "mini-sudoku" && !prev.quizQuestion.trim()
                            ? MINI_SUDOKU_SYSTEM_STATION_PROMPT
                            : nextType === "matching" && !prev.quizQuestion.trim()
                              ? MATCHING_SYSTEM_STATION_PROMPT
                              : nextType === "strong-password" && !prev.quizQuestion.trim()
                                ? STRONG_PASSWORD_SYSTEM_STATION_PROMPT
                          : prev.quizQuestion,
                      timeLimitSeconds: nextType === "photo-task" ? 0 : prev.timeLimitSeconds,
                      completionStopwatchEnabled:
                        nextType === "photo-task" ? false : prev.completionStopwatchEnabled,
                      fastestCompletionBonusPoints:
                        nextType === "photo-task" ? 0 : prev.fastestCompletionBonusPoints,
                    };
                  });
                  if (!isCompletionCodeRequired(event.target.value as StationType)) {
                    setCompletionCodeMode("letters");
                  }
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              >
                {stationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {supportsChallengeDifficulty(editValues.type) ? (
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Poziom trudności</h3>
                <div className="flex flex-wrap gap-2">
                  {challengeDifficultyModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEditValues((prev) => ({ ...prev, challengeDifficultyMode: option.value }))}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        editValues.challengeDifficultyMode === option.value
                          ? "border-amber-400 bg-amber-400 text-zinc-950"
                          : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {editValues.challengeDifficultyMode === "admin" ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {challengeDifficultyOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEditValues((prev) => ({ ...prev, challengeDifficulty: option.value }))}
                        className={`rounded-lg border p-3 text-left transition ${
                          editValues.challengeDifficulty === option.value
                            ? "border-amber-400 bg-amber-400/10"
                            : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-zinc-100">{option.label}</span>
                        <span className="mt-1 block text-xs text-zinc-400">{option.description}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Gracz wybierze poziom przed startem. Punkty zależą od poziomu.</p>
                )}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Kategorie</span>
              <div className="flex gap-2">
                <input
                  value={categoryInput}
                  onChange={(event) => setCategoryInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    addCategory();
                  }}
                  placeholder="Wpisz kategorię i naciśnij Enter"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                >
                  Dodaj
                </button>
              </div>
              {editValues.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {editValues.categories.map((category, index) => (
                    <span
                      key={`${category}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() =>
                          setEditValues((prev) => ({
                            ...prev,
                            categories: prev.categories.filter((_, categoryIndex) => categoryIndex !== index),
                          }))
                        }
                        aria-label={`Usuń kategorię ${category}`}
                        className="rounded-full text-zinc-400 transition hover:text-zinc-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {isCompletionCodeRequired(editValues.type) ? (
              <label className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Kod zaliczenia</span>
                <div className="inline-flex w-fit rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                  {completionCodeModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCompletionCodeMode(option.value)}
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
                    value={editValues.completionCode}
                    onChange={(event) => {
                      const nextValue = event.target.value.toUpperCase();
                      setEditValues((prev) => ({ ...prev, completionCode: nextValue }));
                      setCompletionCodeMode(resolveCompletionCodeGeneratorMode(nextValue));
                    }}
                    placeholder={completionCodeMode === "digits" ? "Np. 2048" : "Np. CODE"}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditValues((prev) => ({
                        ...prev,
                        completionCode: generateSampleCompletionCode(4, completionCodeMode),
                      }))
                    }
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                  >
                    Wygeneruj
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Wymagany dla stanowisk Na czas i Na punkty. Kod mieszany będzie traktowany jak tryb literowy.</p>
              </label>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Kod QR wejścia</span>
              <div className="flex gap-2">
                <input
                  value={qrEntryCode}
                  onChange={(event) => setQrEntryCode(event.target.value.toUpperCase())}
                  list={`qr-entry-code-suggestions-${station.id}`}
                  placeholder={station.qrEntryCode ?? "Brak kodu"}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
                <datalist id={`qr-entry-code-suggestions-${station.id}`}>
                  {qrEntryCodeSuggestions.map((code) => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => setQrEntryCode(generateSampleCompletionCode(8, "letters"))}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                >
                  Wygeneruj
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Obecny kod: <span className="font-semibold text-zinc-300">{station.qrEntryCode ?? "brak"}</span>.
                Zostaw puste, aby nie zmieniać. Wybierz z podpowiedzi istniejący kod, aby ta sama naklejka QR pasowała
                też do tego stanowiska.
              </p>
            </label>

            {editValues.type === "qr-hunt" ? (
              <label className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Kody QR do zeskanowania</span>
                <textarea
                  rows={4}
                  value={qrScanCodesInput}
                  onChange={(event) => setQrScanCodesInput(event.target.value)}
                  placeholder={"Jeden kod na linię, np.\nSKRZYNKA-01\nDRZEWO-07"}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
                <p className="text-xs text-zinc-500">Drużyna musi zeskanować wszystkie kody, w dowolnej kolejności.</p>
              </label>
            ) : null}

            {isImageSupportedStationType(editValues.type) ? (
            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz stanowiska</span>
              <div className="space-y-3 rounded-xl border border-amber-400/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3">
                <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
                  <div className="flex h-40 items-center justify-center bg-zinc-900">
                    {editValues.imageUrl.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editValues.imageUrl}
                        alt="Podgląd obrazu stanowiska"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="h-full w-full" />
                    )}
                  </div>
                  <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2">
                    <p className="truncate text-xs text-zinc-300">
                      {editValues.imageUrl.trim() ? "Podgląd aktualnego obrazu stanowiska" : "Czeka na wybór obrazu"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                  {imageModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEditImageMode(option.value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        editImageMode === option.value
                          ? "bg-amber-400 text-zinc-950"
                          : "text-zinc-300 hover:text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  </div>
                </div>

                {editImageMode === "upload" && (
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
                            (url) => { setEditValues((prev) => ({ ...prev, imageUrl: url })); setEditImageError(null); },
                            setEditImageError,
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

                {editImageMode === "paste" && (
                  <div
                    onPaste={(event) => {
                      void handleImagePaste(
                        event,
                        (url) => { setEditValues((prev) => ({ ...prev, imageUrl: url })); setEditImageError(null); },
                        setEditImageError,
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

                {editImageMode === "url" && (
                  <input
                    type="url"
                    value={editValues.imageUrl}
                    onChange={(event) => {
                      setEditValues((prev) => ({ ...prev, imageUrl: event.target.value }));
                      setEditImageError(null);
                    }}
                    placeholder="https://..."
                    className="mx-auto block w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                )}

                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-zinc-500">
                    {editValues.imageUrl.trim() ? "Obraz ustawiony" : ""}
                  </p>
                  {editValues.imageUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setEditValues((prev) => ({ ...prev, imageUrl: "" }))}
                      className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                    >
                      Wyczyść
                    </button>
                  )}
                </div>

                {editImageError && <p className="text-sm text-red-300">{editImageError}</p>}
                {isUploadingImage && <p className="text-sm text-amber-300">Przesyłanie obrazu...</p>}
              </div>
            </div>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">
                {editValues.type === "photo-task"
                  ? "Polecenie (co należy sfotografować)"
                  : editValues.type === "qr-hunt"
                    ? "Wskazówka (gdzie szukać kodów QR)"
                    : "Opis"}
              </span>
              <textarea
                value={activeDescription}
                onChange={(event) => setActiveDescription(event.target.value)}
                rows={4}
                placeholder={
                  editValues.type === "photo-task"
                    ? "Np. Znajdź młotek i zrób jego zdjęcie"
                    : editValues.type === "qr-hunt"
                      ? "Np. Kody znajdziesz przy wejściach do budynków na trasie"
                      : "Opis stanowiska"
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            {isQuizStationType(editValues.type) ? (
              <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/70 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{quizLikeCopy.sectionTitle}</h3>
                {editValues.type === "audio-quiz" ? (
                  <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Audio (upload lub URL)</span>
                      <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditAudioMode("upload");
                            setEditAudioError(null);
                          }}
                          className={`rounded px-2.5 py-1 text-xs transition ${
                            editAudioMode === "upload" ? "bg-amber-400 text-zinc-950" : "text-zinc-300"
                          }`}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditAudioMode("url");
                            setEditAudioFile(null);
                            setEditAudioError(null);
                          }}
                          className={`rounded px-2.5 py-1 text-xs transition ${
                            editAudioMode === "url" ? "bg-amber-400 text-zinc-950" : "text-zinc-300"
                          }`}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {editAudioMode === "upload" ? (
                      <div className="space-y-2">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                          Wybierz plik audio
                          <input
                            type="file"
                            accept="audio/mpeg,audio/wav,audio/wave,audio/x-wav,audio/ogg,application/ogg,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/webm,.mp3,.wav,.ogg,.m4a,.aac,.webm"
                            className="hidden"
                            onChange={async (event) => {
                              const selected = event.target.files?.[0] ?? null;
                              event.currentTarget.value = "";
                              if (!selected) {
                                return;
                              }

                              setEditAudioFile(selected);
                              setEditAudioError(null);

                              try {
                                const uploaded = await uploadStationAudio(selected).unwrap();
                                setActiveQuizField({ audioUrl: uploaded.url });
                              } catch {
                                setEditAudioError("Nie udało się przesłać pliku audio.");
                              }
                            }}
                          />
                        </label>
                        <p className="text-xs text-zinc-500">
                          Obsługiwane: MP3, WAV, OGG, M4A, AAC, WEBM.{" "}
                          {editAudioFile ? `Wybrano: ${editAudioFile.name}` : "Brak wybranego pliku."}
                        </p>
                      </div>
                    ) : (
                      <label className="space-y-1.5">
                        <span className="text-xs uppercase tracking-wider text-zinc-400">URL audio (opcjonalny)</span>
                        <input
                          type="url"
                          value={activeQuizAudioUrl}
                          onChange={(event) => {
                            setActiveQuizField({ audioUrl: event.target.value });
                            setEditAudioError(null);
                          }}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                        />
                      </label>
                    )}

                    {editAudioError ? <p className="text-xs text-red-300">{editAudioError}</p> : null}
                    {isUploadingAudio ? <p className="text-xs text-amber-300">Przesyłanie audio...</p> : null}
                  </div>
                ) : null}
                {hasVisibleQuizQuestionField(editValues.type) ? (
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">{quizLikeCopy.questionLabel}</span>
                    <textarea
                      value={activeQuizQuestion}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        const nextValue =
                          editValues.type === "memory" && !rawValue.trim()
                            ? MEMORY_SYSTEM_STATION_PROMPT
                            : editValues.type === "matching" && !rawValue.trim()
                              ? MATCHING_SYSTEM_STATION_PROMPT
                            : editValues.type === "simon"
                              ? normalizeSimonSequenceInput(rawValue)
                              : rawValue;
                        setActiveQuizField({ question: nextValue });
                      }}
                      rows={2}
                      placeholder={quizLikeCopy.questionPlaceholder}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>
                ) : null}
                {editValues.type === "simon" ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                    <p className="text-xs text-zinc-500">Sekwencja Simon ma zawsze 10 cyfr (1-9).</p>
                    <button
                      type="button"
                      onClick={() => setActiveQuizField({ question: generateSimonSequence(10) })}
                      className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                    >
                      Generuj sekwencję
                    </button>
                  </div>
                ) : null}
                {editValues.type === "caesar-cipher" ? (
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">
                      Przesunięcie szyfru (1-25, opcjonalnie)
                    </span>
                    <input
                      value={caesarShiftInput}
                      onChange={(event) => setCaesarShiftInput(event.target.value)}
                      inputMode="numeric"
                      placeholder="Zostaw puste, aby wylosować stałe przesunięcie"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>
                ) : null}

                {!isWordPuzzleStationType(editValues.type) && !isMatchingStationType(editValues.type) && !isOpenQuizStationType(editValues.type) ? (
                  <div className="space-y-2">
                    {activeQuizAnswers.map((answer, index) => (
                      <label key={index} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
                        <input
                          type="radio"
                          name={`quiz-correct-answer-${station.id}`}
                          checked={activeQuizCorrectAnswerIndex === index}
                          onChange={() => setActiveQuizField({ correctAnswerIndex: index })}
                          className="h-4 w-4 accent-amber-400"
                        />
                        <input
                          value={answer}
                          onChange={(event) =>
                            setActiveQuizField({
                              answers: activeQuizAnswers.map((item, answerIndex) =>
                                answerIndex === index ? event.target.value : item,
                              ),
                            })
                          }
                          placeholder={`Odpowiedź ${index + 1}`}
                          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                {isOpenQuizStationType(editValues.type) ? (
                  <div className="space-y-3">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Poprawna odpowiedź</span>
                      <input
                        value={activeQuizAnswers[0] ?? ""}
                        onChange={(event) =>
                          setActiveQuizField({
                            answers: [event.target.value, ...activeQuizAnswers.slice(1)],
                          })
                        }
                        placeholder="Wpisz poprawną odpowiedź"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">
                        Dodatkowe akceptowane odpowiedzi (opcjonalnie)
                      </span>
                      <textarea
                        rows={3}
                        value={activeQuizAcceptedAnswersText}
                        onChange={(event) => setActiveQuizAcceptedAnswersText(event.target.value)}
                        placeholder={"Jedna odpowiedź na linię, np.\nWarszawa\nstolica Polski"}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>
                  </div>
                ) : null}
                {isMatchingStationType(editValues.type) ? (
                  <div className="space-y-2">
                    {activeQuizAnswers.map((answer, index) => {
                      const pair = splitMatchingPairAnswer(answer);
                      return (
                        <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
                          <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Para {index + 1}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={pair.left}
                              onChange={(event) =>
                                setActiveQuizField({
                                  answers: activeQuizAnswers.map((item, answerIndex) =>
                                    answerIndex === index
                                      ? joinMatchingPairAnswer(event.target.value, splitMatchingPairAnswer(item).right)
                                      : item,
                                  ),
                                })
                              }
                              placeholder="Lewa strona"
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                            />
                            <input
                              value={pair.right}
                              onChange={(event) =>
                                setActiveQuizField({
                                  answers: activeQuizAnswers.map((item, answerIndex) =>
                                    answerIndex === index
                                      ? joinMatchingPairAnswer(splitMatchingPairAnswer(item).left, event.target.value)
                                      : item,
                                  ),
                                })
                              }
                              placeholder="Prawa strona"
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
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
              </div>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
              <input
                type="number"
                min={1}
                value={editValues.points}
                onChange={(event) => setEditValues((prev) => ({ ...prev, points: Number(event.target.value) }))}
                placeholder="Punkty"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            {editValues.type !== "photo-task" ? (
              <div className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu</span>
                <div
                  className={`space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3 transition ${
                    editValues.timeLimitSeconds === 0 ? "opacity-60" : "opacity-100"
                  }`}
                >
                  <p className="text-lg font-semibold leading-none text-zinc-100">
                    {formatTimeLimit(editValues.timeLimitSeconds)}
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={600}
                    step={15}
                    value={editValues.timeLimitSeconds}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, timeLimitSeconds: clampTimeLimitSeconds(Number(event.target.value)) }))}
                    className="w-full accent-amber-400"
                  />
                  <input
                    type="number"
                    min={0}
                    max={600}
                    step={15}
                    value={editValues.timeLimitSeconds}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, timeLimitSeconds: clampTimeLimitSeconds(Number(event.target.value)) }))}
                    placeholder="0 = brak limitu"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                  <p className="text-xs text-zinc-500">Zakres: 0-10:00 (co 15 sek). Ustaw 0, aby wyłączyć limit czasu.</p>
                </div>
                {editValues.timeLimitSeconds === 0 ? (
                  <>
                    <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={editValues.completionStopwatchEnabled}
                        onChange={(event) =>
                          setEditValues((prev) => ({
                            ...prev,
                            completionStopwatchEnabled: event.target.checked,
                            fastestCompletionBonusPoints: event.target.checked ? prev.fastestCompletionBonusPoints : 0,
                          }))
                        }
                      />
                      Pokaż stoper czasu wykonania (dla graczy i organizatora)
                    </label>
                    {editValues.completionStopwatchEnabled ? (
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-zinc-400">
                          Bonus za najszybsze ukończenie
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={editValues.fastestCompletionBonusPoints}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              fastestCompletionBonusPoints: Math.max(0, Math.round(Number(event.target.value) || 0)),
                            }))
                          }
                          placeholder="0 = brak bonusu"
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                        />
                        <p className="text-xs text-zinc-500">
                          Dodatkowe punkty dla pierwszej drużyny, która ukończy to stanowisko.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={editValues.allowConcurrentTeams}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, allowConcurrentTeams: event.target.checked }))
                  }
                />
                Zezwól na jednoczesny start przez wiele drużyn
              </label>
              <p className="text-xs text-zinc-500">
                Domyślnie tylko jedna drużyna naraz może wykonywać to stanowisko. Zaznacz, aby kilka drużyn mogło je
                uruchomić jednocześnie (nie dotyczy stanowisk QR i zadań fotograficznych, które już działają
                współbieżnie).
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Współrzędne szablonu (domyślne)</span>
                {hasCoordinates && (
                  <button
                    type="button"
                    onClick={() => setEditValues((prev) => ({ ...prev, latitude: undefined, longitude: undefined }))}
                    className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                  >
                    Wyczyść współrzędne
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                To współrzędne domyślne dla szablonu stanowiska. Docelowe koordynaty w aplikacji mobilnej pochodzą z instancji
                realizacji.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Szerokość geograficzna</span>
                  <input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={hasLatitude ? editValues.latitude : ""}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        latitude: event.target.value === "" ? undefined : Number(event.target.value),
                      }))
                    }
                    placeholder="np. 52.22970"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Długość geograficzna</span>
                  <input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={hasLongitude ? editValues.longitude : ""}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        longitude: event.target.value === "" ? undefined : Number(event.target.value),
                      }))
                    }
                    placeholder="np. 21.01220"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>
              </div>

              <RealizationLocationPickerMap
                latitude={editValues.latitude}
                longitude={editValues.longitude}
                onPick={({ latitude, longitude }) => {
                  setEditValues((prev) => ({ ...prev, latitude, longitude }));
                }}
              />
              <p className="text-xs text-zinc-500">Kliknij punkt na mapie, aby automatycznie uzupełnić szerokość i długość geograficzną.</p>
            </div>

            {editFormError && <p className="text-sm text-red-300">{editFormError}</p>}
          </form>

          <section className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <h3 className="text-sm font-semibold text-red-200">Usuń stanowisko</h3>
            <p className="text-xs text-red-200/90">
              Aby usunąć stanowisko, wpisz dokładnie jego nazwę: <span className="font-semibold">{station.name}</span>
            </p>
            <input
              value={deleteConfirmName}
              onChange={(event) => {
                setDeleteConfirmName(event.target.value);
                setDeleteError(null);
              }}
              placeholder="Wpisz nazwę stanowiska do potwierdzenia"
              className="w-full rounded-lg border border-red-400/40 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-300"
            />
            <button
              type="button"
              disabled={isDeleting || deleteConfirmName.trim() !== station.name}
              onClick={async () => {
                setDeleteError(null);

                if (deleteConfirmName.trim() !== station.name) {
                  setDeleteError("Nazwa stanowiska nie zgadza się z potwierdzeniem.");
                  return;
                }

                try {
                  await deleteStation({
                    id: station.id,
                    confirmName: deleteConfirmName.trim(),
                  }).unwrap();
                  onClose();
                } catch {
                  setDeleteError("Nie udało się usunąć stanowiska.");
                }
              }}
              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Usuwanie..." : "Usuń stanowisko"}
            </button>
            {deleteError && <p className="text-sm text-red-200">{deleteError}</p>}
          </section>
        </div>
        </div>
      </aside>
    </>
  );
}
