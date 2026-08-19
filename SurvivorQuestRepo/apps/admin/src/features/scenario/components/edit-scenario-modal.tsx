"use client";

import { useMemo, useState } from "react";
import type { Scenario } from "../types/scenario";
import type { Station } from "@/features/games/types/station";
import { groupStationsByCategory } from "@/features/games/station-catalog.utils";
import { useIsDirty } from "@/shared/lib/use-is-dirty";
import { useUpdateScenarioMutation, useDeleteScenarioMutation } from "../api/scenario.api";

interface EditScenarioModalProps {
  scenario: Scenario;
  stations: Station[];
  onClose: () => void;
}

export function EditScenarioModal({ scenario, stations, onClose }: EditScenarioModalProps) {
  const [updateScenario, { isLoading: isUpdating }] = useUpdateScenarioMutation();
  const [deleteScenario, { isLoading: isDeleting }] = useDeleteScenarioMutation();

  const [editValues, setEditValues] = useState({
    name: scenario.name,
    description: scenario.description,
    introText: scenario.introText,
    gameRules: scenario.gameRules,
    stationIds: scenario.stationIds,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function toggleStationSelection(stationId: string) {
    setEditValues((current) => ({
      ...current,
      stationIds: current.stationIds.includes(stationId)
        ? current.stationIds.filter((item) => item !== stationId)
        : [...current.stationIds, stationId],
    }));
  }

  const stationGroups = useMemo(() => groupStationsByCategory(stations), [stations]);

  function isGroupFullySelected(groupStations: Station[]) {
    return groupStations.length > 0 && groupStations.every((station) => editValues.stationIds.includes(station.id));
  }

  function toggleGroupSelection(groupStations: Station[]) {
    const groupIds = groupStations.map((station) => station.id);
    const allSelected = isGroupFullySelected(groupStations);
    setEditValues((current) => ({
      ...current,
      stationIds: allSelected
        ? current.stationIds.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...current.stationIds, ...groupIds])),
    }));
  }

  const isDirty = useIsDirty(editValues);

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij edycję scenariusza"
        onClick={() => {
          if (!isDirty) {
            onClose();
          }
        }}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Edytuj scenariusz</h2>
              <p className="mt-1 text-sm text-zinc-400">{scenario.name}</p>
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
              const trimmedName = editValues.name.trim();
              const trimmedDescription = editValues.description.trim();

              if (trimmedName.length < 3) {
                setEditError("Nazwa scenariusza musi mieć co najmniej 3 znaki.");
                return;
              }

              if (editValues.stationIds.length === 0) {
                setEditError("Wybierz przynajmniej jedno stanowisko.");
                return;
              }

              try {
                setEditError(null);
                await updateScenario({
                  id: scenario.id,
                  name: trimmedName,
                  description: trimmedDescription,
                  introText: editValues.introText.trim(),
                  gameRules: editValues.gameRules.trim(),
                  stationIds: editValues.stationIds,
                }).unwrap();
                onClose();
              } catch {
                setEditError("Nie udało się zapisać scenariusza.");
              }
            }}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa scenariusza</span>
              <input
                value={editValues.name}
                onChange={(event) => setEditValues((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
              <textarea
                value={editValues.description}
                onChange={(event) => setEditValues((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Tekst wstępu</span>
              <textarea
                value={editValues.introText}
                onChange={(event) => setEditValues((prev) => ({ ...prev, introText: event.target.value }))}
                rows={4}
                placeholder="Tekst wstępu podpowie się automatycznie przy tworzeniu realizacji z tego scenariusza"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Zasady gry</span>
              <textarea
                value={editValues.gameRules}
                onChange={(event) => setEditValues((prev) => ({ ...prev, gameRules: event.target.value }))}
                rows={4}
                placeholder="Zasady gry podpowiedzą się automatycznie przy tworzeniu realizacji z tego scenariusza"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 pr-2">
                {stationGroups.map((group) => {
                  const groupSelected = isGroupFullySelected(group.stations);

                  return (
                    <div key={group.category} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-400">
                          {group.label} ({group.stations.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleGroupSelection(group.stations)}
                          className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:border-amber-400/60 hover:text-amber-200"
                        >
                          {groupSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                        </button>
                      </div>
                      {group.stations.map((station) => {
                        const isChecked = editValues.stationIds.includes(station.id);

                        return (
                          <label key={station.id} className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                            <span className="truncate">{station.name}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStationSelection(station.id)}
                              className="h-4 w-4 accent-amber-400"
                            />
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {editError && <p className="text-sm text-red-300">{editError}</p>}

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
          </form>

          <section className="rounded-lg border border-red-900/70 bg-red-950/20 p-3">
            <p className="text-xs uppercase tracking-wider text-red-300">Usuń scenariusz</p>
            <p className="mt-2 text-xs text-red-200">
              Wpisz nazwę <strong>{scenario.name}</strong>, aby potwierdzić usunięcie.
            </p>
            <input
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              className="mt-2 w-full rounded-md border border-red-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              placeholder="Nazwa scenariusza"
            />
            {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}
            <button
              type="button"
              onClick={async () => {
                if (deleteConfirmName.trim() !== scenario.name) {
                  setDeleteError("Nazwa scenariusza nie zgadza się z potwierdzeniem.");
                  return;
                }
                try {
                  setDeleteError(null);
                  await deleteScenario({
                    id: scenario.id,
                    confirmName: deleteConfirmName.trim(),
                  }).unwrap();
                  onClose();
                } catch {
                  setDeleteError("Nie udało się usunąć scenariusza.");
                }
              }}
              disabled={isDeleting}
              className="mt-3 rounded-lg border border-red-700 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Usuń scenariusz
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}
