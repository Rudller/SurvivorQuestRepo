"use client";

import dynamic from "next/dynamic";
import { useState, type ClipboardEvent } from "react";
import type { StationType } from "../types/station";
import { stationTypeOptions } from "../types/station";
import { useCreateStationMutation, useUploadStationImageMutation } from "../api/station.api";
import {
  imageModeOptions,
  type ImageInputMode,
  looksLikeUrl,
  clampTimeLimitSeconds,
  formatTimeLimit,
  handleImageFile,
  isCompletionCodeRequired,
  isValidCompletionCodeForMode,
  normalizeCompletionCode,
  generateSampleCompletionCode,
  createEmptyQuizAnswers,
  normalizeStationQuiz,
  QUIZ_ANSWER_COUNT,
  resolveCompletionCodeGeneratorMode,
  type CompletionCodeGeneratorMode,
  completionCodeModeOptions,
} from "../station.utils";

type CreateStationFormProps = {
  onClose: () => void;
};

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

export function CreateStationForm({ onClose }: CreateStationFormProps) {
  const [createStation, { isLoading: isCreating }] = useCreateStationMutation();
  const [uploadStationImage, { isLoading: isUploadingImage }] = useUploadStationImageMutation();

  const [name, setName] = useState("");
  const [type, setType] = useState<StationType>("quiz");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [points, setPoints] = useState(100);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0);
  const [completionCode, setCompletionCode] = useState("");
  const [completionCodeMode, setCompletionCodeMode] = useState<CompletionCodeGeneratorMode>("letters");
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<string[]>(() => createEmptyQuizAnswers());
  const [quizCorrectAnswerIndex, setQuizCorrectAnswerIndex] = useState(0);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [createImageMode, setCreateImageMode] = useState<ImageInputMode>("upload");

  const previewImage = imageUrl.trim();
  const isBusy = isCreating || isUploadingImage;
  const hasLatitude = typeof latitude === "number" && Number.isFinite(latitude);
  const hasLongitude = typeof longitude === "number" && Number.isFinite(longitude);
  const hasCoordinates = hasLatitude && hasLongitude;

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel tworzenia stanowiska"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
        <form
          className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
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

            const quizConfig =
              type === "quiz"
                ? normalizeStationQuiz({
                    question: quizQuestion,
                    answers: quizAnswers,
                    correctAnswerIndex: quizCorrectAnswerIndex,
                  })
                : null;

            if (type === "quiz" && !quizConfig) {
              setFormError("Dla stanowiska Quiz uzupełnij pytanie, 4 odpowiedzi i wskaż jedną poprawną.");
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

              if (createImageMode !== "url" && imageFile) {
                const uploaded = await uploadStationImage(imageFile).unwrap();
                nextImageUrl = uploaded.url;
              } else if (nextImageUrl.startsWith("data:image/")) {
                nextImageUrl = "";
              }

              await createStation({
                name: name.trim(),
                type,
                description: description.trim(),
                imageUrl: nextImageUrl || undefined,
                points,
                timeLimitSeconds: clampTimeLimitSeconds(timeLimitSeconds),
                completionCode: isCompletionCodeRequired(type) ? normalizeCompletionCode(completionCode) : undefined,
                quiz: type === "quiz" ? quizConfig ?? undefined : undefined,
                latitude: nextLatitude,
                longitude: nextLongitude,
              }).unwrap();
              setName("");
              setType("quiz");
              setDescription("");
              setImageUrl("");
              setImageFile(null);
              setPoints(100);
              setTimeLimitSeconds(0);
              setCompletionCode("");
              setQuizQuestion("");
              setQuizAnswers(createEmptyQuizAnswers());
              setQuizCorrectAnswerIndex(0);
              setLatitude(undefined);
              setLongitude(undefined);
              setCreateImageMode("upload");
              onClose();
            } catch {
              setFormError("Nie udało się utworzyć stanowiska.");
            }
          }}
        >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nowe stanowisko</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            Zamknij
          </button>
        </div>

        <div className="grid gap-4">
          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa stanowiska</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
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
                setType(nextType);
                if (!isCompletionCodeRequired(nextType)) {
                  setCompletionCode("");
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
                    placeholder={completionCodeMode === "digits" ? "Np. 20481234" : "Np. CODEWXYZ"}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                  <button
                    type="button"
                    onClick={() => setCompletionCode(generateSampleCompletionCode(8, completionCodeMode))}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                  >
                    Wygeneruj
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Wymagany dla stanowisk Na czas i Na punkty. Kod mieszany będzie traktowany jak tryb literowy.</p>
              </label>
            ) : null}

          {type === "quiz" ? (
            <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pytanie i odpowiedzi</h3>
              <label className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Pytanie</span>
                <textarea
                  value={quizQuestion}
                  onChange={(event) => setQuizQuestion(event.target.value)}
                  rows={2}
                  placeholder="Wpisz pytanie quizowe"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
              </label>

              <div className="space-y-2">
                {quizAnswers.map((answer, index) => (
                  <label key={index} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
                    <input
                      type="radio"
                      name="quiz-correct-answer-create"
                      checked={quizCorrectAnswerIndex === index}
                      onChange={() => setQuizCorrectAnswerIndex(index)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    <input
                      value={answer}
                      onChange={(event) =>
                        setQuizAnswers((current) =>
                          current.map((item, answerIndex) => (answerIndex === index ? event.target.value : item)),
                        )
                      }
                      placeholder={`Odpowiedź ${index + 1}`}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Uzupełnij {QUIZ_ANSWER_COUNT} odpowiedzi i zaznacz jedną prawidłową.
              </p>
            </div>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Opis (opcjonalny)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Krótki opis stanowiska"
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>

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

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            Anuluj
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
        </form>
      </aside>
    </>
  );
}
