import { SummaryCard } from "@/shared/components/summary-card";
import { resolveTeamColorHex } from "@/shared/lib/team-colors";
import type { RankedTeam } from "../model/live-summary";

export function DashboardTeamRanking({ teams }: { teams: RankedTeam[] }) {
  return (
    <SummaryCard title="Ranking drużyn">
      {teams.length === 0 ? (
        <p className="text-sm text-zinc-400">Żadna drużyna nie dołączyła jeszcze do gry.</p>
      ) : (
        <ol className="space-y-3">
          {teams.map((team, index) => (
            <li key={team.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-xs text-zinc-500">{index + 1}</span>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-700"
                  style={{ backgroundColor: resolveTeamColorHex(team.color) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{team.name}</span>
                {team.isOffline && (
                  <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                    offline
                  </span>
                )}
                <span className="shrink-0 text-sm font-semibold text-amber-300">{team.points}</span>
              </div>

              <div className="flex items-center gap-2 pl-6">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-400/70"
                    style={{ width: `${team.progressPercent}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                  {team.tasksDone}/{team.tasksTotal}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SummaryCard>
  );
}
