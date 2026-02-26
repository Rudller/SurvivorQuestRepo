"use client";

import Image from "next/image";
import { useState } from "react";
import type { Station, StationType } from "../types/station";
import { stationTypeOptions } from "../types/station";
import { useUpdateStationMutation, useDeleteStationMutation } from "../api/station.api";
import {
  imageModeOptions,
  type ImageInputMode,
  getStationTypeLabel,
  clampTimeLimitSeconds,
  formatTimeLimit,
  handleImageFile,
  handleImagePaste,
} from "../station.utils";

interface EditStationModalProps {
  station: Station;
  onClose: () => void;
}

export function EditStationModal({ station, onClose }: EditStationModalProps) {
  const [updateStation, { isLoading: isUpdating }] = useUpdateStationMutation();
  const [deleteStation, { isLoading: isDeleting }] = useDeleteStationMutation();

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
  });

  const editPreviewName = editValues.name.trim() || "Nazwa stanowiska";
  const editPreviewDescription = editValues.description.trim() || "Opis stanowiska pojawi się tutaj.";
  const editPreviewImage =
    editValues.imageUrl.trim() || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(editPreviewName)}`;

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

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Podgląd mobilki</p>
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
              <Image
                src={editPreviewImage}
                alt={editPreviewName}
                width={640}
                height={256}
                className="mb-3 h-40 w-full rounded-lg border border-zinc-800 object-cover"
              />
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-100">{editPreviewName}</h3>
                <span className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                  {getStationTypeLabel(editValues.type)}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-zinc-400">{editPreviewDescription}</p>
              <p className="mt-2 text-sm font-medium text-amber-300">Punkty: {editValues.points}</p>
              <p className="mt-1 text-xs text-zinc-400">Czas: {formatTimeLimit(editValues.timeLimitSeconds)}</p>
            </article>
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

              try {
                await updateStation({
                  id: station.id,
                  name: editValues.name.trim(),
                  type: editValues.type,
                  description: editValues.description.trim(),
                  imageUrl: editValues.imageUrl.trim() || undefined,
                  points: editValues.points,
                  timeLimitSeconds: clampTimeLimitSeconds(editValues.timeLimitSeconds),
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
                onChange={(event) => setEditValues((prev) => ({ ...prev, type: event.target.value as StationType }))}
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
                value={editValues.description}
                onChange={(event) => setEditValues((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                placeholder="Opis stanowiska"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz stanowiska</span>
              <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
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

                {editImageMode === "upload" && (
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
                            (url) => { setEditValues((prev) => ({ ...prev, imageUrl: url })); setEditImageError(null); },
                            setEditImageError,
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
                      );
                    }}
                    className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-3 text-xs text-zinc-400"
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
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                )}

                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-zinc-500">
                    {editValues.imageUrl.trim() ? "Obraz ustawiony" : "Brak wybranego obrazu"}
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
                disabled={isUpdating}
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isUpdating ? "Zapisywanie..." : "Zapisz"}
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
