"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { stationTypeOptions, type Station } from "@/features/games/types/station";
import { useUploadStationImageMutation } from "@/features/games/api/station.api";
import {
  clampTimeLimitSeconds,
  createEmptyQuizAnswers,
  normalizeStationQuiz,
  QUIZ_ANSWER_COUNT,
  isCompletionCodeRequired,
  isValidCompletionCode,
  formatTimeLimit,
  handleImageFile,
  handleImagePaste,
  imageModeOptions,
  normalizeCompletionCode,
  generateSampleCompletionCode,
  type ImageInputMode,
} from "@/features/games/station.utils";
import type { RealizationStationDraft } from "../types/realization";

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
}

export function createEmptyRealizationStationDraft(): RealizationStationDraft {
  return {
    name: "",
    type: "quiz",
    description: "",
    imageUrl: "",
    points: 100,
    timeLimitSeconds: 0,
    completionCode: "",
    quiz: {
      question: "",
      answers: createEmptyQuizAnswers(),
      correctAnswerIndex: 0,
    },
    latitude: undefined,
    longitude: undefined,
  };
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
          question: station.quiz.question,
          answers: station.quiz.answers,
          correctAnswerIndex: station.quiz.correctAnswerIndex,
        }
      : {
          question: "",
          answers: createEmptyQuizAnswers(),
          correctAnswerIndex: 0,
        },
    latitude: station.latitude,
    longitude: station.longitude,
  };
}

export function normalizeRealizationStationDrafts(stations: RealizationStationDraft[]) {
  return stations.map((station) => ({
    id: station.id,
    name: station.name.trim(),
    type: station.type,
    description: station.description.trim(),
    imageUrl: station.imageUrl.trim(),
    points: Math.round(station.points),
    timeLimitSeconds: Math.round(station.timeLimitSeconds),
    completionCode: isCompletionCodeRequired(station.type) ? normalizeCompletionCode(station.completionCode ?? "") : undefined,
    quiz:
      station.type === "quiz" && station.quiz
        ? normalizeStationQuiz(station.quiz) ?? undefined
        : undefined,
    latitude: typeof station.latitude === "number" && Number.isFinite(station.latitude) ? station.latitude : undefined,
    longitude: typeof station.longitude === "number" && Number.isFinite(station.longitude) ? station.longitude : undefined,
  }));
}

