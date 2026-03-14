"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Station, StationType } from "../types/station";
import { stationTypeOptions } from "../types/station";
import { useUpdateStationMutation, useDeleteStationMutation, useUploadStationImageMutation } from "../api/station.api";
import {
  imageModeOptions,
  type ImageInputMode,
  clampTimeLimitSeconds,
  formatTimeLimit,
  handleImageFile,
  handleImagePaste,
  isCompletionCodeRequired,
  isValidCompletionCode,
  normalizeCompletionCode,
} from "../station.utils";

interface EditStationModalProps {
  station: Station;
  onClose: () => void;
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

export function EditStationModal({ station, onClose }: EditStationModalProps) {
  const [updateStation, { isLoading: isUpdating }] = useUpdateStationMutation();
  const [deleteStation, { isLoading: isDeleting }] = useDeleteStationMutation();
  const [uploadStationImage, { isLoading: isUploadingImage }] = useUploadStationImageMutation();

  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const [editImageMode, setEditImageMode] = useState<ImageInputMode>("upload");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editValues, setEditValues] = useState({
    name: station.name,
    type: station.type as StationType,
    description: station.description,
    imageUrl: station.imageUrl,
    points: station.points,
    timeLimitSeconds: station.timeLimitSeconds,
    completionCode: station.completionCode ?? "",
    latitude: typeof station.latitude === "number" && Number.isFinite(station.latitude) ? station.latitude : undefined,
    longitude: typeof station.longitude === "number" && Number.isFinite(station.longitude) ? station.longitude : undefined,
  });
  const hasLatitude = typeof editValues.latitude === "number" && Number.isFinite(editValues.latitude);
  const hasLongitude = typeof editValues.longitude === "number" && Number.isFinite(editValues.longitude);
  const hasCoordinates = hasLatitude && hasLongitude;

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij edycję"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Edytuj stanowisko</h2>
              <p className="mt-1 text-sm text-zinc-400">Zmieniasz dane stanowiska: {station.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
          </div>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setEditFormError(null);

              if (!editValues.name.trim() || !editValues.description.trim() || editValues.points <= 0) {
                setEditFormError("Uzupełnij nazwę, opis i poprawną liczbę punktów.");
                return;
              }

              if (!Number.isFinite(editValues.timeLimitSeconds) || editValues.timeLimitSeconds < 0) {
                setEditFormError("Podaj poprawny limit czasu w sekundach.");
                return;
              }

              if (isCompletionCodeRequired(editValues.type) && !isValidCompletionCode(editValues.completionCode)) {
                setEditFormError("Dla stanowisk Na czas / Na punkty podaj kod (3-32 znaki: A-Z, 0-9, -).");
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
                await updateStation({
                  id: station.id,
                  name: editValues.name.trim(),
                  type: editValues.type,
                  description: editValues.description.trim(),
                  imageUrl: editValues.imageUrl.trim() || undefined,
                  points: editValues.points,
                  timeLimitSeconds: clampTimeLimitSeconds(editValues.timeLimitSeconds),
                  completionCode: isCompletionCodeRequired(editValues.type)
                    ? normalizeCompletionCode(editValues.completionCode)
                    : undefined,
                  latitude: nextLatitude,
                  longitude: nextLongitude,
                }).unwrap();
                onClose();
              } catch {
                setEditFormError("Nie udało się zapisać zmian stanowiska.");
              }
            }}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa stanowiska</span>
              <input
                value={editValues.name}
                onChange={(event) => setEditValues((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nazwa stanowiska"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Typ stanowiska</span>
              <select
                value={editValues.type}
                onChange={(event) =>
                  setEditValues((prev) => {
                    const nextType = event.target.value as StationType;
                    return {
                      ...prev,
                      type: nextType,
                      completionCode: isCompletionCodeRequired(nextType) ? prev.completionCode : "",
                    };
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              >
                {stationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {isCompletionCodeRequired(editValues.type) ? (
              <label className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Kod zaliczenia</span>
                <input
                  value={editValues.completionCode}
                  onChange={(event) =>
                    setEditValues((prev) => ({ ...prev, completionCode: event.target.value.toUpperCase() }))
                  }
                  placeholder="Np. POINTS-2048"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                />
                <p className="text-xs text-zinc-500">Wymagany dla stanowisk Na czas i Na punkty.</p>
              </label>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
              <textarea
                value={editValues.description}
                onChange={(event) => setEditValues((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                placeholder="Opis stanowiska"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

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
                        accept="image/*"
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
                    <p className="text-xs text-zinc-500">Obsługiwane: PNG, JPG, WEBP, SVG.</p>
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
                disabled={isUpdating || isUploadingImage}
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isUpdating ? "Zapisywanie..." : isUploadingImage ? "Przesyłanie obrazu..." : "Zapisz"}
              </button>
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
      </aside>
    </>
  );
}
