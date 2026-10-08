"use client";

import { useState } from "react";
import { useGetSystemHealthQuery } from "../api/system-health.api";
import type { SystemMetricsSample } from "../types/system-health";

type Level = "ok" | "warn" | "bad" | "neutral";

const LEVEL_STYLES: Record<
  Level,
  { card: string; value: string; line: string; dot: string }
> = {
  ok: {
    card: "border-emerald-500/25 bg-emerald-500/5",
    value: "text-emerald-300",
    line: "stroke-emerald-400",
    dot: "bg-emerald-400",
  },
  warn: {
    card: "border-amber-400/40 bg-amber-400/10",
    value: "text-amber-300",
    line: "stroke-amber-300",
    dot: "bg-amber-300",
  },
  bad: {
    card: "border-red-500/50 bg-red-500/10",
    value: "text-red-300",
    line: "stroke-red-400",
    dot: "bg-red-400",
  },
  neutral: {
    card: "border-zinc-800 bg-zinc-950/60",
    value: "text-zinc-100",
    line: "stroke-zinc-400",
    dot: "bg-zinc-400",
  },
};

const RECENT_RESTART_SECONDS = 30 * 60;

const LEVEL_LABELS: Record<Exclude<Level, "neutral">, string> = {
  ok: "Backend działa dobrze",
  warn: "Backend zwalnia",
  bad: "Backend przeciążony",
};

function levelFor(value: number | null, warnAt: number, badAt: number): Level {
  if (value === null) {
    return "bad";
  }
  if (value >= badAt) {
    return "bad";
  }
  return value >= warnAt ? "warn" : "ok";
}

function worstLevel(levels: Level[]): Exclude<Level, "neutral"> {
  if (levels.includes("bad")) {
    return "bad";
  }
  return levels.includes("warn") ? "warn" : "ok";
}

