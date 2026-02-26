"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { Station } from "../types/station";
import {
  getStationTypeLabel,
  formatTimeLimit,
  type StationSortField,
  type SortDirection,
} from "../station.utils";

interface StationsTableProps {
  stations: Station[];
  sortField: StationSortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: StationSortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onEdit: (station: Station) => void;
}

export function StationsTable({
  stations,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  onEdit,
}: StationsTableProps) {
  const sortedGames = useMemo(() => {
    const list = [...stations];

    list.sort((left, right) => {
      const a = sortField === "name" ? left.name : getStationTypeLabel(left.type);
      const b = sortField === "name" ? right.name : getStationTypeLabel(right.type);
      const base = a.localeCompare(b, "pl", { sensitivity: "base" });

      if (base === 0) {
        return left.name.localeCompare(right.name, "pl", { sensitivity: "base" });
      }

      return sortDirection === "asc" ? base : -base;
    });

    return list;
  }, [stations, sortField, sortDirection]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <h3 className="text-sm font-medium text-zinc-200">Lista stanowisk</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-400">Sortuj po</label>
          <select
            value={sortField}
            onChange={(event) => onSortFieldChange(event.target.value as StationSortField)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
          >
            <option value="name">Nazwa</option>
            <option value="type">Typ</option>
          </select>
          <select
            value={sortDirection}
            onChange={(event) => onSortDirectionChange(event.target.value as SortDirection)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
          >
            <option value="asc">Rosnąco</option>
            <option value="desc">Malejąco</option>
          </select>
        </div>
      </div>

      {sortedGames.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm font-medium text-zinc-200">Brak stanowisk</p>
          <p className="mt-1 text-sm text-zinc-400">Dodaj pierwsze stanowisko w formularzu powyżej.</p>
        </div>
      )}

      {sortedGames.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="grid grid-cols-[72px_1.2fr_1fr_2fr_110px_110px_120px_120px] gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs uppercase tracking-wider text-zinc-400">
            <span>Obraz</span>
            <span>Nazwa</span>
            <span>Typ</span>
            <span>Opis</span>
            <span>Punkty</span>
            <span>Czas</span>
            <span>Aktualizacja</span>
            <span>Akcje</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {sortedGames.map((game) => (
              <div key={game.id} className="px-4 py-3">
                <div className="grid grid-cols-[72px_1.2fr_1fr_2fr_110px_110px_120px_120px] items-center gap-3">
                  <Image
                    src={game.imageUrl}
                    alt={game.name}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-lg border border-zinc-800 object-cover"
                  />
                  <p className="line-clamp-2 text-sm font-medium text-zinc-100">{game.name}</p>
                  <span className="w-fit rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                    {getStationTypeLabel(game.type)}
                  </span>
                  <p className="line-clamp-2 text-sm text-zinc-400">{game.description}</p>
                  <p className="text-sm font-medium text-amber-300">{game.points} pkt</p>
                  <p className="text-xs text-zinc-300">{formatTimeLimit(game.timeLimitSeconds)}</p>
                  <p className="text-xs text-zinc-500">{new Date(game.updatedAt).toLocaleDateString("pl-PL")}</p>
                  <div>
                    <button
                      type="button"
                      onClick={() => onEdit(game)}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                    >
                      Edytuj
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
