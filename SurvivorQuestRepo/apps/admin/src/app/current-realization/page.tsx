"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { useGetScenariosQuery } from "@/features/scenario/api/scenario.api";
import type { Realization } from "@/features/realizations/types/realization";
import { useGetRealizationsQuery } from "@/features/realizations/api/realization.api";
import { EditRealizationPanel } from "@/features/realizations/components/edit-realization-panel";
import {
  useGetCurrentRealizationOverviewQuery,
  useFinishCurrentRealizationMutation,
  useResetCurrentRealizationMutation,
  useResetCurrentRealizationCompletedTasksMutation,
  useStartCurrentRealizationMutation,
} from "@/features/current-realization/api/current-realization.api";
import type { CurrentRealizationOverview } from "@/features/current-realization/types/current-realization-overview";
import { CurrentRealizationStationQrPanel } from "@/features/current-realization/components/current-realization-station-qr-panel";
import { CurrentRealizationTeamTasksPanel } from "@/features/current-realization/components/current-realization-team-tasks-panel";
import { AdminShell } from "@/shared/components/admin-shell";

const CurrentRealizationTeamsMap = dynamic(
  () =>
    import("@/features/current-realization/components/current-realization-teams-map").then(
      (module) => module.CurrentRealizationTeamsMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-sm text-zinc-500">
        Ładowanie mapy...
      </div>
    ),
  },
);

function renderTeamStatusLabel(status: "unassigned" | "ready" | "active" | "offline") {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "active") {
    return "Aktywna";
  }

  if (status === "offline") {
    return "Offline";
  }

  return "Nieprzypisana";
}

