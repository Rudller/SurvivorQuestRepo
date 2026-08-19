"use client";

import { use, useState } from "react";
import { useGetRiskBoardQuery } from "@/features/risk-quiz/api/risk-quiz.api";

const POLL_INTERVAL_MS = 4000;

const TEAM_COLOR_HEX: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
};

export default function RiskQuizPrompterPage({
  params,
}: {
  params: Promise<{ realizationId: string }>;
}) {
  const { realizationId } = use(params);
  const [view, setView] = useState<"combined" | "teams">("teams");
  const { data, isLoading, isError } = useGetRiskBoardQuery(
    { realizationId },
    { pollingInterval: POLL_INTERVAL_MS },
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 bg-zinc-950 px-8 py-12 text-zinc-100">
      <div className="inline-flex rounded-2xl border border-zinc-700 bg-zinc-900 p-1.5">
        {(
          [
            { id: "teams", label: "Tabela drużyn" },
            { id: "combined", label: "Wynik wspólny" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setView(option.id)}
            className={`rounded-xl px-6 py-3 text-lg font-semibold transition ${
              view === option.id ? "bg-amber-400 text-zinc-950" : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-2xl text-zinc-400">Ładowanie wyników...</p>}
      {isError && (
        <p className="max-w-xl text-center text-xl text-red-300">
          Nie udało się pobrać wyników. Upewnij się, że jesteś zalogowany w panelu admina w tej przeglądarce.
        </p>
      )}

      {!isLoading && !isError && data && view === "combined" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-3xl uppercase tracking-widest text-zinc-400">Łączny wynik wszystkich drużyn</p>
          <p className="text-[12rem] font-black leading-none text-amber-300">{data.totalPoints}</p>
          <p className="text-2xl text-zinc-500">punktów</p>
        </div>
      ) : null}

      {!isLoading && !isError && data && view === "teams" ? (
        <div className="w-full max-w-4xl space-y-4">
          {data.teams.length === 0 ? (
            <p className="text-center text-2xl text-zinc-400">Brak drużyn w tej realizacji.</p>
          ) : (
            data.teams.map((team, index) => (
              <div
                key={team.id}
                className="flex items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-8 py-5"
              >
                <span className="w-12 text-3xl font-black text-zinc-500">#{index + 1}</span>
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: (team.color && TEAM_COLOR_HEX[team.color]) || "#71717a" }}
                />
                <span className="flex-1 text-3xl font-semibold">
                  {team.name || `Drużyna ${team.slotNumber}`}
                </span>
                <span className="text-4xl font-black text-amber-300">{team.points}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </main>
  );
}
