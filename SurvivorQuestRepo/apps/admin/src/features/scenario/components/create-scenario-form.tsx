"use client";

import { useState } from "react";
import type { Station } from "@/features/games/types/station";
import { stationTypeOptions } from "@/features/games/types/station";
import { useCreateScenarioMutation } from "../api/scenario.api";

interface CreateScenarioFormProps {
  stations: Station[];
  isStationsLoading: boolean;
}

function getTypeLabel(value: string) {
  return stationTypeOptions.find((option) => option.value === value)?.label ?? "Quiz";
}

export function CreateScenarioForm({ stations, isStationsLoading }: CreateScenarioFormProps) {
  const [createScenario, { isLoading: isCreating }] = useCreateScenarioMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleSelection(stationId: string) {
    setSelectedStationIds((current) =>
      current.includes(stationId) ? current.filter((item) => item !== stationId) : [...current, stationId],
    );
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 xl:order-2 xl:sticky xl:top-6"
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
            stationIds: selectedStationIds,
          }).unwrap();
          setName("");
          setDescription("");
          setSelectedStationIds([]);
          setFormError(null);
        } catch {
          setFormError("Nie udało się utworzyć scenariusza.");
        }
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nowy scenariusz</h2>
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">Roboczy</span>
        </div>

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

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
            <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3">
              {isStationsLoading ? (
                <p className="text-xs text-zinc-500">Ładowanie stanowisk...</p>
              ) : stations.length === 0 ? (
                <p className="text-xs text-zinc-500">Brak stanowisk do przypisania.</p>
              ) : (
                stations.map((station) => {
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
                })
              )}
            </div>
          </div>
        </div>

        {formError && <p className="text-sm text-red-300">{formError}</p>}

        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isCreating ? "Dodawanie..." : "Dodaj scenariusz"}
        </button>
      </div>
    </form>
  );
}
