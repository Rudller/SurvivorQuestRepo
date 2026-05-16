"use client";

import { useMemo, useState } from "react";
import type { Realization, RealizationStatus } from "@/features/realizations/types/realization";
import { getStatusLabel } from "@/features/realizations/realization.utils";

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
};

type CalendarEntry = {
  id: string;
  status: RealizationStatus;
  companyName: string;
  peopleCount: number;
  positionsCount: number;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildCalendarDays(displayedDate: Date): CalendarDay[] {
  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const calendarStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, dayIndex) => {
    const cellDate = new Date(calendarStart);
    cellDate.setDate(calendarStart.getDate() + dayIndex);

    return {
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
    };
  });
}

function isSameDay(leftDate: Date, rightDate: Date) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function getStatusPriority(status: RealizationStatus) {
  if (status === "in-progress") return 0;
  if (status === "planned") return 1;
  return 2;
}

function getPrimaryStatus(entries: CalendarEntry[]): RealizationStatus | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  return [...entries].sort((leftEntry, rightEntry) => getStatusPriority(leftEntry.status) - getStatusPriority(rightEntry.status))[0]
    .status;
}

const weekDayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

type DashboardCalendarProps = {
  realizations?: Realization[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

export function DashboardCalendar({
  realizations = [],
  isLoading = false,
  isError = false,
  onRetry,
}: DashboardCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [displayedDate, setDisplayedDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  const calendarDays = useMemo(() => buildCalendarDays(displayedDate), [displayedDate]);

  const monthTitle = useMemo(
    () =>
      displayedDate.toLocaleDateString("pl-PL", {
        month: "long",
        year: "numeric",
      }),
    [displayedDate],
  );

  const entriesByDate = useMemo<Record<string, CalendarEntry[]>>(() => {
    const groupedEntries: Record<string, CalendarEntry[]> = {};

    for (const realization of realizations) {
      const scheduledDate = new Date(realization.scheduledAt);
      if (!Number.isFinite(scheduledDate.getTime())) {
        continue;
      }

      const dateKey = toDateKey(scheduledDate);
      if (!groupedEntries[dateKey]) {
        groupedEntries[dateKey] = [];
      }

      groupedEntries[dateKey].push({
        id: realization.id,
        status: realization.status,
        companyName: realization.companyName,
        peopleCount: realization.peopleCount,
        positionsCount: realization.positionsCount,
      });
    }

    for (const dateKey of Object.keys(groupedEntries)) {
      groupedEntries[dateKey].sort((leftEntry, rightEntry) => {
        const statusDiff = getStatusPriority(leftEntry.status) - getStatusPriority(rightEntry.status);
        if (statusDiff !== 0) {
          return statusDiff;
        }

        return leftEntry.companyName.localeCompare(rightEntry.companyName, "pl");
      });
    }

    return groupedEntries;
  }, [realizations]);

  return (
    <section className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">{monthTitle}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDisplayedDate(
                (currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
              )
            }
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800"
            aria-label="Poprzedni miesiąc"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setDisplayedDate(new Date())}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            Dziś
          </button>
          <button
            type="button"
            onClick={() =>
              setDisplayedDate(
                (currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
              )
            }
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800"
            aria-label="Następny miesiąc"
          >
            →
          </button>
        </div>
      </div>

      {isLoading && <p className="mb-4 text-sm text-zinc-400">Ładowanie realizacji...</p>}

      {isError && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <p>Nie udało się pobrać realizacji do kalendarza.</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              Spróbuj ponownie
            </button>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {weekDayLabels.map((label) => (
          <div key={label} className="pb-1 text-center text-xs font-medium text-zinc-500">
            {label}
          </div>
        ))}

        {calendarDays.map(({ date, isCurrentMonth }) => {
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const entries = entriesByDate[toDateKey(date)] ?? [];
          const status = getPrimaryStatus(entries);

          const statusCellClassName =
            status === "done"
              ? "bg-emerald-500/25 text-emerald-200"
              : status === "planned"
                ? "bg-sky-500/25 text-sky-200"
                : status === "in-progress"
                  ? "bg-rose-500/25 text-rose-200"
                  : isCurrentMonth
                    ? "text-zinc-200 hover:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-800/60";

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`group relative aspect-square rounded-sm text-sm transition ${
                statusCellClassName
              } ${isSelected ? "ring-2 ring-zinc-200/80" : ""} ${isToday ? "outline-1 outline-amber-400/90" : ""}`}
            >
              <span className="inline-block leading-none">{date.getDate()}</span>
              {entries.length > 0 && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-950/95 p-2 text-left text-[11px] text-zinc-200 shadow-xl group-hover:block group-focus-visible:block">
                  <span className="block font-semibold text-zinc-100">
                    {entries.length === 1 ? entries[0].companyName : `${entries.length} realizacje`}
                  </span>
                  <ul className="mt-1 space-y-1">
                    {entries.slice(0, 3).map((entry) => (
                      <li key={entry.id} className="text-zinc-300">
                        <span className="font-medium text-zinc-200">{entry.companyName}</span>
                        {" · "}
                        {entry.peopleCount} os.
                        {" · "}
                        {entry.positionsCount} st.
                        {" · "}
                        {getStatusLabel(entry.status)}
                      </li>
                    ))}
                  </ul>
                  {entries.length > 3 ? (
                    <span className="mt-1 block text-[10px] text-zinc-400">
                      +{entries.length - 3} więcej
                    </span>
                  ) : null}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
          <span>Obecny dzień</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden="true" />
          <span>Zaplanowane realizacje</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden="true" />
          <span>Realizacje w trakcie</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>Zrealizowane</span>
        </div>
      </div>
    </section>
  );
}
