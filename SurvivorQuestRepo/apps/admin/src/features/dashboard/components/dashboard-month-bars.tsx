import type { MonthBucket } from "../model/business-summary";

/**
 * Słupki „eventy w miesiącach” zrobione na divach, bez biblioteki wykresów.
 * Dwie takie wizualizacje nie uzasadniają dokładania recharts i godzenia jego
 * motywu z ciemnym `@theme` panelu.
 */
export function DashboardMonthBars({ months }: { months: MonthBucket[] }) {
  const hasAnyEvent = months.some((month) => month.count > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-24 items-end gap-1" role="list" aria-label="Eventy w ostatnich 12 miesiącach">
        {months.map((month) => (
          <div
            key={month.key}
            role="listitem"
            aria-label={`${month.label}: ${month.count}`}
            title={`${month.label} — ${month.count} ${month.count === 1 ? "event" : "eventów"}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <span
              className={`w-full rounded-t ${month.isCurrent ? "bg-amber-400" : "bg-amber-400/35"}`}
              style={{ height: `${Math.max(month.heightPercent, month.count > 0 ? 6 : 2)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {months.map((month) => (
          <span
            key={month.key}
            className={`min-w-0 flex-1 text-center text-[10px] ${
              month.isCurrent ? "text-amber-300" : "text-zinc-600"
            }`}
          >
            {month.label}
          </span>
        ))}
      </div>

      {!hasAnyEvent && (
        <p className="text-xs text-zinc-500">Brak realizacji w ostatnich dwunastu miesiącach.</p>
      )}
    </div>
  );
}
