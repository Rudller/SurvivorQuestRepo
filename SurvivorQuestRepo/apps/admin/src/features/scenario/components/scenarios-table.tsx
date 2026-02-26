"use client";

import { useMemo } from "react";
import type { Scenario } from "../types/scenario";
import type { Station } from "@/features/games/types/station";

interface ScenariosTableProps {
  scenarios: Scenario[];
  stations: Station[];
  isLoading: boolean;
  onEdit: (scenario: Scenario) => void;
  onRefetch: () => void;
}

export function ScenariosTable({ scenarios, stations, isLoading, onEdit, onRefetch }: ScenariosTableProps) {
  const stationById = useMemo(
    () => new Map(stations.map((station) => [station.id, station])),
    [stations],
  );

  return (
    <div className="space-y-5 xl:order-1">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Lista scenariuszy</h3>
          <p className="mt-1 text-xs text-zinc-500">Realizacja • Scenariusz • Stanowiska • Aktywności</p>
        </div>
        <button
          type="button"
          onClick={onRefetch}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition hover:border-zinc-500"
        >
          Odśwież
        </button>
      </div>

      {isLoading && <p className="text-zinc-400">Ładowanie scenariuszy...</p>}

      {!isLoading && scenarios.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm font-medium text-zinc-200">Brak scenariuszy</p>
          <p className="mt-1 text-sm text-zinc-400">Dodaj pierwszy scenariusz w formularzu po prawej stronie.</p>
        </div>
      )}

      {!isLoading && scenarios.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="grid grid-cols-[1.2fr_2fr_1fr_120px] gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs uppercase tracking-wider text-zinc-400">
            <span>Nazwa</span>
            <span>Stanowiska / aktywności</span>
            <span>Aktualizacja</span>
            <span>Akcje</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="grid grid-cols-[1.2fr_2fr_1fr_120px] gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{scenario.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{scenario.description || "Brak opisu scenariusza."}</p>
                </div>

                <div className="space-y-1">
                  {scenario.stationIds.length === 0 ? (
                    <p className="text-xs text-zinc-500">Brak przypisanych stanowisk.</p>
                  ) : (
                    scenario.stationIds.slice(0, 3).map((stationId) => {
                      const station = stationById.get(stationId);

                      if (!station) {
                        return (
                          <p key={stationId} className="text-xs text-zinc-500">
                            • Stanowisko {stationId} (brak w katalogu)
                          </p>
                        );
                      }

                      return (
                        <p key={station.id} className="text-xs text-zinc-300">
                          • {station.name}: {station.description || "Brak opisu aktywności"}
                        </p>
                      );
                    })
                  )}
                  {scenario.stationIds.length > 3 && (
                    <p className="text-xs text-zinc-500">+{scenario.stationIds.length - 3} więcej...</p>
                  )}
                </div>

                <div className="text-xs text-zinc-400">
                  {new Date(scenario.updatedAt).toLocaleString("pl-PL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>

                <div className="flex items-start justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(scenario)}
                    className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Edytuj
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
