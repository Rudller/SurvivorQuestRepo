"use client";

import { useState } from "react";
import {
  useAssignRiskStationToPoolMutation,
  useRemoveRiskStationFromPoolMutation,
} from "../api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS, type RiskCategory, type RiskDifficulty } from "../types/risk-quiz";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { getStationTypeLabel } from "@/features/games/station.utils";
import { CreateStationForm } from "@/features/games/components/create-station-form";
import { EditStationModal } from "@/features/games/components/edit-station-modal";
import { isStationTypeAllowedInRiskDeck, type Station } from "@/features/games/types/station";

export function StationAssignmentForm({
  categoryId,
  difficulty,
  onDone,
}: {
  categoryId: string;
  difficulty: RiskDifficulty;
  onDone: () => void;
}) {
  const { data: stations, isLoading: isLoadingStations } = useGetStationsQuery();
  const [assignStation, { isLoading }] = useAssignRiskStationToPoolMutation();
  const [stationId, setStationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNewStation, setIsCreatingNewStation] = useState(false);

  async function assign(id: string) {
    setError(null);
    try {
      await assignStation({ categoryId, difficulty, stationId: id }).unwrap();
      setStationId("");
      onDone();
    } catch {
      setError("Nie udało się przypisać stanowiska (może już jest w tej puli).");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <select
        value={stationId}
        onChange={(event) => setStationId(event.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
      >
        <option value="">{isLoadingStations ? "Ładowanie stanowisk..." : "— wybierz istniejące stanowisko —"}</option>
        {(stations ?? [])
          .filter((station) => isStationTypeAllowedInRiskDeck(station.type))
          .map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} ({getStationTypeLabel(station.type)})
            </option>
          ))}
      </select>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void assign(stationId)}
          disabled={isLoading || !stationId}
          className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isLoading ? "Przypisywanie..." : "Przypisz do puli"}
        </button>
        <button
          type="button"
          onClick={() => setIsCreatingNewStation(true)}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          + Utwórz nowe zadanie
        </button>
      </div>

      {isCreatingNewStation ? (
        <CreateStationForm
          variant="risk"
          onClose={() => setIsCreatingNewStation(false)}
          onCreated={(station: Station) => {
            setIsCreatingNewStation(false);
            void assign(station.id);
          }}
        />
      ) : null}
    </div>
  );
}

export function PoolStationRow({ poolStation }: { poolStation: RiskCategory["poolStations"][number] }) {
  const [removeStation, { isLoading }] = useRemoveRiskStationFromPoolMutation();
  const [isEditing, setIsEditing] = useState(false);

  // The pool row already carries the whole station, so don't look it up in the
  // template library: a realization-owned deck's stations are clones that the
  // library deliberately never lists, and searching for them there left this
  // button permanently disabled.
  const fullStation = poolStation.station;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
      <div>
        <p className="text-sm text-zinc-100">{poolStation.station.name}</p>
        <p className="text-xs text-zinc-500">{getStationTypeLabel(poolStation.station.type)}</p>
        {/* Assignments made before this type was excluded stay in the deck and
            keep being drawn — the guard only stops new ones — so say it out
            loud here instead of letting a team pull an unplayable card. */}
        {isStationTypeAllowedInRiskDeck(poolStation.station.type) ? null : (
          <p className="mt-1 text-[11px] text-amber-300">
            Typ niedostępny w Ryzykantach — usuń z puli.
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200 transition hover:border-zinc-500"
        >
          Edytuj
        </button>
        <button
          type="button"
          onClick={() => void removeStation({ poolStationId: poolStation.id })}
          disabled={isLoading}
          className="rounded-md border border-red-500/40 px-2 py-0.5 text-[11px] text-red-300 transition hover:border-red-400 disabled:opacity-60"
        >
          Usuń
        </button>
      </div>

      {isEditing ? (
        <EditStationModal station={fullStation} variant="risk" onClose={() => setIsEditing(false)} />
      ) : null}
    </div>
  );
}

export function CategoryListRow({ category, onEdit }: { category: RiskCategory; onEdit: () => void }) {
  const counts = RISK_DIFFICULTY_OPTIONS.map((option) => ({
    label: option.label,
    count: category.poolStations.filter((item) => item.difficulty === option.value).length,
  }));

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-left transition hover:border-zinc-600"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-100">{category.name}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {counts.map((item) => `${item.label}: ${item.count}`).join(" • ")}
        </p>
      </div>
      <span className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300">Edytuj</span>
    </button>
  );
}
