"use client";

import { useMemo, useState } from "react";
import {
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
  useResetCurrentRealizationTeamTaskMutation,
} from "../api/current-realization.api";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";

type CurrentRealizationTeamTasksPanelProps = {
  realization: CurrentRealizationOverview["realization"];
  team: CurrentRealizationOverview["teams"][number];
  selectedRealizationId?: string;
  onClose: () => void;
};

type TeamTaskStatus = CurrentRealizationOverview["teams"][number]["tasks"][number]["status"];
type TaskAction = "reset" | "complete" | "fail";

function renderTaskStatusLabel(status: TeamTaskStatus) {
  if (status === "in-progress") {
    return "W trakcie";
  }
  if (status === "done") {
    return "Zaliczone";
  }
  if (status === "failed") {
    return "Niezaliczone";
  }
  return "Do zrobienia";
}

function resolveTaskStatusClassName(status: TeamTaskStatus) {
  if (status === "done") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "failed") {
    return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }
  if (status === "in-progress") {
    return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

export function CurrentRealizationTeamTasksPanel({
  realization,
  team,
  selectedRealizationId,
  onClose,
}: CurrentRealizationTeamTasksPanelProps) {
  const [resetTask, { isLoading: isResetting }] = useResetCurrentRealizationTeamTaskMutation();
  const [completeTask, { isLoading: isCompleting }] = useCompleteCurrentRealizationTeamTaskMutation();
  const [failTask, { isLoading: isFailing }] = useFailCurrentRealizationTeamTaskMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ stationId: string; action: TaskAction } | null>(null);

  const isMutating = isResetting || isCompleting || isFailing;

  const stationsWithTaskState = useMemo(() => {
    const taskByStationId = new Map(team.tasks.map((task) => [task.stationId, task]));
    return realization.stations.map((station) => {
      const task = taskByStationId.get(station.stationId);
      return {
        stationId: station.stationId,
        stationName: station.stationName || station.stationId,
        defaultPoints: station.defaultPoints,
        status: task?.status ?? "todo",
        pointsAwarded: task?.pointsAwarded ?? 0,
        finishedAt: task?.finishedAt ?? null,
      };
    });
  }, [realization.stations, team.tasks]);

  async function handleTaskAction(stationId: string, action: TaskAction) {
    const stationLabel =
      stationsWithTaskState.find((item) => item.stationId === stationId)?.stationName || stationId;
    const confirmationMessage =
      action === "reset"
        ? `Zresetować zadanie "${stationLabel}" dla tej drużyny do statusu "todo"?`
        : action === "complete"
          ? `Oznaczyć zadanie "${stationLabel}" jako zaliczone?`
          : `Oznaczyć zadanie "${stationLabel}" jako niezaliczone?`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setActionError(null);
    setPendingAction({ stationId, action });
    try {
      const basePayload = {
        realizationId: selectedRealizationId,
        teamId: team.id,
        stationId,
      };
      if (action === "reset") {
        await resetTask(basePayload).unwrap();
      } else if (action === "complete") {
        await completeTask(basePayload).unwrap();
      } else {
        await failTask(basePayload).unwrap();
      }
    } catch {
      setActionError("Nie udało się zapisać zmian zadania drużyny.");
    } finally {
      setPendingAction(null);
    }
  }

  const title = team.name?.trim() || `Drużyna #${team.slotNumber}`;

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel edycji zadań drużyny"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-6xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Edycja zadań drużyny</h2>
              <p className="mt-1 text-sm text-zinc-300">
                {title} • Slot #{team.slotNumber}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Realizacja: {realization.companyName} • punkty drużyny: {team.points}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
          </div>

          {actionError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {actionError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
            <div className="overflow-x-auto">
              <table className="w-full min-w-220 text-sm">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Stanowisko</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Punkty</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Domyślne pkt</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Ukończono</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {stationsWithTaskState.map((task) => {
                    const isPendingForRow = pendingAction?.stationId === task.stationId;
                    return (
                      <tr key={task.stationId} className="border-t border-zinc-800 bg-zinc-900/60">
                        <td className="px-3 py-2 text-zinc-100">{task.stationName}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${resolveTaskStatusClassName(task.status)}`}
                          >
                            {renderTaskStatusLabel(task.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-amber-300">{task.pointsAwarded}</td>
                        <td className="px-3 py-2 text-zinc-300">{task.defaultPoints}</td>
                        <td className="px-3 py-2 text-zinc-400">
                          {task.finishedAt ? new Date(task.finishedAt).toLocaleString("pl-PL") : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleTaskAction(task.stationId, "reset")}
                              disabled={isMutating}
                              className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {isPendingForRow && pendingAction?.action === "reset" ? "Reset..." : "Reset"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleTaskAction(task.stationId, "complete")}
                              disabled={isMutating}
                              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {isPendingForRow && pendingAction?.action === "complete" ? "Zapisywanie..." : "Zalicz"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleTaskAction(task.stationId, "fail")}
                              disabled={isMutating}
                              className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {isPendingForRow && pendingAction?.action === "fail" ? "Zapisywanie..." : "Niezalicz"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
