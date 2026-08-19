"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ClipboardEvent } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type {
  ChallengeDifficulty,
  ChallengeDifficultyMode,
  Station,
  StationQuiz,
  StationTranslation,
  StationTranslations,
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
  useCreateStationMutation,
  useGetStationsQuery,
  useUploadStationAudioMutation,
  useUploadStationImageMutation,
} from "../api/station.api";
import { useTranslateRealizationTextsMutation } from "../../realizations/api/realization.api";
import {
  imageModeOptions,
  type ImageInputMode,
  looksLikeUrl,
  clampTimeLimitSeconds,
  formatTimeLimit,
  handleImageFile,
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
  resolveDefaultStationDescription,
  isKnownDefaultStationDescription,
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

type CreateStationFormProps = {
  onClose: () => void;
  onCreated?: (station: Station) => void;
};

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

export function CreateStationForm({ onClose, onCreated }: CreateStationFormProps) {
  const [createStation, { isLoading: isCreating }] = useCreateStationMutation();
  const [uploadStationImage, { isLoading: isUploadingImage }] = useUploadStationImageMutation();
  const [uploadStationAudio, { isLoading: isUploadingAudio }] = useUploadStationAudioMutation();
  const [translateRealizationTexts, { isLoading: isAutoTranslating }] = useTranslateRealizationTextsMutation();
  const [autoTranslateMessage, setAutoTranslateMessage] = useState<string | null>(null);
  const { data: allStations } = useGetStationsQuery();
  const qrEntryCodeSuggestions = useMemo(() => {
    const codes = new Set<string>();
    for (const item of allStations ?? []) {
      if (item.kind === "template" && item.qrEntryCode) {
        codes.add(item.qrEntryCode);
      }
    }
    return Array.from(codes);
  }, [allStations]);

  const [name, setName] = useState("");
  const [type, setType] = useState<StationType>("quiz");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [description, setDescription] = useState(resolveDefaultStationDescription("quiz"));
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [points, setPoints] = useState(100);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0);
  const [completionCode, setCompletionCode] = useState("");
  const [completionCodeMode, setCompletionCodeMode] = useState<CompletionCodeGeneratorMode>("letters");
  const [qrEntryCode, setQrEntryCode] = useState("");
  const [qrScanCodesInput, setQrScanCodesInput] = useState("");
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<string[]>(() => createEmptyQuizAnswers());
  const [quizCorrectAnswerIndex, setQuizCorrectAnswerIndex] = useState(0);
  const [quizAudioUrl, setQuizAudioUrl] = useState("");
  const [caesarShiftInput, setCaesarShiftInput] = useState("");
  const [openQuizAcceptedAnswersInput, setOpenQuizAcceptedAnswersInput] = useState("");
  const [translations, setTranslations] = useState<StationTranslations | undefined>(undefined);
  const [translationAcceptedAnswersInputs, setTranslationAcceptedAnswersInputs] = useState<
    Partial<Record<RealizationLanguage, string>>
  >({});
  const [baseLanguage, setBaseLanguage] = useState<RealizationLanguage>("polish");
  const [editingLanguage, setEditingLanguage] = useState<RealizationLanguage>("polish");
  const editableLanguages = useMemo(
    () => [baseLanguage, ...supportedStationTranslationLanguages.filter((language) => language !== baseLanguage)],
    [baseLanguage],
  );
  const [challengeDifficultyMode, setChallengeDifficultyMode] = useState<ChallengeDifficultyMode>("admin");
  const [challengeDifficulty, setChallengeDifficulty] = useState<ChallengeDifficulty>("medium");
  const [completionStopwatchEnabled, setCompletionStopwatchEnabled] = useState(false);
  const [allowConcurrentTeams, setAllowConcurrentTeams] = useState(false);
  const [fastestCompletionBonusPoints, setFastestCompletionBonusPoints] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [createImageMode, setCreateImageMode] = useState<ImageInputMode>("upload");
  const [createAudioMode, setCreateAudioMode] = useState<"upload" | "url">("upload");

  const previewImage = imageUrl.trim();
  const isBusy = isCreating || isUploadingImage || isUploadingAudio;
  const hasLatitude = typeof latitude === "number" && Number.isFinite(latitude);
  const hasLongitude = typeof longitude === "number" && Number.isFinite(longitude);
  const hasCoordinates = hasLatitude && hasLongitude;
  const quizLikeCopy = getQuizLikeStationCopy(type);

  const isEditingBaseLanguage = editingLanguage === baseLanguage;
  const activeTranslation = isEditingBaseLanguage ? undefined : translations?.[editingLanguage];
  const activeName = isEditingBaseLanguage ? name : activeTranslation?.name ?? "";
  const activeDescription = isEditingBaseLanguage ? description : activeTranslation?.description ?? "";
  const activeQuizQuestion = isEditingBaseLanguage ? quizQuestion : activeTranslation?.quiz?.question ?? "";
  const activeQuizAnswers = isEditingBaseLanguage
    ? quizAnswers
    : activeTranslation?.quiz?.answers?.length === QUIZ_ANSWER_COUNT
      ? activeTranslation.quiz.answers
      : createEmptyQuizAnswers();
  const activeQuizCorrectAnswerIndex = isEditingBaseLanguage
    ? quizCorrectAnswerIndex
    : activeTranslation?.quiz?.correctAnswerIndex ?? 0;
  const activeQuizAudioUrl = isEditingBaseLanguage ? quizAudioUrl : activeTranslation?.quiz?.audioUrl ?? "";
  const activeQuizAcceptedAnswersText = isEditingBaseLanguage
    ? openQuizAcceptedAnswersInput
    : translationAcceptedAnswersInputs[editingLanguage] ?? "";

  function updateActiveTranslation(patch: Partial<StationTranslation>) {
    setTranslations((prev) => {
      const currentTranslation = prev?.[editingLanguage] ?? {};
      const nextTranslation: StationTranslation = { ...currentTranslation, ...patch };
      const hasValue =
        Boolean(nextTranslation.name?.trim()) ||
        Boolean(nextTranslation.description?.trim()) ||
        Boolean(nextTranslation.quiz);
      const nextTranslations = { ...(prev ?? {}) };

      if (hasValue) {
        nextTranslations[editingLanguage] = nextTranslation;
      } else {
        delete nextTranslations[editingLanguage];
      }

      return Object.keys(nextTranslations).length > 0 ? nextTranslations : undefined;
    });
  }

  function setActiveName(value: string) {
    if (isEditingBaseLanguage) {
      setName(value);
      return;
    }
    updateActiveTranslation({ name: value });
  }

  function setActiveDescription(value: string) {
    if (isEditingBaseLanguage) {
      setDescription(value);
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
      if (patch.question !== undefined) {
        setQuizQuestion(patch.question);
      }
      if (patch.answers !== undefined) {
        setQuizAnswers(patch.answers);
      }
      if (patch.correctAnswerIndex !== undefined) {
        setQuizCorrectAnswerIndex(patch.correctAnswerIndex);
      }
      if (patch.audioUrl !== undefined) {
        setQuizAudioUrl(patch.audioUrl);
      }
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

    const hasQuiz = isQuizStationType(type);
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

    if (!nameFilled && name.trim()) {
      queue({ kind: "name" }, name);
    }
    if (!descriptionFilled && description.trim()) {
      queue({ kind: "description" }, description);
    }

    if (hasQuiz && !questionFilled && type !== "simon" && quizQuestion.trim()) {
      queue({ kind: "question" }, quizQuestion);

      if (type === "quiz" || type === "audio-quiz") {
        quizAnswers.forEach((answer, answerIndex) => {
          if (answer.trim()) {
            queue({ kind: "answer", answerIndex }, answer);
          }
        });
      } else if (isOpenQuizStationType(type)) {
        const correctAnswer = quizAnswers[0] ?? "";
        if (correctAnswer.trim()) {
          queue({ kind: "answer", answerIndex: 0 }, correctAnswer);
        }
      } else if (isMatchingStationType(type)) {
        quizAnswers.forEach((answer, pairIndex) => {
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
      const finalAnswers = isMatchingStationType(type)
        ? quizAnswers.map((originalAnswer, pairIndex) => {
            const originalPair = splitMatchingPairAnswer(originalAnswer);
            const left = matchingLeft.get(pairIndex) ?? originalPair.left;
            const right = matchingRight.get(pairIndex) ?? originalPair.right;
            return joinMatchingPairAnswer(left, right);
          })
        : answers;

      const translatedQuiz = normalizeStationQuizForType(type, {
        question: translatedQuestion,
        answers: finalAnswers,
        correctAnswerIndex: 0,
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

    setCategories((current) => normalizeCategories([...current, nextCategory]));
    setCategoryInput("");
  };

  const isDirty = useIsDirty({
    name,
    type,
    categories,
    description,
    imageUrl,
    imageFileName: imageFile?.name ?? null,
    points,
    timeLimitSeconds,
    completionCode,
    completionCodeMode,
    qrEntryCode,
    qrScanCodesInput,
    quizQuestion,
    quizAnswers,
    quizCorrectAnswerIndex,
    quizAudioUrl,
    openQuizAcceptedAnswersInput,
    translations,
    translationAcceptedAnswersInputs,
    baseLanguage,
    editingLanguage,
    challengeDifficultyMode,
    challengeDifficulty,
    completionStopwatchEnabled,
    allowConcurrentTeams,
    fastestCompletionBonusPoints,
    audioFileName: audioFile?.name ?? null,
    latitude,
    longitude,
    createImageMode,
    createAudioMode,
  });

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel tworzenia stanowiska"
        onClick={() => {
          if (!isDirty) {
            onClose();
          }
        }}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
        <form
          className="flex h-full min-h-0 flex-col"
          onSubmit={async (event) => {
            event.preventDefault();
            setFormError(null);

            if (!name.trim() || points <= 0) {
              setFormError("Uzupełnij nazwę i poprawną liczbę punktów.");
              return;
            }

            if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds < 0) {
              setFormError("Podaj poprawny limit czasu w sekundach.");
              return;
            }

            if (isCompletionCodeRequired(type) && !isValidCompletionCodeForMode(completionCode, completionCodeMode)) {
              setFormError(
                completionCodeMode === "digits"
                  ? "Dla trybu Cyfry kod musi mieć 3-32 znaki i zawierać tylko cyfry 0-9."
                  : "Dla stanowisk Na czas / Na punkty podaj kod (3-32 znaki: A-Z, 0-9, -).",
              );
              return;
            }

            if (type === "qr-hunt" && parseQrScanCodesInput(qrScanCodesInput).length === 0) {
              setFormError("Podaj co najmniej jeden kod QR.");
              return;
            }

              const quizConfig =
               isQuizStationType(type)
                 ? normalizeStationQuizForType(type, {
                     question: type === "mini-sudoku" ? MINI_SUDOKU_SYSTEM_STATION_PROMPT : quizQuestion,
                     answers: quizAnswers,
                     correctAnswerIndex: quizCorrectAnswerIndex,
                     audioUrl: type === "audio-quiz" ? quizAudioUrl : undefined,
                     acceptedAnswers: isOpenQuizStationType(type)
                       ? parseAcceptedAnswersInput(openQuizAcceptedAnswersInput)
                       : undefined,
                     caesarShift: type === "caesar-cipher" ? parseCaesarShiftInput(caesarShiftInput) : undefined,
                   })
                 : null;

            if (isQuizStationType(type) && !quizConfig) {
              setFormError(quizLikeCopy.validationMessage);
              return;
            }

            const nextLatitude = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : undefined;
            const nextLongitude = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : undefined;

            if ((nextLatitude === undefined) !== (nextLongitude === undefined)) {
              setFormError("Uzupełnij jednocześnie szerokość i długość geograficzną albo wyczyść oba pola.");
              return;
            }

            if (nextLatitude !== undefined && (nextLatitude < -90 || nextLatitude > 90)) {
              setFormError("Szerokość geograficzna musi mieścić się w zakresie od -90 do 90.");
              return;
            }

            if (nextLongitude !== undefined && (nextLongitude < -180 || nextLongitude > 180)) {
              setFormError("Długość geograficzna musi mieścić się w zakresie od -180 do 180.");
              return;
            }

            try {
              let nextImageUrl = imageUrl.trim();

              if (isImageSupportedStationType(type)) {
                if (createImageMode !== "url" && imageFile) {
                  const uploaded = await uploadStationImage(imageFile).unwrap();
                  nextImageUrl = uploaded.url;
                } else if (nextImageUrl.startsWith("data:image/")) {
                  nextImageUrl = "";
                }
              } else {
                nextImageUrl = "";
              }

              const translationsWithAcceptedAnswers = translations
                ? (Object.fromEntries(
                    Object.entries(translations).map(([language, translation]) => {
                      if (!translation?.quiz || !isOpenQuizStationType(type)) {
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
                  ) as StationTranslations)
                : undefined;

              const createdStation = await createStation({
                name: name.trim(),
                type,
                categories,
                description: description.trim() || resolveDefaultStationDescription(type),
                imageUrl: nextImageUrl || undefined,
                points,
                timeLimitSeconds: clampTimeLimitSeconds(timeLimitSeconds),
                completionCode: isCompletionCodeRequired(type) ? normalizeCompletionCode(completionCode) : undefined,
                qrEntryCode: qrEntryCode.trim() ? qrEntryCode.trim().toUpperCase() : undefined,
                qrScanCodes: type === "qr-hunt" ? parseQrScanCodesInput(qrScanCodesInput) : undefined,
                quiz:
                  isQuizStationType(type) && quizConfig
                    ? { ...quizConfig, audioUrl: type === "audio-quiz" ? quizAudioUrl.trim() || undefined : undefined }
                    : undefined,
                translations: normalizeStationTranslations(translationsWithAcceptedAnswers, type),
                challengeDifficultyMode: supportsChallengeDifficulty(type) ? challengeDifficultyMode : "admin",
                challengeDifficulty: supportsChallengeDifficulty(type) ? challengeDifficulty : "medium",
                completionStopwatchEnabled: clampTimeLimitSeconds(timeLimitSeconds) === 0 ? completionStopwatchEnabled : false,
                allowConcurrentTeams,
                fastestCompletionBonusPoints:
                  clampTimeLimitSeconds(timeLimitSeconds) === 0 && completionStopwatchEnabled
                    ? fastestCompletionBonusPoints
                    : 0,
                latitude: nextLatitude,
                longitude: nextLongitude,
              }).unwrap();
              onCreated?.(createdStation);
              setName("");
              setType("quiz");
              setCategories([]);
              setCategoryInput("");
              setDescription(resolveDefaultStationDescription("quiz"));
              setImageUrl("");
              setImageFile(null);
              setPoints(100);
              setTimeLimitSeconds(0);
              setCompletionCode("");
              setQrEntryCode("");
              setQrScanCodesInput("");
              setOpenQuizAcceptedAnswersInput("");
              setTranslations(undefined);
              setTranslationAcceptedAnswersInputs({});
              setBaseLanguage("polish");
              setEditingLanguage("polish");
              setQuizQuestion("");
              setQuizAnswers(createEmptyQuizAnswers());
              setQuizCorrectAnswerIndex(0);
              setQuizAudioUrl("");
              setAudioFile(null);
              setChallengeDifficultyMode("admin");
              setChallengeDifficulty("medium");
              setCompletionStopwatchEnabled(false);
              setAllowConcurrentTeams(false);
              setFastestCompletionBonusPoints(0);
              setLatitude(undefined);
              setLongitude(undefined);
              setCreateImageMode("upload");
              setCreateAudioMode("upload");
              onClose();
            } catch (error) {
              setFormError(resolveApiErrorMessage(error) ?? "Nie udało się utworzyć stanowiska.");
            }
          }}
        >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 p-4 sm:px-6">
        <h2 className="text-lg font-semibold">Nowe stanowisko</h2>
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
            disabled={isBusy}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {isCreating ? "Dodawanie..." : isUploadingImage ? "Przesyłanie obrazu..." : "Dodaj stanowisko"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="grid gap-4">
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
                    setAudioFile(null);
                    setAudioError(null);
                  }
                }}
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
              >
                {editableLanguages.map((language) => (
                  <option key={`editing-${language}`} value={language}>
                    {getRealizationLanguageFlag(language)} {getRealizationLanguageLabel(language)}
                    {language === baseLanguage ? " (podstawowy)" : ""}
                    {type === "audio-quiz" &&
                    (language === baseLanguage ? quizAudioUrl : translations?.[language]?.quiz?.audioUrl)?.trim()
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
              placeholder="Np. Night Mission"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Typ stanowiska</span>
            <select
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as StationType;
                const previousDefault = resolveDefaultStationDescription(type);
                const nextDefault = resolveDefaultStationDescription(nextType);
                setType(nextType);
                if (!description.trim() || isKnownDefaultStationDescription(description) || description.trim() === previousDefault) {
                  setDescription(nextDefault);
                }
                if (!isCompletionCodeRequired(nextType)) {
                  setCompletionCode("");
                  setCompletionCodeMode("letters");
                }
                if (nextType !== "qr-hunt") {
                  setQrScanCodesInput("");
                }
                if (nextType !== "open-quiz") {
                  setOpenQuizAcceptedAnswersInput("");
                }
                if (nextType === "memory" && !quizQuestion.trim()) {
                  setQuizQuestion(MEMORY_SYSTEM_STATION_PROMPT);
                }
                if (nextType === "mini-sudoku" && !quizQuestion.trim()) {
                  setQuizQuestion(MINI_SUDOKU_SYSTEM_STATION_PROMPT);
                }
                if (nextType === "matching" && !quizQuestion.trim()) {
                  setQuizQuestion(MATCHING_SYSTEM_STATION_PROMPT);
                }
                if (nextType === "strong-password" && !quizQuestion.trim()) {
                  setQuizQuestion(STRONG_PASSWORD_SYSTEM_STATION_PROMPT);
                }
                if (nextType === "photo-task") {
                  setTimeLimitSeconds(0);
                  setCompletionStopwatchEnabled(false);
                  setFastestCompletionBonusPoints(0);
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

          {supportsChallengeDifficulty(type) ? (
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Poziom trudności</h3>
              <div className="flex flex-wrap gap-2">
                {challengeDifficultyModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChallengeDifficultyMode(option.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      challengeDifficultyMode === option.value
                        ? "border-amber-400 bg-amber-400 text-zinc-950"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {challengeDifficultyMode === "admin" ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {challengeDifficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setChallengeDifficulty(option.value)}
                      className={`rounded-lg border p-3 text-left transition ${
                        challengeDifficulty === option.value
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
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <span
                    key={`${category}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() =>
                        setCategories((current) => current.filter((_, categoryIndex) => categoryIndex !== index))
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

          {isCompletionCodeRequired(type) ? (
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
                    value={completionCode}
                    onChange={(event) => {
                      const nextValue = event.target.value.toUpperCase();
                      setCompletionCode(nextValue);
                      setCompletionCodeMode(resolveCompletionCodeGeneratorMode(nextValue));
                    }}
                    placeholder={completionCodeMode === "digits" ? "Np. 2048" : "Np. CODE"}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                  <button
                    type="button"
                    onClick={() => setCompletionCode(generateSampleCompletionCode(4, completionCodeMode))}
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
                list="qr-entry-code-suggestions"
                placeholder="Zostaw puste, aby wygenerować automatycznie"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
              <datalist id="qr-entry-code-suggestions">
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
              Zostaw puste, aby system wygenerował nowy losowy kod. Wybierz z podpowiedzi istniejący kod, aby ta sama
              naklejka QR pasowała też do tego stanowiska.
            </p>
          </label>

          {type === "qr-hunt" ? (
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

          {isImageSupportedStationType(type) ? (
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz stanowiska (URL opcjonalny)</span>
            <div className="space-y-3 rounded-xl border border-amber-400/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3">
                <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
                  <div className="flex h-40 items-center justify-center bg-zinc-900">
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImage} alt="Podgląd obrazu stanowiska" className="h-full w-full object-cover" />
                  ) : (
                    <span className="h-full w-full" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-950 px-3 py-2">
                  <p className="truncate text-xs text-zinc-300">
                    {imageFile ? `Wybrano plik: ${imageFile.name}` : previewImage ? "Podgląd URL obrazu" : "Czeka na wybór obrazu"}
                  </p>
                  {imageFile && (
                    <span className="rounded-full border border-amber-300/50 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                      Wyślemy przy zapisie
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                {imageModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setCreateImageMode(option.value);
                      if (option.value === "url") {
                        setImageFile(null);
                        if (imageUrl.trim().startsWith("data:image/")) {
                          setImageUrl("");
                        }
                      }
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      createImageMode === option.value
                        ? "bg-amber-400 text-zinc-950"
                        : "text-zinc-300 hover:text-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                </div>
              </div>

              {createImageMode === "upload" && (
                <div className="mx-auto w-full max-w-md space-y-2 text-center">
                  <label className="mx-auto inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                    Wybierz plik obrazu
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0] ?? null;
                        setImageFile(selectedFile);
                        void handleImageFile(
                          selectedFile,
                          (url) => { setImageUrl(url); setImageError(null); },
                          setImageError,
                        );
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <p className="text-xs text-zinc-500">Obsługiwane: PNG, JPG, WEBP.</p>
                </div>
              )}

              {createImageMode === "paste" && (
                <div
                  onPaste={(event) => {
                    const handlePaste = async (clipboardEvent: ClipboardEvent<HTMLDivElement>) => {
                      const fileItem = Array.from(clipboardEvent.clipboardData.items).find((item) =>
                        item.type.startsWith("image/"),
                      );

                      if (fileItem) {
                        clipboardEvent.preventDefault();
                        const pastedFile = fileItem.getAsFile();
                        setImageFile(pastedFile);
                        await handleImageFile(
                          pastedFile,
                          (url) => { setImageUrl(url); setImageError(null); },
                          setImageError,
                        );
                        return;
                      }

                      const text = clipboardEvent.clipboardData.getData("text");
                      if (text && looksLikeUrl(text)) {
                        clipboardEvent.preventDefault();
                        setImageFile(null);
                        setImageUrl(text.trim());
                        setImageError(null);
                        return;
                      }

                      setImageError("Wklej obraz lub poprawny URL.");
                    };

                    void handlePaste(event);
                  }}
                  className="mx-auto w-full max-w-md rounded-lg border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-3 text-center text-xs text-zinc-400"
                >
                  Skopiuj obraz lub link i wklej tutaj (Ctrl+V).
                </div>
              )}

              {createImageMode === "url" && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => {
                    setImageFile(null);
                    setImageUrl(event.target.value);
                    setImageError(null);
                  }}
                  placeholder="https://..."
                  className="mx-auto block w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-zinc-500">
                  {imageFile
                    ? "Obraz wybrany (zostanie wysłany przy dodawaniu stanowiska)"
                    : imageUrl.trim()
                      ? "Obraz ustawiony"
                      : ""}
                </p>
                {imageUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl("");
                      setImageFile(null);
                    }}
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

          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              {type === "photo-task"
                ? "Polecenie (co należy sfotografować)"
                : type === "qr-hunt"
                  ? "Wskazówka (gdzie szukać kodów QR)"
                  : "Opis (opcjonalny)"}
            </span>
            <textarea
              value={activeDescription}
              onChange={(event) => setActiveDescription(event.target.value)}
              placeholder={
                type === "photo-task"
                  ? "Np. Znajdź młotek i zrób jego zdjęcie"
                  : type === "qr-hunt"
                    ? "Np. Kody znajdziesz przy wejściach do budynków na trasie"
                    : "Krótki opis stanowiska"
              }
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>

          {isQuizStationType(type) ? (
            <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{quizLikeCopy.sectionTitle}</h3>
              {type === "audio-quiz" ? (
                <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Audio (upload lub URL)</span>
                    <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateAudioMode("upload");
                          setAudioError(null);
                        }}
                        className={`rounded px-2.5 py-1 text-xs transition ${
                          createAudioMode === "upload" ? "bg-amber-400 text-zinc-950" : "text-zinc-300"
                        }`}
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateAudioMode("url");
                          setAudioFile(null);
                          setAudioError(null);
                        }}
                        className={`rounded px-2.5 py-1 text-xs transition ${
                          createAudioMode === "url" ? "bg-amber-400 text-zinc-950" : "text-zinc-300"
                        }`}
                      >
                        URL
                      </button>
                    </div>
                  </div>

                  {createAudioMode === "upload" ? (
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

                            setAudioFile(selected);
                            setAudioError(null);

                            try {
                              const uploaded = await uploadStationAudio(selected).unwrap();
                              setActiveQuizField({ audioUrl: uploaded.url });
                            } catch {
                              setAudioError("Nie udało się przesłać pliku audio.");
                            }
                          }}
                        />
                      </label>
                      <p className="text-xs text-zinc-500">
                        Obsługiwane: MP3, WAV, OGG, M4A, AAC, WEBM. {audioFile ? `Wybrano: ${audioFile.name}` : "Brak wybranego pliku."}
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
                          setAudioError(null);
                        }}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>
                  )}

                  {audioError ? <p className="text-xs text-red-300">{audioError}</p> : null}
                  {isUploadingAudio ? <p className="text-xs text-amber-300">Przesyłanie audio...</p> : null}
                </div>
              ) : null}
              {hasVisibleQuizQuestionField(type) ? (
                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">{quizLikeCopy.questionLabel}</span>
                  <textarea
                    value={activeQuizQuestion}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const nextValue =
                        type === "memory" && !rawValue.trim()
                          ? MEMORY_SYSTEM_STATION_PROMPT
                          : type === "matching" && !rawValue.trim()
                            ? MATCHING_SYSTEM_STATION_PROMPT
                          : type === "simon"
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
              {type === "simon" ? (
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
              {type === "caesar-cipher" ? (
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

              {!isWordPuzzleStationType(type) && !isMatchingStationType(type) && !isOpenQuizStationType(type) ? (
                <div className="space-y-2">
                  {activeQuizAnswers.map((answer, index) => (
                    <label key={index} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
                      <input
                        type="radio"
                        name="quiz-correct-answer-create"
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
              {isOpenQuizStationType(type) ? (
                <div className="space-y-3">
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Poprawna odpowiedź</span>
                    <input
                      value={activeQuizAnswers[0] ?? ""}
                      onChange={(event) =>
                        setActiveQuizField({ answers: [event.target.value, ...activeQuizAnswers.slice(1)] })
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
              {isMatchingStationType(type) ? (
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
                                  answerIndex === index ? joinMatchingPairAnswer(event.target.value, splitMatchingPairAnswer(item).right) : item,
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
                                  answerIndex === index ? joinMatchingPairAnswer(splitMatchingPairAnswer(item).left, event.target.value) : item,
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
              <div className="flex items-center gap-2">
                {[50, 100, 150, 200].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPoints(value)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition ${
                      points === value
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
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
              placeholder="Punkty za wykonanie"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </div>

          {type !== "photo-task" ? (
            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu</span>
              <div
                className={`space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3 transition ${
                  timeLimitSeconds === 0 ? "opacity-60" : "opacity-100"
                }`}
              >
                <p className="text-lg font-semibold leading-none text-zinc-100">{formatTimeLimit(timeLimitSeconds)}</p>
                <input
                  type="range"
                  min={0}
                  max={600}
                  step={15}
                  value={timeLimitSeconds}
                  onChange={(event) => setTimeLimitSeconds(clampTimeLimitSeconds(Number(event.target.value)))}
                  className="w-full accent-amber-400"
                />
                <input
                  type="number"
                  min={0}
                  max={600}
                  step={15}
                  value={timeLimitSeconds}
                  onChange={(event) => setTimeLimitSeconds(clampTimeLimitSeconds(Number(event.target.value)))}
                  placeholder="0 = brak limitu"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
                <p className="text-xs text-zinc-500">Zakres: 0-10:00 (co 15 sek). Ustaw 0, aby wyłączyć limit czasu.</p>
              </div>
              {timeLimitSeconds === 0 ? (
                <>
                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={completionStopwatchEnabled}
                      onChange={(event) => {
                        setCompletionStopwatchEnabled(event.target.checked);
                        if (!event.target.checked) {
                          setFastestCompletionBonusPoints(0);
                        }
                      }}
                    />
                    Pokaż stoper czasu wykonania (dla graczy i organizatora)
                  </label>
                  {completionStopwatchEnabled ? (
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-zinc-400">
                        Bonus za najszybsze ukończenie
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={fastestCompletionBonusPoints}
                        onChange={(event) =>
                          setFastestCompletionBonusPoints(Math.max(0, Math.round(Number(event.target.value) || 0)))
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
                checked={allowConcurrentTeams}
                onChange={(event) => setAllowConcurrentTeams(event.target.checked)}
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
                  onClick={() => {
                    setLatitude(undefined);
                    setLongitude(undefined);
                  }}
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
                  value={hasLatitude ? latitude : ""}
                  onChange={(event) => {
                    setLatitude(event.target.value === "" ? undefined : Number(event.target.value));
                  }}
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
                  value={hasLongitude ? longitude : ""}
                  onChange={(event) => {
                    setLongitude(event.target.value === "" ? undefined : Number(event.target.value));
                  }}
                  placeholder="np. 21.01220"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
              </label>
            </div>

            <RealizationLocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onPick={({ latitude: pickedLatitude, longitude: pickedLongitude }) => {
                setLatitude(pickedLatitude);
                setLongitude(pickedLongitude);
              }}
            />
            <p className="text-xs text-zinc-500">Kliknij punkt na mapie, aby automatycznie uzupełnić szerokość i długość geograficzną.</p>
          </div>
        </div>

        {formError && <p className="text-sm text-red-300">{formError}</p>}
        </div>
      </div>
        </form>
      </aside>
    </>
  );
}
