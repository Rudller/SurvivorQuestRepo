import Link from "next/link";
import { SummaryCard } from "@/shared/components/summary-card";
import {
  renderLogDescription,
  renderLogTitle,
  type EventLogEntry,
} from "@/features/current-realization/lib/event-log-labels";
import type { CurrentRealizationOverview } from "@/features/current-realization/types/current-realization-overview";

type DashboardRecentEventsProps = {
  logs: EventLogEntry[];
  stations: CurrentRealizationOverview["realization"]["stations"];
};

const CLOCK_FORMAT = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

function resolveStationName(
  log: EventLogEntry,
  stations: DashboardRecentEventsProps["stations"],
) {
  const stationId = typeof log.payload.stationId === "string" ? log.payload.stationId : null;
  if (!stationId) {
    return null;
  }

  return stations.find((station) => station.stationId === stationId)?.stationName ?? null;
}

export function DashboardRecentEvents({ logs, stations }: DashboardRecentEventsProps) {
  return (
    <SummaryCard title="Ostatnie zdarzenia">
      {logs.length === 0 ? (
        <p className="text-sm text-zinc-400">Jeszcze nic się nie wydarzyło.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {logs.map((log) => {
              const stationName = resolveStationName(log, stations);
              const description = renderLogDescription(log, stationName);

              return (
                <li key={log.id} className="flex gap-3 text-sm">
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {CLOCK_FORMAT.format(new Date(log.createdAt))}
                  </span>
                  <span className="min-w-0 flex-1">
                    {log.teamName && <span className="text-zinc-400">{log.teamName} — </span>}
                    <span className="text-zinc-200">{renderLogTitle(log, stationName)}</span>
                    {description && (
                      <span className="block text-xs text-zinc-500">{description}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/current-realization"
            className="inline-block pt-1 text-xs text-amber-300 underline-offset-4 hover:underline"
          >
            Pełny log zdarzeń →
          </Link>
        </>
      )}
    </SummaryCard>
  );
}