function renderTaskFailedReason(payload: Record<string, unknown>) {
  const reasonLabel = typeof payload.reasonLabel === "string" ? payload.reasonLabel.trim() : "";
  if (reasonLabel) {
    return reasonLabel;
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (!reason) {
    return "";
  }

  if (reason === "quiz_incorrect_answer") {
    return "Błędna odpowiedź quizu";
  }

  if (reason === "time_limit_expired") {
    return "Przekroczony limit czasu";
  }

  if (reason === "task_closed_before_completion") {
    return "Zamknięto zadanie przed ukończeniem";
  }

  return reason;
}

function renderQrRejectedReason(reason: string) {
  if (reason === "invalid_token") {
    return "Nieprawidłowy kod QR";
  }

  if (reason === "expired_token") {
    return "Kod QR wygasł";
  }

  if (reason === "realization_mismatch") {
    return "Kod QR z innej realizacji";
  }

  if (reason === "station_not_in_realization") {
    return "Stanowisko nie należy do tej realizacji";
  }

  if (reason === "station_not_found") {
    return "Nie znaleziono stanowiska dla kodu QR";
  }

  return "Kod QR został odrzucony";
}

function renderLogTitle(
  log: CurrentRealizationOverview["logs"][number],
  stationName: string | null,
) {
  if (log.eventType === "task_started") {
    return `Start zadania${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "task_completed") {
    return `Zadanie ukończone${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "task_failed") {
    return `Nieudane zadanie${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "team_profile_updated" || log.eventType === "team_customization_updated") {
    return "Personalizacja zakończona";
  }

  if (log.eventType === "team_joined") {
    return "Drużyna dołączyła";
  }

  if (log.eventType === "team_name_randomized") {
    return "Wylosowano nazwę drużyny";
  }

  if (log.eventType === "team_ready_for_start") {
    return "Drużyna gotowa do startu";
  }

  if (log.eventType === "station_qr_resolved") {
    return `Skan QR zaakceptowany${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "station_qr_rejected") {
    return "Skan QR odrzucony";
  }

  if (log.eventType === "realization_started") {
    return "Rozpoczęto realizację";
  }

  if (log.eventType === "realization_finished") {
    return "Zakończono realizację";
  }

  if (log.eventType === "realization_reset") {
    return "Zresetowano realizację";
  }

  if (log.eventType === "completed_tasks_reset") {
    return "Zresetowano ukończone zadania";
  }

  if (log.eventType === "task_reset_by_admin") {
    return `Zresetowano zadanie (admin)${stationName ? ` - ${stationName}` : ""}`;
  }

  if (log.eventType === "points_recalculated") {
    return "Przeliczono punkty drużyny";
  }

  if (log.eventType === "team_location_updated") {
    return "Zaktualizowano lokalizację drużyny";
  }

  return log.eventType.replaceAll("_", " ");
}

function renderLogDescription(
  log: CurrentRealizationOverview["logs"][number],
  stationName: string | null,
) {
  if (log.eventType === "task_failed") {
    return `Powód: ${renderTaskFailedReason(log.payload) || "nieznany"}`;
  }

  if (log.eventType === "task_completed") {
    const pointsAwarded =
      typeof log.payload.pointsAwarded === "number" ? log.payload.pointsAwarded : null;
    return pointsAwarded !== null ? `Zdobyte punkty: ${pointsAwarded}` : null;
  }

  if (log.eventType === "task_reset_by_admin") {
    return "Stan zadania ustawiono na „do zrobienia”.";
  }

  if (log.eventType === "station_qr_rejected") {
    const reason = typeof log.payload.reason === "string" ? log.payload.reason : "";
    return renderQrRejectedReason(reason);
  }

  if (log.eventType === "station_qr_resolved" && stationName) {
    return `Zeskanowano poprawny kod QR dla stanowiska ${stationName}.`;
  }

  if (log.eventType === "team_profile_updated" || log.eventType === "team_customization_updated") {
    const changedFields = Array.isArray(log.payload.changedFields)
      ? log.payload.changedFields.filter((value): value is string => typeof value === "string")
      : [];

    if (changedFields.length === 0) {
      return null;
    }

    const translated = changedFields.map((field) => {
      if (field === "name") return "nazwa";
      if (field === "color") return "kolor";
      if (field === "badge") return "odznaka";
      return field;
    });

    return `Zmieniono: ${translated.join(", ")}.`;
  }

  return null;
}

const AUTO_CURRENT_REALIZATION_VALUE = "__auto-current-realization__";

export default function CurrentRealizationPage() {
  const router = useRouter();
  const [isQrPanelOpen, setIsQrPanelOpen] = useState(false);
  const [editingRealization, setEditingRealization] = useState<Realization | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [visibleLogCount, setVisibleLogCount] = useState(20);
  const [selectedRealizationId, setSelectedRealizationId] = useState<"current" | string>("current");

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [resetCompletedTasks, { isLoading: isResettingTasks }] = useResetCurrentRealizationCompletedTasksMutation();
  const [startCurrentRealization, { isLoading: isStartingRealization }] = useStartCurrentRealizationMutation();
  const [finishCurrentRealization, { isLoading: isFinishingRealization }] = useFinishCurrentRealizationMutation();
  const [resetCurrentRealization, { isLoading: isResettingRealization }] = useResetCurrentRealizationMutation();
  const {
    data: realizations,
    isLoading: isRealizationsLoading,
  } = useGetRealizationsQuery(undefined, {
    skip: !meData,
    pollingInterval: 30_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const {
    data: scenarios,
    isLoading: isScenariosLoading,
  } = useGetScenariosQuery(undefined, { skip: !meData });
  const {
    data: stations,
    isLoading: isStationsLoading,
  } = useGetStationsQuery(undefined, { skip: !meData });
  const realizationOptions = useMemo(
    () =>
      [...(realizations ?? [])].sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() -
          new Date(right.scheduledAt).getTime(),
      ),
    [realizations],
  );
  const effectiveSelectedRealizationId =
    selectedRealizationId !== "current" &&
    realizationOptions.some(
      (realization) => realization.id === selectedRealizationId,
    )
      ? selectedRealizationId
      : "current";

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch,
  } = useGetCurrentRealizationOverviewQuery(
    effectiveSelectedRealizationId === "current"
      ? undefined
      : { realizationId: effectiveSelectedRealizationId },
    {
      skip: !meData,
      pollingInterval: 10_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const selectedRealizationArg =
    effectiveSelectedRealizationId === "current"
      ? undefined
      : { realizationId: effectiveSelectedRealizationId };

  const topTeams = useMemo(
    () => [...(overview?.teams ?? [])].sort((left, right) => right.points - left.points),
    [overview?.teams],
  );
  const topTeam = topTeams[0] ?? null;
  const remainingTasks = useMemo(
    () =>
      topTeams.reduce(
        (sum, team) => sum + Math.max(team.taskStats.total - team.taskStats.done, 0),
        0,
      ),
    [topTeams],
  );
  const sortedLogs = useMemo(
    () =>
      [...(overview?.logs ?? [])].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [overview?.logs],
  );
  const visibleLogs = useMemo(
    () => sortedLogs.slice(0, visibleLogCount),
    [sortedLogs, visibleLogCount],
  );
  const hasMoreLogs = visibleLogCount < sortedLogs.length;
  const stationNameById = useMemo(
    () => new Map((overview?.realization.stations ?? []).map((station) => [station.stationId, station.stationName])),
    [overview?.realization.stations],
  );
  const selectedOverviewRealization = useMemo(
    () =>
      overview
        ? realizationOptions.find((realization) => realization.id === overview.realization.id) ?? null
        : null,
    [overview, realizationOptions],
  );
  const editingTeam = useMemo(
    () =>
      editingTeamId
        ? overview?.teams.find((team) => team.id === editingTeamId) || null
        : null,
    [editingTeamId, overview?.teams],
  );
  const isEditActionDisabled =
    !selectedOverviewRealization ||
    isRealizationsLoading ||
    isScenariosLoading ||
    isStationsLoading;
  const actionButtonBaseClassName =
    "rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-20px_rgba(0,0,0,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none";
  const actionButtonNeutralClassName =
    "border-zinc-700/90 bg-zinc-900/70 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900";
  const actionButtonAmberClassName =
    "border-amber-400/45 bg-amber-500/10 text-amber-200 hover:border-amber-300/60 hover:bg-amber-500/18";
  const actionButtonEmeraldClassName =
    "border-emerald-400/45 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-500/18";
  const actionButtonOrangeClassName =
    "border-orange-400/45 bg-orange-500/10 text-orange-200 hover:border-orange-300/60 hover:bg-orange-500/18";
  const actionButtonRedClassName =
    "border-red-400/45 bg-red-500/10 text-red-200 hover:border-red-300/60 hover:bg-red-500/18";

  useEffect(() => {
    if (isMeError && isUnauthorizedError(meError)) {
      router.replace("/login");
    }
  }, [isMeError, meError, router]);

  useEffect(() => {
    setVisibleLogCount(20);
  }, [overview?.realization.id]);

  if (isMeLoading) {
    return <main className="p-8">Sprawdzanie sesji...</main>;
  }

  if (isMeError) {
    return <main className="p-8">Nie udało się sprawdzić sesji. Spróbuj odświeżyć stronę.</main>;
  }

  return (
    <AdminShell
      userEmail={meData?.user.email}
      isLoggingOut={isLoggingOut}
      onLogout={async () => {
        await logout().unwrap();
        router.replace("/login");
      }}
      contentClassName="space-y-6 p-4 sm:p-6 lg:p-8"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Aktualna realizacja</h1>
            {overview && (
              <p className="mt-2 text-sm text-zinc-400">
                {overview.realization.companyName} • {new Date(overview.realization.scheduledAt).toLocaleString("pl-PL")}
              </p>
            )}
            {overview && (
              <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                Status realizacji: {overview.realization.status}
              </p>
            )}
          </div>
          <div className="self-start rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-right text-xs text-amber-200">
            <p>Kod dołączenia</p>
            <p className="mt-0.5 text-sm font-semibold tracking-widest">
              {overview?.realization.joinCode ?? "---"}
            </p>
          </div>
        </div>

        {overview && realizationOptions.length > 0 ? (
          <div className="mt-4 max-w-96 space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-500">
              Wybór realizacji
            </label>
            <select
              value={
                effectiveSelectedRealizationId === "current"
                  ? AUTO_CURRENT_REALIZATION_VALUE
                  : effectiveSelectedRealizationId
              }
              onChange={(event) => {
                setIsQrPanelOpen(false);
                setEditingRealization(null);
                setEditingTeamId(null);
                setSelectedRealizationId(
                  event.target.value === AUTO_CURRENT_REALIZATION_VALUE
                    ? "current"
                    : event.target.value,
                );
              }}
              disabled={isOverviewLoading || isRealizationsLoading}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80 disabled:opacity-60"
            >
              <option value={AUTO_CURRENT_REALIZATION_VALUE}>
                Aktualna (auto)
              </option>
              {realizationOptions.map((realization) => (
                <option key={realization.id} value={realization.id}>
                  {realization.companyName} •{" "}
                  {new Date(realization.scheduledAt).toLocaleString("pl-PL")}{" "}
                  • {realization.status}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {overview && (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/55 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Akcje główne
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Uruchomić aplikację globalnie dla tej realizacji?")) {
                      return;
                    }

                    try {
                      await startCurrentRealization(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isStartingRealization || overview.realization.status === "in-progress"}
                  className={`${actionButtonBaseClassName} ${actionButtonEmeraldClassName}`}
                >
                  {isStartingRealization
                    ? "Uruchamianie..."
                    : overview.realization.status === "in-progress"
                      ? "Aplikacja uruchomiona"
                      : "Start aplikacji"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Zakończyć realizację?")) {
                      return;
                    }

                    try {
                      await finishCurrentRealization(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isFinishingRealization || overview.realization.status === "done"}
                  className={`${actionButtonBaseClassName} ${actionButtonNeutralClassName}`}
                >
                  {isFinishingRealization
                    ? "Zamykanie..."
                    : overview.realization.status === "done"
                      ? "Realizacja zakończona"
                      : "Zakończ realizację"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/55 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Akcje dodatkowe
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedOverviewRealization) {
                      return;
                    }
                    setEditingRealization(selectedOverviewRealization);
                  }}
                  disabled={isEditActionDisabled}
                  className={`${actionButtonBaseClassName} ${actionButtonAmberClassName}`}
                >
                  {isScenariosLoading || isStationsLoading ? "Ładowanie edytora..." : "Edytuj realizację"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQrPanelOpen(true);
                  }}
                  className={`${actionButtonBaseClassName} ${actionButtonNeutralClassName}`}
                >
                  Kody QR
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-red-200/90">
                Akcje krytyczne
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Czy na pewno chcesz zresetować wszystkie ukończone zadania?")) {
                      return;
                    }

                    try {
                      await resetCompletedTasks(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isResettingTasks}
                  className={`${actionButtonBaseClassName} ${actionButtonRedClassName}`}
                >
                  {isResettingTasks ? "Resetowanie..." : "Resetuj ukończone zadania"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Zresetować realizację? Usunie to podłączenia urządzeń i postęp zadań, ustawi status na planned oraz datę rozpoczęcia na teraz.",
                      )
                    ) {
                      return;
                    }

                    try {
                      await resetCurrentRealization(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isResettingRealization}
                  className={`${actionButtonBaseClassName} ${actionButtonOrangeClassName}`}
                >
                  {isResettingRealization ? "Resetowanie realizacji..." : "Reset realizacji"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isOverviewLoading && <p className="mt-4 text-sm text-zinc-400">Ładowanie podglądu realizacji...</p>}

        {isOverviewError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <p>Nie udało się pobrać podglądu aktualnej realizacji.</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(overviewError, null, 2)}</pre>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {overview && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Aktywne drużyny</p>
                <p className="mt-1 text-xl font-semibold text-zinc-100">{overview.stats.activeTeams}/{overview.realization.teamCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Lider punktów</p>
                <p className="mt-1 text-xl font-semibold text-amber-300">
                  {topTeam ? (topTeam.name || `Drużyna #${topTeam.slotNumber}`) : "-"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{topTeam ? `${topTeam.points} pkt` : "Brak danych"}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Ukończone zadania</p>
                <p className="mt-1 text-xl font-semibold text-zinc-100">{overview.stats.completedTasks}</p>
                <p className="mt-1 text-xs text-zinc-400">Pozostało: {remainingTasks}</p>
              </div>
            </div>

            <CurrentRealizationTeamsMap
              realization={overview.realization}
              teams={overview.teams}
              teamStationNumberingEnabled={selectedOverviewRealization?.teamStationNumberingEnabled ?? true}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
                  <div className="border-b border-zinc-800 px-4 py-3">
                    <h2 className="text-sm font-semibold text-zinc-100">Drużyny</h2>
                  </div>

                  <div className="divide-y divide-zinc-800 md:hidden">
                    {topTeams.map((team) => (
                      <article key={team.id} className="space-y-3 bg-zinc-900/60 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">
                              {team.name || `Drużyna #${team.slotNumber}`}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              Slot #{team.slotNumber} • {renderTeamStatusLabel(team.status)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-amber-300">{team.points} pkt</p>
                        </div>
                        <div className="grid gap-1.5 text-xs text-zinc-300">
                          <p>
                            <span className="text-zinc-500">Zadania:</span> {team.taskStats.done}/{team.taskStats.total}
                          </p>
                          <p>
                            <span className="text-zinc-500">Kolor:</span> {team.color || "-"}
                          </p>
                          <p>
                            <span className="text-zinc-500">Flaga:</span> {team.badgeKey || team.badgeImageUrl || "-"}
                          </p>
                          <p>
                            <span className="text-zinc-500">Lokalizacja:</span>{" "}
                            {team.lastLocation
                              ? `${team.lastLocation.lat.toFixed(4)}, ${team.lastLocation.lng.toFixed(4)}`
                              : "Brak"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(team.id)}
                          className="w-full rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                        >
                          Edytuj zadania
                        </button>
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-245 text-sm">
                      <thead className="bg-zinc-900 text-zinc-300">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Slot</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Nazwa</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Kolor</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Flaga</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Punkty</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Zadania</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Status drużyny</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Lokalizacja</th>
                          <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTeams.map((team) => (
                          <tr key={team.id} className="border-t border-zinc-800 bg-zinc-900/60">
                            <td className="px-3 py-2 text-zinc-300">#{team.slotNumber}</td>
                            <td className="px-3 py-2 font-medium text-zinc-100">{team.name || "-"}</td>
                            <td className="px-3 py-2 text-zinc-300">{team.color || "-"}</td>
                            <td className="px-3 py-2 text-zinc-300">{team.badgeKey || team.badgeImageUrl || "-"}</td>
                            <td className="px-3 py-2 font-semibold text-amber-300">{team.points}</td>
                            <td className="px-3 py-2 text-zinc-300">{team.taskStats.done}/{team.taskStats.total}</td>
                            <td className="px-3 py-2 text-zinc-300">{renderTeamStatusLabel(team.status)}</td>
                            <td className="px-3 py-2 text-zinc-400">
                              {team.lastLocation
                                ? `${team.lastLocation.lat.toFixed(4)}, ${team.lastLocation.lng.toFixed(4)}`
                                : "Brak"}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setEditingTeamId(team.id)}
                                className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                              >
                                Edytuj zadania
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Konfiguracja</h2>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    <p>
                      <span className="text-zinc-500">Status:</span> {overview.realization.status}
                    </p>
                    <p>
                      <span className="text-zinc-500">Lokalizacja wymagana:</span>{" "}
                      {overview.realization.locationRequired ? "Tak" : "Nie"}
                    </p>
                    <p>
                      <span className="text-zinc-500">Stanowiska:</span>{" "}
                      {overview.realization.stations.map((station) => station.stationName || station.stationId).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Log zdarzeń</h2>
                  <div className="mt-3 max-h-105 space-y-2.5 overflow-y-auto pr-1">
                    {visibleLogs.map((log) => (
                      <article key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3.5">
                        {(() => {
                          const stationId =
                            typeof log.payload.stationId === "string" ? log.payload.stationId : null;
                          const stationName = stationId
                            ? stationNameById.get(stationId) ?? `Stanowisko ${stationId}`
                            : null;
                          const title = renderLogTitle(log, stationName);
                          const description = renderLogDescription(log, stationName);
                          const teamLabel = log.teamName?.trim()
                            ? log.teamName
                            : log.teamSlot
                              ? `Drużyna #${log.teamSlot}`
                              : "System";

                          return (
                            <>
                              <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
                              {description ? (
                                <p className="mt-1 text-xs text-zinc-300">{description}</p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                <p>Drużyna: {teamLabel}</p>
                                <time dateTime={log.createdAt}>
                                  {new Date(log.createdAt).toLocaleString("pl-PL")}
                                </time>
                              </div>
                            </>
                          );
                        })()}
                      </article>
                    ))}
                    {visibleLogs.length === 0 && (
                      <p className="text-sm text-zinc-500">Brak eventów dla tej realizacji.</p>
                    )}
                  </div>
                  {hasMoreLogs ? (
                    <button
                      type="button"
                      onClick={() => setVisibleLogCount((current) => current + 20)}
                      className="mt-3 w-full rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                    >
                      Pokaż więcej logów
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {overview && isQrPanelOpen ? (
        <CurrentRealizationStationQrPanel
          realization={overview.realization}
          selectedRealizationId={selectedRealizationId === "current" ? undefined : selectedRealizationId}
          onClose={() => setIsQrPanelOpen(false)}
        />
      ) : null}
      {editingRealization ? (
        <EditRealizationPanel
          realization={editingRealization}
          scenarios={scenarios ?? []}
          stations={stations ?? []}
          userEmail={meData?.user.email}
          onSaved={setEditingRealization}
          onClose={() => setEditingRealization(null)}
        />
      ) : null}
      {overview && editingTeam ? (
        <CurrentRealizationTeamTasksPanel
          realization={overview.realization}
          team={editingTeam}
          selectedRealizationId={selectedRealizationId === "current" ? undefined : selectedRealizationId}
          onClose={() => setEditingTeamId(null)}
        />
      ) : null}
    </AdminShell>
  );
}


