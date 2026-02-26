"use client";

import { useEffect, useMemo, useState } from "react";
import { stationTypeOptions, type Station } from "@/features/games/types/station";
import type { RealizationStationDraft } from "../types/realization";

interface RealizationStationsEditorProps {
  stations: RealizationStationDraft[];
  onChange: (stations: RealizationStationDraft[]) => void;
}

export function createEmptyRealizationStationDraft(): RealizationStationDraft {
  return {
    name: "",
    type: "quiz",
    description: "",
    imageUrl: "",
    points: 100,
    timeLimitSeconds: 0,
  };
}

export function toRealizationStationDraft(station: Station): RealizationStationDraft {
  return {
    id: station.id,
    name: station.name,
    type: station.type,
    description: station.description,
    imageUrl: station.imageUrl,
    points: station.points,
    timeLimitSeconds: station.timeLimitSeconds,
  };
}

export function normalizeRealizationStationDrafts(stations: RealizationStationDraft[]) {
  return stations.map((station) => ({
    id: station.id,
    name: station.name.trim(),
    type: station.type,
    description: station.description.trim(),
    imageUrl: station.imageUrl.trim(),
    points: Math.round(station.points),
    timeLimitSeconds: Math.round(station.timeLimitSeconds),
  }));
}

export function hasInvalidRealizationStationDrafts(stations: RealizationStationDraft[]) {
  return stations.some((station) => {
    if (!station.name.trim() || !station.description.trim()) {
      return true;
    }

    if (!Number.isFinite(station.points) || station.points <= 0) {
      return true;
    }

    if (!Number.isFinite(station.timeLimitSeconds) || station.timeLimitSeconds < 0 || station.timeLimitSeconds > 600) {
      return true;
    }

    return false;
  });
}

export function RealizationStationsEditor({ stations, onChange }: RealizationStationsEditorProps) {
  const [expandedStationIndex, setExpandedStationIndex] = useState<number | null>(null);
  const stationTypeLabelByValue = useMemo(
    () => new Map(stationTypeOptions.map((option) => [option.value, option.label])),
    [],
  );

  useEffect(() => {
    if (stations.length === 0) {
      setExpandedStationIndex(null);
      return;
    }

    if (expandedStationIndex !== null && expandedStationIndex >= stations.length) {
      setExpandedStationIndex(null);
    }
  }, [expandedStationIndex, stations.length]);

  function updateStation(index: number, patch: Partial<RealizationStationDraft>) {
    onChange(stations.map((station, currentIndex) => (currentIndex === index ? { ...station, ...patch } : station)));
  }

  function addStation() {
    onChange([...stations, createEmptyRealizationStationDraft()]);
    setExpandedStationIndex(stations.length);
  }

  function removeStation(index: number) {
    onChange(stations.filter((_, currentIndex) => currentIndex !== index));
    setExpandedStationIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      if (currentIndex === index) {
        if (stations.length === 1) {
          return null;
        }

        return Math.min(index, stations.length - 2);
      }

      if (currentIndex > index) {
        return currentIndex - 1;
      }

      return currentIndex;
    });
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Stanowiska realizacji</legend>
        <button
          type="button"
          onClick={addStation}
          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
        >
          + Dodaj stanowisko
        </button>
      </div>

      {stations.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/70 p-3 text-xs text-zinc-500">
          Brak stanowisk. Dodaj przynajmniej jedno stanowisko do realizacji.
        </p>
      )}

      <div className="space-y-3">
        {stations.map((station, index) => (
          <div key={station.id ?? `new-${index}`} className="rounded-lg border border-zinc-700 bg-zinc-950/70">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setExpandedStationIndex((current) => (current === index ? null : index))}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium text-zinc-100">{station.name.trim() || `Stanowisko ${index + 1}`}</p>
                <p className="text-xs text-zinc-500">
                  {stationTypeLabelByValue.get(station.type) ?? "Quiz"} • {Number.isFinite(station.points) ? station.points : 0} pkt •{" "}
                  {Number.isFinite(station.timeLimitSeconds) ? station.timeLimitSeconds : 0}s
                </p>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedStationIndex((current) => (current === index ? null : index))}
                  className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                >
                  {expandedStationIndex === index ? "Zwiń" : "Rozwiń"}
                </button>
                <button
                  type="button"
                  onClick={() => removeStation(index)}
                  className="rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs text-red-300 transition hover:border-red-400 hover:text-red-200"
                >
                  Usuń
                </button>
              </div>
            </div>

            {expandedStationIndex === index && (
              <div className="space-y-3 border-t border-zinc-800 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa stanowiska</span>
                    <input
                      value={station.name}
                      onChange={(event) => updateStation(index, { name: event.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Typ stanowiska</span>
                    <select
                      value={station.type}
                      onChange={(event) => updateStation(index, { type: event.target.value as RealizationStationDraft["type"] })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    >
                      {stationTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                  <textarea
                    rows={3}
                    value={station.description}
                    onChange={(event) => updateStation(index, { description: event.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz stanowiska (URL opcjonalny)</span>
                  <input
                    value={station.imageUrl}
                    onChange={(event) => updateStation(index, { imageUrl: event.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
                    <input
                      type="number"
                      min={1}
                      value={station.points}
                      onChange={(event) => updateStation(index, { points: Number(event.target.value) })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu (sek.)</span>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={station.timeLimitSeconds}
                      onChange={(event) => updateStation(index, { timeLimitSeconds: Number(event.target.value) })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
