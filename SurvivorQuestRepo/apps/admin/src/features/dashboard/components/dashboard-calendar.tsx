"use client";

import { useMemo, useState } from "react";

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
};

type CalendarStatus = "completed" | "planned" | "attention";

type CalendarEntry = {
  status: CalendarStatus;
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

const weekDayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

export function DashboardCalendar() {
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

  const entriesByDate = useMemo<Record<string, CalendarEntry>>(() => {
    const year = displayedDate.getFullYear();
    const month = displayedDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    const withSafeDay = (day: number) => new Date(year, month, Math.min(day, lastDayOfMonth));

    return {
      [toDateKey(withSafeDay(4))]: {
        status: "completed",
        companyName: "Przykładowa Firma",
        peopleCount: 18,
        positionsCount: 4,
      },
      [toDateKey(withSafeDay(11))]: {
        status: "planned",
        companyName: "Nova Tech",
        peopleCount: 12,
        positionsCount: 3,
      },
      [toDateKey(withSafeDay(19))]: {
        status: "attention",
        companyName: "Green Systems",
        peopleCount: 9,
        positionsCount: 2,
      },
      [toDateKey(withSafeDay(24))]: {
        status: "completed",
        companyName: "Atlas Group",
        peopleCount: 22,
        positionsCount: 5,
      },
    };
  }, [displayedDate]);

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

      <div className="grid grid-cols-7 gap-1">
        {weekDayLabels.map((label) => (
          <div key={label} className="pb-1 text-center text-xs font-medium text-zinc-500">
            {label}
          </div>
        ))}

        {calendarDays.map(({ date, isCurrentMonth }) => {
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const entry = entriesByDate[toDateKey(date)];
          const status = entry?.status;

          const statusCellClassName =
            status === "completed"
              ? "bg-emerald-500/25 text-emerald-200"
              : status === "planned"
                ? "bg-sky-500/25 text-sky-200"
                : status === "attention"
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
              {entry && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-950/95 p-2 text-left text-[11px] text-zinc-200 shadow-xl group-hover:block group-focus-visible:block">
                  <span className="block font-semibold text-zinc-100">{entry.companyName}</span>
                  <span className="mt-1 block text-zinc-300">Ilość osób: {entry.peopleCount}</span>
                  <span className="block text-zinc-300">Ilość stanowisk: {entry.positionsCount}</span>
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
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>Realizacje dopięte na ostatni guzik</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden="true" />
          <span>Zaplanowane zadania</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden="true" />
          <span>Wymaga uwagi</span>
        </div>
      </div>
    </section>
  );
}