export function hasInvalidRealizationStationDrafts(stations: RealizationStationDraft[]) {
  return stations.some((station) => {
    if (!station.name.trim() || !station.description.trim()) {
      return true;
    }

    if (!Number.isFinite(station.points) || station.points <= 0) {
      return true;
    }

    if (!Number.isFinite(station.timeLimitSeconds) || station.timeLimitSeconds < 0 || station.timeLimitSeconds > 600) {
      return true;
    }

    if (isCompletionCodeRequired(station.type) && !isValidCompletionCode(station.completionCode ?? "")) {
      return true;
    }

    if (station.type === "quiz") {
      if (!station.quiz || !normalizeStationQuiz(station.quiz)) {
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

export function RealizationStationsEditor({ stations, onChange }: RealizationStationsEditorProps) {
  const [expandedStationIndex, setExpandedStationIndex] = useState<number | null>(null);
  const [stationImageModes, setStationImageModes] = useState<Record<string, ImageInputMode>>({});
  const [stationImageErrors, setStationImageErrors] = useState<Record<string, string>>({});
  const [stationLocationErrors, setStationLocationErrors] = useState<Record<string, string>>({});
  const [stationLocationLoading, setStationLocationLoading] = useState<Record<string, boolean>>({});
  const [stationMapRecenterTokens, setStationMapRecenterTokens] = useState<Record<string, number>>({});
  const [uploadStationImage, { isLoading: isUploadingImage }] = useUploadStationImageMutation();

  const stationTypeLabelByValue = useMemo(
    () => new Map(stationTypeOptions.map((option) => [option.value, option.label])),
    [],
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

  function updateStation(index: number, patch: Partial<RealizationStationDraft>) {
    onChange(stations.map((station, currentIndex) => (currentIndex === index ? { ...station, ...patch } : station)));
  }

  function getStationKey(index: number, station: RealizationStationDraft) {
    return station.id ?? `new-${index}`;
  }

  function setStationImageMode(stationKey: string, mode: ImageInputMode) {
    setStationImageModes((current) => ({ ...current, [stationKey]: mode }));
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
    <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Stanowiska realizacji</legend>
        <button
          type="button"
          onClick={addStation}
          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
        >
          + Dodaj stanowisko
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
          const imageError = stationImageErrors[stationKey];
          const locationError = stationLocationErrors[stationKey];
          const isLocating = stationLocationLoading[stationKey] === true;
          const recenterToken = stationMapRecenterTokens[stationKey];
          const hasCoordinates =
            typeof station.latitude === "number" &&
            Number.isFinite(station.latitude) &&
            typeof station.longitude === "number" &&
            Number.isFinite(station.longitude);

          return (
            <div key={station.id ?? `new-${index}`} className="rounded-lg border border-zinc-700 bg-zinc-950/70">
              <div className="flex items-start justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setExpandedStationIndex((current) => (current === index ? null : index))}
                  className="flex-1 text-left"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <span className="inline-flex min-w-9 justify-center rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs font-semibold text-zinc-300">
                      #{index + 1}
                    </span>
                    <span>{station.name.trim() || `Stanowisko ${index + 1}`}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {stationTypeLabelByValue.get(station.type) ?? "Quiz"} • {Number.isFinite(station.points) ? station.points : 0} pkt •{" "}
                    {Number.isFinite(station.timeLimitSeconds) ? station.timeLimitSeconds : 0}s •{" "}
                    {typeof station.latitude === "number" && typeof station.longitude === "number"
                      ? `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`
                      : "brak GPS"}
                  </p>
                </button>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
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
                        value={station.name}
                        onChange={(event) => updateStation(index, { name: event.target.value })}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Typ stanowiska</span>
                      <select
                        value={station.type}
                        onChange={(event) => {
                          const nextType = event.target.value as RealizationStationDraft["type"];
                          updateStation(index, {
                            type: nextType,
                            completionCode: isCompletionCodeRequired(nextType) ? station.completionCode : "",
                            quiz:
                              nextType === "quiz"
                                ? station.quiz ?? {
                                    question: "",
                                    answers: createEmptyQuizAnswers(),
                                    correctAnswerIndex: 0,
                                  }
                                : station.quiz,
                          });
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
                      <div className="flex gap-2">
                        <input
                          value={station.completionCode ?? ""}
                          onChange={(event) => updateStation(index, { completionCode: event.target.value.toUpperCase() })}
                          placeholder="Np. TIME-2048"
                          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                        />
                        <button
                          type="button"
                          onClick={() => updateStation(index, { completionCode: generateSampleCompletionCode() })}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                        >
                          Wygeneruj
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500">Wymagany dla stanowisk Na czas i Na punkty.</p>
                    </label>
                  ) : null}

                  {station.type === "quiz" ? (
                    <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pytanie i odpowiedzi</h3>
                      <label className="space-y-1.5">
                        <span className="text-xs uppercase tracking-wider text-zinc-400">Pytanie</span>
                        <textarea
                          rows={2}
                          value={station.quiz?.question ?? ""}
                          onChange={(event) =>
                            updateStation(index, {
                              quiz: {
                                question: event.target.value,
                                answers: station.quiz?.answers ?? createEmptyQuizAnswers(),
                                correctAnswerIndex: station.quiz?.correctAnswerIndex ?? 0,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                        />
                      </label>

                      <div className="space-y-2">
                        {(station.quiz?.answers ?? createEmptyQuizAnswers()).map((answer, answerIndex) => (
                          <label
                            key={answerIndex}
                            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2"
                          >
                            <input
                              type="radio"
                              name={`realization-station-quiz-correct-${stationKey}`}
                              checked={(station.quiz?.correctAnswerIndex ?? 0) === answerIndex}
                              onChange={() =>
                                updateStation(index, {
                                  quiz: {
                                    question: station.quiz?.question ?? "",
                                    answers: station.quiz?.answers ?? createEmptyQuizAnswers(),
                                    correctAnswerIndex: answerIndex,
                                  },
                                })
                              }
                              className="h-4 w-4 accent-amber-400"
                            />
                            <input
                              value={answer}
                              onChange={(event) =>
                                updateStation(index, {
                                  quiz: {
                                    question: station.quiz?.question ?? "",
                                    answers: (station.quiz?.answers ?? createEmptyQuizAnswers()).map((item, idx) =>
                                      idx === answerIndex ? event.target.value : item,
                                    ),
                                    correctAnswerIndex: station.quiz?.correctAnswerIndex ?? 0,
                                  },
                                })
                              }
                              placeholder={`Odpowiedź ${answerIndex + 1}`}
                              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                            />
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Uzupełnij {QUIZ_ANSWER_COUNT} odpowiedzi i zaznacz jedną prawidłową.
                      </p>
                    </div>
                  ) : null}

                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                    <textarea
                      rows={3}
                      value={station.description}
                      onChange={(event) => updateStation(index, { description: event.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

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
                        <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
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
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu</span>
                    <div
                      className={`space-y-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3 transition ${
                        station.timeLimitSeconds === 0 ? "opacity-60" : "opacity-100"
                      }`}
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
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                      <p className="text-xs text-zinc-500">Zakres: 0-10:00 (co 15 sek). Ustaw 0, aby wyłączyć limit czasu.</p>
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
                        value={typeof station.longitude === "number" ? station.longitude : ""}
                        onChange={(event) =>
                          updateStation(index, {
                            longitude: event.target.value === "" ? undefined : Number(event.target.value),
                          })
                        }
                        placeholder="np. 21.01220"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
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
