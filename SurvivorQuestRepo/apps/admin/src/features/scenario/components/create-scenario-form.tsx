"use client";

import { useMemo, useState } from "react";
import type { Station } from "@/features/games/types/station";
import { stationTypeOptions } from "@/features/games/types/station";
import { groupStationsByCategory } from "@/features/games/station-catalog.utils";
import { useIsDirty } from "@/shared/lib/use-is-dirty";
import { useCreateScenarioMutation } from "../api/scenario.api";

interface CreateScenarioFormProps {
  stations: Station[];
  isStationsLoading: boolean;
  onClose: () => void;
}

function getTypeLabel(value: string) {
  return stationTypeOptions.find((option) => option.value === value)?.label ?? "Quiz";
}

export function CreateScenarioForm({ stations, isStationsLoading, onClose }: CreateScenarioFormProps) {
  const [createScenario, { isLoading: isCreating }] = useCreateScenarioMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [introText, setIntroText] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleSelection(stationId: string) {
    setSelectedStationIds((current) =>
      current.includes(stationId) ? current.filter((item) => item !== stationId) : [...current, stationId],
    );
  }

  const stationGroups = useMemo(() => groupStationsByCategory(stations), [stations]);

  function isGroupFullySelected(groupStations: Station[]) {
    return groupStations.length > 0 && groupStations.every((station) => selectedStationIds.includes(station.id));
  }

  function toggleGroupSelection(groupStations: Station[]) {
    const groupIds = groupStations.map((station) => station.id);
    const allSelected = isGroupFullySelected(groupStations);
    setSelectedStationIds((current) =>
      allSelected
        ? current.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...current, ...groupIds])),
    );
  }

  const isDirty = useIsDirty({ name, description, introText, gameRules, selectedStationIds });

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel tworzenia scenariusza"
        onClick={() => {
          if (!isDirty) {
            onClose();
          }
        }}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <form
          className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmedName = name.trim();
            const trimmedDescription = description.trim();

            if (trimmedName.length < 3) {
              setFormError("Nazwa scenariusza musi mieć co najmniej 3 znaki.");
              return;
            }

            if (selectedStationIds.length === 0) {
              setFormError("Wybierz przynajmniej jedno stanowisko.");
              return;
            }

            try {
              setFormError(null);
              await createScenario({
                name: trimmedName,
                description: trimmedDescription,
                introText: introText.trim(),
                gameRules: gameRules.trim(),
                stationIds: selectedStationIds,
              }).unwrap();
              setName("");
              setDescription("");
              setIntroText("");
              setGameRules("");
              setSelectedStationIds([]);
              setFormError(null);
              onClose();
            } catch {
              setFormError("Nie udało się utworzyć scenariusza.");
            }
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nowy scenariusz</h2>
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
                disabled={isCreating}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isCreating ? "Dodawanie..." : "Dodaj scenariusz"}
              </button>
            </div>
          </div>

          {formError && <p className="text-sm text-red-300">{formError}</p>}

          <div className="grid gap-4">
            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa scenariusza</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Np. Scenariusz firmowy"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Krótki opis przepływu scenariusza"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Tekst wstępu</span>
              <textarea
                value={introText}
                onChange={(event) => setIntroText(event.target.value)}
                rows={4}
                placeholder="Tekst wstępu podpowie się automatycznie przy tworzeniu realizacji z tego scenariusza"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Zasady gry</span>
              <textarea
                value={gameRules}
                onChange={(event) => setGameRules(event.target.value)}
                rows={4}
                placeholder="Zasady gry podpowiedzą się automatycznie przy tworzeniu realizacji z tego scenariusza"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
              <div className="max-h-96 space-y-4 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                {isStationsLoading ? (
                  <p className="text-xs text-zinc-500">Ładowanie stanowisk...</p>
                ) : stations.length === 0 ? (
                  <p className="text-xs text-zinc-500">Brak stanowisk do przypisania.</p>
                ) : (
                  stationGroups.map((group) => {
                    const groupSelected = isGroupFullySelected(group.stations);

                    return (
                      <div key={group.category} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-300">
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
                        <div className="space-y-2">
                          {group.stations.map((station) => {
                            const checked = selectedStationIds.includes(station.id);

                            return (
                              <label
                                key={station.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                                  checked
                                    ? "border-amber-300 bg-amber-400/10"
                                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={checked}
                                  onChange={() => toggleSelection(station.id)}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-zinc-100">{station.name}</p>
                                  <p className="text-xs text-zinc-400">
                                    {getTypeLabel(station.type)} • {station.points} pkt • Czas: {station.timeLimitSeconds}s
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
