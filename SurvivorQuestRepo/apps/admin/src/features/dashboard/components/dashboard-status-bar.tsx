import Link from "next/link";
import type { CurrentRealizationOverview } from "@/features/current-realization/types/current-realization-overview";
import { getStatusClass, getStatusLabel } from "@/features/realizations/realization.utils";
import { formatMinutesLeft } from "../model/live-summary";
import type { DashboardMode } from "../model/dashboard-mode";

type DashboardStatusBarProps = {
  mode: DashboardMode;
  realization: CurrentRealizationOverview["realization"] | null;
  minutesLeft: number | null;
  daysUntil: number | null;
};

const TIME_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDaysUntil(days: number) {
  if (days === 0) return "dzisiaj";
  if (days === 1) return "jutro";
  return `za ${days} dni`;
}

export function DashboardStatusBar({
  mode,
  realization,
  minutesLeft,
  daysUntil,
}: DashboardStatusBarProps) {
  if (!realization) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <p className="text-sm text-zinc-400">
          Brak realizacji do pokazania. Zaplanuj pierwszą w sekcji{" "}
          <Link href="/realizations" className="text-amber-300 underline-offset-4 hover:underline">
            Realizacje
          </Link>
          .
        </p>
      </section>
    );
  }

  const isLive = mode === "live";
  const scheduledLabel = TIME_FORMAT.format(new Date(realization.scheduledAt));

  return (
    <section
      className={`rounded-lg border p-4 ${
        isLive ? "border-amber-400/40 bg-amber-500/10" : "border-zinc-800 bg-zinc-950/50"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            {isLive ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-amber-300">Na żywo</span>
              </>
            ) : (
              <span className="text-zinc-400">
                {mode === "upcoming"
                  ? "Najbliższa realizacja"
                  : realization.status === "planned"
                    ? "Ostatnia realizacja (niezamknięta)"
                    : "Ostatnia realizacja"}
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusClass(realization.status)}`}
            >
              {getStatusLabel(realization.status)}
            </span>
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
            {realization.companyName}
          </h2>

          <p className="text-sm text-zinc-400">
            {scheduledLabel}
            {realization.location ? ` · ${realization.location}` : ""}
            {" · kod "}
            <span className="font-mono text-zinc-200">{realization.joinCode}</span>
            {mode === "upcoming" && daysUntil !== null && daysUntil >= 0
              ? ` · ${formatDaysUntil(daysUntil)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          {isLive && minutesLeft !== null && (
            <p className="text-sm text-zinc-300">
              Zostało <span className="text-lg font-semibold text-amber-300">{formatMinutesLeft(minutesLeft)}</span>
            </p>
          )}
          <Link
            href="/current-realization"
            className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            {isLive ? "Przejdź do sterowania →" : "Otwórz realizację →"}
          </Link>
        </div>
      </div>
    </section>
  );
}
