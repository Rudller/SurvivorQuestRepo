"use client";

import { Fragment, useMemo, useState } from "react";
import {
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
  useResetCurrentRealizationTeamTaskMutation,
} from "../api/current-realization.api";
import {
  useCancelRiskRemoteDrawMutation,
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
  useGetRiskTeamBoardQuery,
  useResetRiskCardMutation,
  useTriggerRiskRemoteDrawMutation,
} from "@/features/risk-quiz/api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS } from "@/features/risk-quiz/types/risk-quiz";
import type { RiskDifficulty, RiskTeamBoardTask } from "@/features/risk-quiz/types/risk-quiz";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";

type CurrentRealizationTeamTasksPanelProps = {
  realization: CurrentRealizationOverview["realization"];
  team: CurrentRealizationOverview["teams"][number];
  selectedRealizationId?: string;
  canManageTasks?: boolean;
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

function formatDurationLabel(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) {
    return "-";
  }

  const startedMs = new Date(startedAt).getTime();
  const finishedMs = new Date(finishedAt).getTime();
  if (!Number.isFinite(startedMs) || !Number.isFinite(finishedMs) || finishedMs < startedMs) {
    return "-";
  }

  const totalSeconds = Math.round((finishedMs - startedMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function riskDifficultyLabel(value: string) {
  return RISK_DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function CurrentRealizationTeamTasksPanel({
  realization,
  team,
  selectedRealizationId,
  canManageTasks = false,
  onClose,
}: CurrentRealizationTeamTasksPanelProps) {
  const [resetTask, { isLoading: isResetting }] = useResetCurrentRealizationTeamTaskMutation();
  const [completeTask, { isLoading: isCompleting }] = useCompleteCurrentRealizationTeamTaskMutation();
  const [failTask, { isLoading: isFailing }] = useFailCurrentRealizationTeamTaskMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ stationId: string; action: TaskAction } | null>(null);
  const [isEndingParticipation, setIsEndingParticipation] = useState(false);

  const isMutating = isResetting || isCompleting || isFailing || isEndingParticipation;
  // Ryzykanci realizations don't have a scenario/stations at all — their
  // gameplay is entirely card-driven (RiskCard/RiskAttempt); the board below
  // shows the pool stations behind those cards instead of scenario stations.
  const isRiskQuizRealization = realization.type === "risk-quiz";

  const {
    data: riskBoard,
    isLoading: isRiskBoardLoading,
    isError: isRiskBoardError,
  } = useGetRiskTeamBoardQuery(
    { realizationId: realization.id, teamId: team.id },
    { skip: !isRiskQuizRealization },
  );
  const [completeRiskCard, { isLoading: isCompletingRiskCard }] = useCompleteRiskCardMutation();
  const [failRiskCard, { isLoading: isFailingRiskCard }] = useFailRiskCardMutation();
  const [resetRiskCard, { isLoading: isResettingRiskCard }] = useResetRiskCardMutation();
  const [pendingRiskAction, setPendingRiskAction] = useState<{ stationId: string; action: TaskAction } | null>(
    null,
  );
  const isMutatingRiskCard = isCompletingRiskCard || isFailingRiskCard || isResettingRiskCard;
  const [triggerRemoteDraw, { isLoading: isTriggeringRemoteDraw }] = useTriggerRiskRemoteDrawMutation();
  const [cancelRemoteDraw, { isLoading: isCancellingRemoteDraw }] = useCancelRiskRemoteDrawMutation();
  const [pendingRemoteDrawKey, setPendingRemoteDrawKey] = useState<string | null>(null);
  const isMutatingRemoteDraw = isTriggeringRemoteDraw || isCancellingRemoteDraw;

  const stationsWithTaskState = useMemo(() => {
    const taskByStationId = new Map(team.tasks.map((task) => [task.stationId, task]));
    return realization.stations.map((station, index) => {
      const task = taskByStationId.get(station.stationId);
      return {
        stationId: station.stationId,
        stationNumber: task?.stationNumber,
        fallbackOrder: index,
        stationName: station.stationName || station.stationId,
        defaultPoints: station.defaultPoints,
        completionStopwatchEnabled: station.completionStopwatchEnabled,
        status: task?.status ?? "todo",
        pointsAwarded: task?.pointsAwarded ?? 0,
        startedAt: task?.startedAt ?? null,
        finishedAt: task?.finishedAt ?? null,
      };
    }).sort((left, right) => {
      if (typeof left.stationNumber === "number" && typeof right.stationNumber === "number") {
        return left.stationNumber - right.stationNumber;
      }

      return left.fallbackOrder - right.fallbackOrder;
    });
  }, [realization.stations, team.tasks]);

  const remainingStationsCount = stationsWithTaskState.filter(
    (task) => task.status === "todo" || task.status === "in-progress",
  ).length;

  const title = team.name?.trim() || `Drużyna #${team.slotNumber}`;

  async function handleTaskAction(stationId: string, action: TaskAction) {
    if (!canManageTasks) {
      return;
    }

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

  async function handleRiskCardAction(stationId: string, action: TaskAction) {
    if (!canManageTasks) {
      return;
    }

    const stationLabel =
      riskBoard?.tasks.find((item) => item.stationId === stationId)?.stationName || stationId;
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
    setPendingRiskAction({ stationId, action });
    try {
      const basePayload = { realizationId: realization.id, teamId: team.id, stationId };
      if (action === "reset") {
        await resetRiskCard(basePayload).unwrap();
      } else if (action === "complete") {
        await completeRiskCard(basePayload).unwrap();
      } else {
        await failRiskCard(basePayload).unwrap();
      }
    } catch {
      setActionError("Nie udało się zapisać zmian karty drużyny.");
    } finally {
      setPendingRiskAction(null);
    }
  }

  const riskTaskGroups = useMemo(() => {
    type RiskTaskGroup = {
      key: string;
      categoryId: string;
      categoryName: string;
      difficulty: RiskDifficulty;
      tasks: RiskTeamBoardTask[];
    };

    if (!riskBoard) {
      return [] as RiskTaskGroup[];
    }

    const groups: RiskTaskGroup[] = [];
    const groupByKey = new Map<string, RiskTaskGroup>();

    for (const task of riskBoard.tasks) {
      const key = `${task.categoryId}:${task.difficulty}`;
      let group = groupByKey.get(key);
      if (!group) {
        group = {
          key,
          categoryId: task.categoryId,
          categoryName: task.categoryName,
          difficulty: task.difficulty,
          tasks: [],
        };
        groupByKey.set(key, group);
        groups.push(group);
      }
      group.tasks.push(task);
    }

    return groups;
  }, [riskBoard]);

  const pendingDrawKey = riskBoard?.pendingDraw
    ? `${riskBoard.pendingDraw.categoryId}:${riskBoard.pendingDraw.difficulty}`
    : null;
  const pendingDrawLabel = riskBoard?.pendingDraw
    ? `${riskBoard.pendingDraw.categoryName} — ${riskDifficultyLabel(riskBoard.pendingDraw.difficulty)}`
    : null;

  async function handleTriggerRemoteDraw(categoryId: string, difficulty: RiskDifficulty, groupLabel: string) {
    if (!canManageTasks) {
      return;
    }

    if (!window.confirm(`Uruchomić losową kartę z puli "${groupLabel}" na tablecie tej drużyny?`)) {
      return;
    }

    setActionError(null);
    setPendingRemoteDrawKey(`${categoryId}:${difficulty}`);
    try {
      await triggerRemoteDraw({ realizationId: realization.id, teamId: team.id, categoryId, difficulty }).unwrap();
    } catch {
      setActionError("Nie udało się uruchomić karty na tablecie tej drużyny.");
    } finally {
      setPendingRemoteDrawKey(null);
    }
  }

  async function handleCancelRemoteDraw() {
    if (!canManageTasks) {
      return;
    }

    setActionError(null);
    setPendingRemoteDrawKey("cancel");
    try {
      await cancelRemoteDraw({ realizationId: realization.id, teamId: team.id }).unwrap();
    } catch {
      setActionError("Nie udało się anulować aktywnej karty tej drużyny.");
    } finally {
      setPendingRemoteDrawKey(null);
    }
  }

  async function handleEndParticipation() {
    if (!canManageTasks) {
      return;
    }

    const remainingStations = stationsWithTaskState.filter(
      (task) => task.status === "todo" || task.status === "in-progress",
    );
    if (remainingStations.length === 0) {
      return;
    }

    if (
      !window.confirm(
        `Zakończyć udział drużyny "${title}"? ${remainingStations.length} pozostałych zadań zostanie oznaczonych jako niezaliczone.`,
      )
    ) {
      return;
    }

    setActionError(null);
    setIsEndingParticipation(true);
    try {
      for (const station of remainingStations) {
        await failTask({
          realizationId: selectedRealizationId,
          teamId: team.id,
          stationId: station.stationId,
          reason: "Zakończenie udziału drużyny (decyzja administratora)",
        }).unwrap();
      }
    } catch {
      setActionError("Nie udało się zakończyć udziału drużyny dla wszystkich zadań.");
    } finally {
      setIsEndingParticipation(false);
    }
  }

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
              <h2 className="text-xl font-semibold text-zinc-100">
                {canManageTasks ? "Edycja zadań drużyny" : "Zadania drużyny"}
              </h2>
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

          {isRiskQuizRealization ? (
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
              {isRiskBoardLoading && <p className="p-3 text-sm text-zinc-400">Ładowanie kart...</p>}
              {isRiskBoardError && (
                <p className="p-3 text-sm text-red-200">Nie udało się pobrać kart Ryzykantów dla tej drużyny.</p>
              )}
              {!isRiskBoardLoading && !isRiskBoardError && riskBoard && riskBoard.tasks.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">
                  Ta realizacja nie ma jeszcze przypisanej talii albo talia nie ma kategorii — brak zadań do
                  wyświetlenia.
                </p>
              ) : null}
              {!isRiskBoardLoading && !isRiskBoardError && riskBoard && riskBoard.tasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-220 text-sm">
                    <thead className="bg-zinc-900 text-zinc-300">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Kategoria</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Trudność</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Zadanie</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Punkty</th>
                        {canManageTasks ? (
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Akcje</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {riskTaskGroups.map((group) => {
                        const isThisGroupPending = pendingDrawKey === group.key;
                        const isBlockedByOtherPendingDraw = Boolean(pendingDrawKey) && !isThisGroupPending;
                        const isTriggeringThisGroup = pendingRemoteDrawKey === group.key && isTriggeringRemoteDraw;
                        const isCancellingThisGroup = pendingRemoteDrawKey === "cancel" && isCancellingRemoteDraw;

                        return (
                          <Fragment key={group.key}>
                            <tr className="border-t border-zinc-800 bg-zinc-900/40">
                              <td colSpan={canManageTasks ? 6 : 5} className="px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {group.categoryName} — {riskDifficultyLabel(group.difficulty)}
                                  </span>
                                  {canManageTasks ? (
                                    isThisGroupPending ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleCancelRemoteDraw()}
                                        disabled={isMutatingRemoteDraw}
                                        className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                      >
                                        {isCancellingThisGroup ? "Anulowanie..." : "Anuluj aktywną kartę"}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleTriggerRemoteDraw(
                                            group.categoryId,
                                            group.difficulty,
                                            `${group.categoryName} — ${riskDifficultyLabel(group.difficulty)}`,
                                          )
                                        }
                                        disabled={isBlockedByOtherPendingDraw || isMutatingRemoteDraw}
                                        title={
                                          isBlockedByOtherPendingDraw
                                            ? `Drużyna ma już aktywną kartę (${pendingDrawLabel}).`
                                            : undefined
                                        }
                                        className="rounded-md border border-sky-400/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        {isTriggeringThisGroup ? "Uruchamianie..." : "Uruchom na tablecie"}
                                      </button>
                                    )
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            {group.tasks.map((task) => {
                              const isPendingForRow = pendingRiskAction?.stationId === task.stationId;
                              return (
                                <tr key={`${group.key}:${task.stationId}`} className="border-t border-zinc-800 bg-zinc-900/60">
                                  <td className="px-3 py-2 text-zinc-100">{task.categoryName}</td>
                                  <td className="px-3 py-2 text-zinc-300">{riskDifficultyLabel(task.difficulty)}</td>
                                  <td className="px-3 py-2 text-zinc-100">{task.stationName}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${resolveTaskStatusClassName(task.status)}`}
                                    >
                                      {renderTaskStatusLabel(task.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-amber-300">{task.pointsAwarded}</td>
                                  {canManageTasks ? (
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleRiskCardAction(task.stationId, "reset")}
                                          disabled={isMutatingRiskCard}
                                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          {isPendingForRow && pendingRiskAction?.action === "reset" ? "Reset..." : "Reset"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleRiskCardAction(task.stationId, "complete")}
                                          disabled={isMutatingRiskCard}
                                          className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          {isPendingForRow && pendingRiskAction?.action === "complete"
                                            ? "Zapisywanie..."
                                            : "Zalicz"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleRiskCardAction(task.stationId, "fail")}
                                          disabled={isMutatingRiskCard}
                                          className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          {isPendingForRow && pendingRiskAction?.action === "fail"
                                            ? "Zapisywanie..."
                                            : "Niezalicz"}
                                        </button>
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {canManageTasks ? (
                <section className="rounded-lg border border-rose-900/70 bg-rose-950/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-rose-300">Zakończ udział drużyny</p>
                  <p className="mt-2 text-xs text-rose-200">
                    Wszystkie pozostałe (nieukończone) zadania tej drużyny zostaną oznaczone jako niezaliczone. Zadania
                    już zaliczone lub niezaliczone nie zostaną zmienione.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleEndParticipation()}
                    disabled={isMutating || remainingStationsCount === 0}
                    className="mt-3 rounded-lg border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isEndingParticipation ? "Kończenie udziału..." : "Zakończ udział drużyny"}
                  </button>
                </section>
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
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Czas wykonania</th>
                        {canManageTasks ? (
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Akcje</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {stationsWithTaskState.map((task) => {
                        const isPendingForRow = pendingAction?.stationId === task.stationId;
                        return (
                          <tr key={task.stationId} className="border-t border-zinc-800 bg-zinc-900/60">
                            <td className="px-3 py-2 text-zinc-100">
                              {typeof task.stationNumber === "number" ? `${task.stationNumber}. ` : ""}
                              {task.stationName}
                            </td>
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
                            <td className="px-3 py-2 text-zinc-400">
                              {task.completionStopwatchEnabled
                                ? formatDurationLabel(task.startedAt, task.finishedAt)
                                : "-"}
                            </td>
                            {canManageTasks ? (
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
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
