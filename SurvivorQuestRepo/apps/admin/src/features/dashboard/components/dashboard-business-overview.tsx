import { SummaryCard } from "@/shared/components/summary-card";
import type { BusinessSummary } from "../model/business-summary";
import { DashboardMonthBars } from "./dashboard-month-bars";

const FORMATS_SHOWN = 4;

export function DashboardBusinessOverview({ summary }: { summary: BusinessSummary }) {
  const formats = summary.formats.slice(0, FORMATS_SHOWN);

  return (
    <SummaryCard title={`Przegląd biznesowy · ${summary.monthLabel}`}>
      <div className="grid grid-cols-3 gap-3 pb-2">
        <div>
          <p className="text-2xl font-semibold text-amber-300">{summary.eventsThisMonth}</p>
          <p className="text-xs text-zinc-500">eventów</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-amber-300">{summary.peopleThisMonth}</p>
          <p className="text-xs text-zinc-500">graczy</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-amber-300">{summary.teamsThisMonth}</p>
          <p className="text-xs text-zinc-500">drużyn</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardMonthBars months={summary.months} />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Formaty ({summary.totalEvents} realizacji łącznie)
          </p>
          {formats.length === 0 ? (
            <p className="text-sm text-zinc-400">Brak danych o formatach.</p>
          ) : (
            <ul className="space-y-2">
              {formats.map((format) => (
                <li key={format.type} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-zinc-300">{format.label}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      {format.sharePercent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-amber-400/60"
                      style={{ width: `${format.sharePercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SummaryCard>
  );
}
