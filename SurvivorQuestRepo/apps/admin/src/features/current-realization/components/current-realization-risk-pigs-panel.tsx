"use client";

import { useState } from "react";
import {
  RISK_PIG_LABELS,
  useGetRiskPigsQuery,
  useThrowRiskPigMutation,
  type RiskPigType,
} from "@/features/risk-quiz/api/risk-quiz.api";
import { resolveApiErrorMessage } from "@/shared/lib/api-error";

const PIG_TYPES = Object.keys(RISK_PIG_LABELS) as RiskPigType[];

type CurrentRealizationRiskPigsPanelProps = {
  realizationId: string;
};

export function CurrentRealizationRiskPigsPanel({
  realizationId,
}: CurrentRealizationRiskPigsPanelProps) {
  // Same cadence as the chat and the review queue — pigs run off polls, there is
  // no socket to be faster than.
  const { data: pigs } = useGetRiskPigsQuery(
    { realizationId },
    { pollingInterval: 5_000, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const [throwPig, { isLoading: isThrowing }] = useThrowRiskPigMutation();
  // One choice per team rather than one for the whole panel: during a game the
  // Game Master is picking a specific pig for a specific crew, not setting a
  // mode and then hunting for the right row.
  const [typeByTeam, setTypeByTeam] = useState<Record<string, RiskPigType>>({});
  const [throwError, setThrowError] = useState<string | null>(null);

  async function handleThrow(targetTeamId: string) {
    if (isThrowing) {
      return;
    }

    setThrowError(null);
    try {
      await throwPig({
        realizationId,
        targetTeamId,
        type: typeByTeam[targetTeamId] ?? "FLASHLIGHT",
      }).unwrap();
    } catch (error) {
      setThrowError(resolveApiErrorMessage(error) ?? "Nie udało się rzucić świni.");
    }
  }

  if (pigs && !pigs.enabled) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-100">Świnie</h2>
        <p className="text-xs text-zinc-500">
          Świnie są wyłączone dla tej realizacji. Włączysz je w ustawieniach realizacji.
        </p>
      </div>
    );
  }

  const teams = pigs?.teams ?? [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">Świnie</h2>

      {throwError ? (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {throwError}
        </div>
      ) : null}

      <div className="space-y-1.5">
        {teams.length === 0 ? (
          <p className="text-xs text-zinc-500">Brak drużyn w tej realizacji.</p>
        ) : null}

        {teams.map((team) => (
          <div
            key={team.teamId}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs"
          >
            <span className="font-medium text-zinc-100">{team.teamName}</span>
            <span className="text-zinc-500">{team.points} pkt</span>

            {team.heldPigType ? (
              <span className="text-amber-300">
                trzyma: {RISK_PIG_LABELS[team.heldPigType]}
              </span>
            ) : null}

            {team.activePigType ? (
              <span className="text-rose-300">
                oświniona: {RISK_PIG_LABELS[team.activePigType]}
                {team.activeFromName ? ` od ${team.activeFromName}` : ""}
                {team.activeSecondsLeft !== null ? ` · ${team.activeSecondsLeft}s` : ""}
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              <select
                value={typeByTeam[team.teamId] ?? "FLASHLIGHT"}
                onChange={(event) =>
                  setTypeByTeam((prev) => ({
                    ...prev,
                    [team.teamId]: event.target.value as RiskPigType,
                  }))
                }
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
              >
                {PIG_TYPES.map((pigType) => (
                  <option key={pigType} value={pigType}>
                    {RISK_PIG_LABELS[pigType]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleThrow(team.teamId)}
                disabled={isThrowing}
                className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-55"
              >
                🐷 Rzuć
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        Rzut z panelu omija ekonomię i nadpisuje świnię, która akurat działa na tej
        drużynie.
      </p>
    </div>
  );
}