function formatMs(value: number | null) {
  if (value === null) {
    return "—";
  }
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} s`
    : `${Math.round(value)} ms`;
}

function formatUptime(seconds: number) {
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min`;
  }
  if (seconds < 86_400) {
    return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
  }
  return `${Math.floor(seconds / 86_400)} d ${Math.floor((seconds % 86_400) / 3600)} h`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Sparkline({
  values,
  level,
}: {
  values: Array<number | null>;
  level: Level;
}) {
  const points = values
    .map((value, index) => (value === null ? null : { x: index, y: value }))
    .filter((point): point is { x: number; y: number } => point !== null);

  if (points.length < 2) {
    return <div className="mt-2 h-7" />;
  }

  const maxX = Math.max(values.length - 1, 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const path = points
    .map((point) => `${(point.x / maxX) * 100},${28 - (point.y / maxY) * 26}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="mt-2 h-7 w-full"
      aria-hidden
    >
      <polyline
        points={path}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={LEVEL_STYLES[level].line}
      />
    </svg>
  );
}

type GaugeProps = {
  label: string;
  value: string;
  detail: string;
  level: Level;
  history: Array<number | null>;
};

function Gauge({ label, value, detail, level, history }: GaugeProps) {
  const styles = LEVEL_STYLES[level];
  return (
    <div className={`rounded-lg border p-3 ${styles.card}`}>
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${styles.value}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-zinc-400">{detail}</p>
      <Sparkline values={history} level={level} />
    </div>
  );
}

function pick(
  history: SystemMetricsSample[],
  read: (sample: SystemMetricsSample) => number | null,
) {
  return history.map(read);
}

const EMERGENCY_STEPS = [
  {
    title:
      "Połącz się z serwerem (komputer z kluczem albo Termius na telefonie)",
    command: "ssh -i ~/.ssh/sq_actions_deploy ubuntu@survivorquest.pl",
  },
  {
    title:
      "Zrestartuj backend (przerwa ok. 15 s, tablety same połączą się ponownie)",
    command: "docker restart survivorquest-backend-1",
  },
  {
    title: "Sprawdź, czy wstał (STATUS „Up”) i co pisał przed awarią",
    command:
      "docker ps --filter name=survivorquest-backend && docker logs --tail 100 survivorquest-backend-1",
  },
];

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex items-start gap-2">
      <code className="flex-1 break-all rounded-md bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-200">
        {command}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(command).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition hover:bg-zinc-800"
      >
        {copied ? "Skopiowano" : "Kopiuj"}
      </button>
    </div>
  );
}

function EmergencyHelp() {
  return (
    <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
      <p className="text-xs font-semibold text-sky-200">
        W razie awarii: restart backendu przez SSH
      </p>
      <p className="mt-1 text-[11px] text-zinc-400">
        Gdy pasek jest czerwony dłużej niż minutę albo tablety zgłaszają błędy
        połączenia. Restart nie kasuje postępu gry: drużyny, punkty i sesje
        tabletów są w bazie.
      </p>
      <ol className="mt-2 space-y-2">
        {EMERGENCY_STEPS.map((step, index) => (
          <li key={step.command} className="text-[11px] text-zinc-300">
            {index + 1}. {step.title}
            <CopyCommand command={step.command} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SystemHealthPanel() {
  const { data, isError, isLoading, fulfilledTimeStamp } =
    useGetSystemHealthQuery(undefined, {
      pollingInterval: 10_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      skipPollingIfUnfocused: false,
    });
  // Opens by itself while the backend is down, unless the admin closed it.
  const [helpOpen, setHelpOpen] = useState<boolean | null>(null);

  // RTK keeps the last good data through failed polls, so a choked backend
  // shows up as an error next to stale gauges rather than an empty panel.
  const lastResponseAt = fulfilledTimeStamp
    ? new Date(fulfilledTimeStamp)
    : null;
  const startedAt = data?.startedAt ? new Date(data.startedAt) : null;
  const restartedRecently = data
    ? data.uptimeSeconds < RECENT_RESTART_SECONDS
    : false;

  if (isLoading) {
    return (
      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500">
        Ładowanie stanu backendu...
      </div>
    );
  }

  const current = data?.current ?? null;
  const history = data?.history ?? [];
  const traffic = data?.window;

  const loopLevel = current
    ? levelFor(current.eventLoopLagP99Ms, 100, 500)
    : "neutral";
  const latencyLevel =
    traffic?.p95Ms == null ? "neutral" : levelFor(traffic.p95Ms, 300, 1000);
  const errorCount = traffic ? traffic.serverErrors + traffic.aborted : 0;
  const errorLevel: Level = !traffic
    ? "neutral"
    : errorCount > 5
      ? "bad"
      : errorCount > 0
        ? "warn"
        : "ok";
  const cpuLevel = current ? levelFor(current.cpuPercent, 70, 90) : "neutral";
  const heapShare =
    current && data?.heapLimitMb
      ? (current.heapUsedMb / data.heapLimitMb) * 100
      : null;
  const memoryLevel =
    heapShare === null ? "neutral" : levelFor(heapShare, 70, 85);
  const dbLevel = current ? levelFor(current.dbPingMs, 50, 250) : "neutral";

  const overall: Exclude<Level, "neutral"> = isError
    ? "bad"
    : worstLevel([
        loopLevel,
        latencyLevel,
        errorLevel,
        cpuLevel,
        memoryLevel,
        dbLevel,
      ]);
  const isStale = isError;
  const isHelpVisible = helpOpen ?? isError;

  return (
    <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${LEVEL_STYLES[overall].dot}`}
          />
          <h2 className="text-sm font-semibold text-zinc-100">
            {isError ? "Backend nie odpowiada" : LEVEL_LABELS[overall]}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-zinc-500">
            {isError
              ? lastResponseAt
                ? `Ostatnia odpowiedź o ${formatClock(lastResponseAt)}`
                : "Brak odpowiedzi"
              : data
                ? `Działa od ${formatUptime(data.uptimeSeconds)} · wykresy z ostatnich 10 min`
                : null}
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(!isHelpVisible)}
            aria-label="Co zrobić w razie awarii"
            title="Co zrobić w razie awarii"
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold italic transition ${
              isHelpVisible
                ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            i
          </button>
        </div>
      </div>

      {isHelpVisible ? <EmergencyHelp /> : null}

      {restartedRecently && startedAt ? (
        <p className="mt-2 text-xs text-amber-300">
          Backend uruchomił się o {formatClock(startedAt)} (restart albo
          deploy).
        </p>
      ) : null}

      {data && !current ? (
        <p className="mt-3 text-xs text-zinc-500">
          Backend zbiera pierwsze pomiary, pojawią się w ciągu 10 s.
        </p>
      ) : null}

      {data && current ? (
        <div
          className={`mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7 ${isStale ? "opacity-40" : ""}`}
        >
          <Gauge
            label="Opóźnienie pętli"
            value={formatMs(current.eventLoopLagP99Ms)}
            detail={`max ${formatMs(current.eventLoopLagMaxMs)} w 10 s`}
            level={loopLevel}
            history={pick(history, (sample) => sample.eventLoopLagP99Ms)}
          />
          <Gauge
            label="Czas odpowiedzi"
            value={formatMs(traffic?.p95Ms ?? null)}
            detail={`95% żądań, ${traffic?.requestsPerMinute ?? 0} żądań/min`}
            level={latencyLevel}
            history={pick(history, (sample) => sample.p95Ms)}
          />
          <Gauge
            label="Błędy (5 min)"
            value={String(errorCount)}
            detail={`5xx ${traffic?.serverErrors ?? 0} · przerwane ${traffic?.aborted ?? 0} · 429 ${traffic?.throttled ?? 0}`}
            level={errorLevel}
            history={pick(
              history,
              (sample) => sample.serverErrors + sample.aborted,
            )}
          />
          <Gauge
            label="CPU"
            value={`${Math.round(current.cpuPercent)}%`}
            detail="jednego rdzenia"
            level={cpuLevel}
            history={pick(history, (sample) => sample.cpuPercent)}
          />
          <Gauge
            label="RAM"
            value={`${Math.round(current.rssMb)} MB`}
            detail={`sterta ${Math.round(current.heapUsedMb)} z ${Math.round(data.heapLimitMb)} MB`}
            level={memoryLevel}
            history={pick(history, (sample) => sample.rssMb)}
          />
          <Gauge
            label="Baza danych"
            value={
              current.dbPingMs === null ? "brak" : formatMs(current.dbPingMs)
            }
            detail="czas odpowiedzi bazy"
            level={dbLevel}
            history={pick(history, (sample) => sample.dbPingMs)}
          />
          <Gauge
            label="Aktywne tablety"
            value={
              current.activeDevices === null
                ? "—"
                : String(current.activeDevices)
            }
            detail="w ostatnich 2 min"
            level="neutral"
            history={pick(history, (sample) => sample.activeDevices)}
          />
        </div>
      ) : null}
    </section>
  );
}
