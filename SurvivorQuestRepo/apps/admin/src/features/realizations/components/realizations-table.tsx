"use client";

import { useMemo } from "react";
import type { Realization, RealizationType } from "../types/realization";
import { realizationTypeOptions } from "../types/realization";
import type { Scenario } from "@/features/scenario/types/scenario";
import type { Station } from "@/features/games/types/station";
import {
  getStatusLabel,
  getStatusClass,
  getStatusOrder,
  type RealizationSortField,
  type SortDirection,
} from "../realization.utils";

interface RealizationsTableProps {
  realizations: Realization[];
  scenarios: Scenario[];
  stations: Station[];
  sortField: RealizationSortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: RealizationSortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onEdit: (realization: Realization) => void;
}

export function RealizationsTable({
  realizations,
  scenarios,
  stations,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  onEdit,
}: RealizationsTableProps) {
  const scenarioById = useMemo(
    () => new Map(scenarios.map((scenario) => [scenario.id, scenario])),
    [scenarios],
  );

  const sortedRealizations = useMemo(() => {
    const list = [...realizations];

    list.sort((left, right) => {
      if (sortField === "company") {
        const value = left.companyName.localeCompare(right.companyName, "pl", { sensitivity: "base" });
        return sortDirection === "asc" ? value : -value;
      }

      if (sortField === "status") {
        const value = getStatusOrder(left.status) - getStatusOrder(right.status);
        return sortDirection === "asc" ? value : -value;
      }

      const leftTime = new Date(sortField === "scheduledAt" ? left.scheduledAt : left.createdAt).getTime();
      const rightTime = new Date(sortField === "scheduledAt" ? right.scheduledAt : right.createdAt).getTime();
      const value = leftTime - rightTime;
      return sortDirection === "asc" ? value : -value;
    });

    return list;
  }, [realizations, sortField, sortDirection]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <h3 className="text-sm font-medium text-zinc-200">Lista realizacji</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-400">Sortuj po</label>
          <select
            value={sortField}
            onChange={(event) => onSortFieldChange(event.target.value as RealizationSortField)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
          >
            <option value="scheduledAt">Termin</option>
            <option value="company">Firma</option>
            <option value="status">Status</option>
            <option value="createdAt">Data utworzenia</option>
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

      {sortedRealizations.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm font-medium text-zinc-200">Brak realizacji</p>
          <p className="mt-1 text-sm text-zinc-400">Dodaj pierwszą realizację w panelu po prawej.</p>
        </div>
      )}

      {sortedRealizations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 text-sm">
              <thead className="bg-zinc-900 text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Firma</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Typ</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Termin</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Scenariusz</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Punkty</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Drużyny</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Urządzenia</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Osoby</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Stanowiska</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Ostatnia zmiana</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {sortedRealizations.map((realization) => {
                  const linkedScenario = scenarioById.get(realization.scenarioId);
                  const realizationStations =
                    realization.scenarioStations.length > 0
                      ? realization.scenarioStations
                      : realization.stationIds
                          .map((stationId) => stations.find((station) => station.id === stationId))
                          .filter((station): station is NonNullable<typeof station> => Boolean(station));

                  const totalPoints = realizationStations.reduce((sum, station) => sum + station.points, 0);
                  const stationCount = realizationStations.length;

                  return (
                    <tr key={realization.id} className="border-t border-zinc-800 bg-zinc-900/70">
                      <td className="px-3 py-2 font-medium text-zinc-100">{realization.companyName}</td>
                      <td className="px-3 py-2 text-zinc-300">
                        {realizationTypeOptions.find((opt) => opt.value === realization.type)?.label ?? realization.type}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {new Date(realization.scheduledAt).toLocaleString("pl-PL")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusClass(realization.status)}`}
                        >
                          {getStatusLabel(realization.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {linkedScenario ? (
                          <>
                            <p className="line-clamp-1">{linkedScenario.name}</p>
                            <p className="text-xs text-zinc-500">Stanowiska: {stationCount}</p>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-amber-300">{totalPoints}</td>
                      <td className="px-3 py-2 text-zinc-300">{realization.teamCount}</td>
                      <td className="px-3 py-2 text-zinc-300">{realization.requiredDevicesCount}</td>
                      <td className="px-3 py-2 text-zinc-300">{realization.peopleCount}</td>
                      <td className="px-3 py-2 text-zinc-300">{realization.positionsCount}</td>
                      <td className="px-3 py-2 text-zinc-500">
                        {new Date(realization.updatedAt).toLocaleString("pl-PL")}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onEdit(realization)}
                          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                        >
                          Edytuj
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
