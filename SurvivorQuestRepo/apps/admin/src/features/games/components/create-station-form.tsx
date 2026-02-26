"use client";

import Image from "next/image";
import { useState } from "react";
import type { StationType } from "../types/station";
import { stationTypeOptions } from "../types/station";
import { useCreateStationMutation } from "../api/station.api";
import {
  imageModeOptions,
  type ImageInputMode,
  getStationTypeLabel,
  clampTimeLimitSeconds,
  formatTimeLimit,
  handleImageFile,
  handleImagePaste,
} from "../station.utils";

export function CreateStationForm() {
  const [createStation, { isLoading: isCreating }] = useCreateStationMutation();

  const [name, setName] = useState("");
  const [type, setType] = useState<StationType>("quiz");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [points, setPoints] = useState(100);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [createImageMode, setCreateImageMode] = useState<ImageInputMode>("upload");

  const previewName = name.trim() || "Nowe stanowisko";
  const previewDescription = description.trim() || "Krótki opis stanowiska pojawi się tutaj.";
  const previewImage = imageUrl.trim() || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(previewName)}`;

  return (
    <form
      className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 xl:order-2 xl:sticky xl:top-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!name.trim() || !description.trim() || points <= 0) {
          setFormError("Uzupełnij nazwę, opis i poprawną liczbę punktów.");
          return;
        }

        if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds < 0) {
          setFormError("Podaj poprawny limit czasu w sekundach.");
          return;
        }

        try {
          await createStation({
            name: name.trim(),
            type,
            description: description.trim(),
            imageUrl: imageUrl.trim() || undefined,
            points,
            timeLimitSeconds: clampTimeLimitSeconds(timeLimitSeconds),
          }).unwrap();
          setName("");
          setType("quiz");
          setDescription("");
          setImageUrl("");
          setPoints(100);
          setTimeLimitSeconds(0);
          setCreateImageMode("upload");
        } catch {
          setFormError("Nie udało się utworzyć stanowiska.");
        }
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nowe stanowisko</h2>
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">Robocza</span>
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
              onChange={(event) => setType(event.target.value as StationType)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            >
              {stationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Krótki opis stanowiska"
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz stanowiska (URL opcjonalny)</span>
            <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
              <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                {imageModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCreateImageMode(option.value)}
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

              {createImageMode === "upload" && (
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                    Wybierz plik obrazu
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleImageFile(
                          event.target.files?.[0] ?? null,
                          (url) => { setImageUrl(url); setImageError(null); },
                          setImageError,
                        );
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <p className="text-xs text-zinc-500">Obsługiwane: PNG, JPG, WEBP, SVG.</p>
                </div>
              )}

              {createImageMode === "paste" && (
                <div
                  onPaste={(event) => {
                    void handleImagePaste(
                      event,
                      (url) => { setImageUrl(url); setImageError(null); },
                      setImageError,
                    );
                  }}
                  className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-3 text-xs text-zinc-400"
                >
                  Skopiuj obraz lub link i wklej tutaj (Ctrl+V).
                </div>
              )}

              {createImageMode === "url" && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => {
                    setImageUrl(event.target.value);
                    setImageError(null);
                  }}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-zinc-500">
                  {imageUrl.trim() ? "Obraz ustawiony" : "Brak wybranego obrazu"}
                </p>
                {imageUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                  >
                    Wyczyść
                  </button>
                )}
              </div>

              {imageError && <p className="text-xs text-red-300">{imageError}</p>}
            </div>
          </label>

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
        </div>

        {formError && <p className="text-sm text-red-300">{formError}</p>}

        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isCreating ? "Dodawanie..." : "Dodaj stanowisko"}
        </button>
      </div>

      <aside className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Podgląd mobilki</p>
        <article className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <Image
            src={previewImage}
            alt={previewName}
            width={640}
            height={256}
            className="mb-3 h-36 w-full rounded-lg border border-zinc-800 object-cover"
          />
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-zinc-100">{previewName}</h3>
            <span className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
              {getStationTypeLabel(type)}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-zinc-400">{previewDescription}</p>
          <p className="mt-2 text-sm font-medium text-amber-300">Punkty: {points}</p>
          <p className="mt-1 text-xs text-zinc-400">Czas: {formatTimeLimit(timeLimitSeconds)}</p>
        </article>
      </aside>
    </form>
  );
}
