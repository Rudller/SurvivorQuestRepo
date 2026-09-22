import { SummaryCard } from "@/shared/components/summary-card";
import type { StationProgress } from "../model/live-summary";

export function DashboardStationProgress({ stations }: { stations: StationProgress[] }) {
  return (
    <SummaryCard title="Postęp stanowisk">
      {stations.length === 0 ? (
        <p className="text-sm text-zinc-400">Realizacja nie ma przypisanych stanowisk.</p>
      ) : (
        <ul className="space-y-3">
          {stations.map((station) => (
            <li key={station.stationId} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                  {station.stationName}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                  {station.doneTeams}/{station.totalTeams}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-sky-400/70"
                  style={{ width: `${station.progressPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}
