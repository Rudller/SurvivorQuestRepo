"use client";

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
import { AdminShell } from "@/shared/components/admin-shell";

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
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [editingRealization, setEditingRealization] = useState<Realization | null>(null);
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
  const isEditActionDisabled =
    !selectedOverviewRealization ||
    isRealizationsLoading ||
    isScenariosLoading ||
    isStationsLoading;

  useEffect(() => {
    if (isMeError && isUnauthorizedError(meError)) {
      router.replace("/login");
    }
  }, [isMeError, meError, router]);

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
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6">
        <div className="absolute right-4 top-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-right text-xs text-amber-200">
          <p>Kod dołączenia</p>
          <p className="mt-0.5 text-sm font-semibold tracking-widest">
            {overview?.realization.joinCode ?? "---"}
          </p>
        </div>

        <div className="pr-30 sm:pr-44">
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
            {overview && realizationOptions.length > 0 ? (
              <div className="mt-3 max-w-96 space-y-1.5">
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
                    setIsActionsMenuOpen(false);
                    setIsQrPanelOpen(false);
                    setEditingRealization(null);
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
          </div>
        </div>

        {overview && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen((current) => !current)}
                aria-expanded={isActionsMenuOpen}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                <img
                  src="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/chevrons-down.svg"
                  alt=""
                  aria-hidden="true"
                  className={`h-4 w-4 invert opacity-80 transition-transform ${isActionsMenuOpen ? "rotate-180" : ""}`}
                />
                {isActionsMenuOpen ? "Ukryj akcje realizacji" : "Pokaż akcje realizacji"}
                <img
                  src="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/chevrons-down.svg"
                  alt=""
                  aria-hidden="true"
                  className={`h-4 w-4 invert opacity-80 transition-transform ${isActionsMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {isActionsMenuOpen ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setIsQrPanelOpen(true);
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                >
                  Kody QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedOverviewRealization) {
                      return;
                    }
                    setIsActionsMenuOpen(false);
                    setEditingRealization(selectedOverviewRealization);
                  }}
                  disabled={isEditActionDisabled}
                  className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isScenariosLoading || isStationsLoading ? "Ładowanie edytora..." : "Edytuj realizację"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Uruchomić aplikację globalnie dla tej realizacji?")) {
                      return;
                    }

                    try {
                      setIsActionsMenuOpen(false);
                      await startCurrentRealization(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isStartingRealization || overview.realization.status === "in-progress"}
                  className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                      setIsActionsMenuOpen(false);
                      await finishCurrentRealization(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isFinishingRealization || overview.realization.status === "done"}
                  className="rounded-md border border-zinc-400/40 bg-zinc-500/10 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFinishingRealization
                    ? "Zamykanie..."
                    : overview.realization.status === "done"
                      ? "Realizacja zakończona"
                      : "Zakończ realizację"}
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
                      setIsActionsMenuOpen(false);
                      await resetCurrentRealization(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isResettingRealization}
                  className="rounded-md border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResettingRealization ? "Resetowanie realizacji..." : "Reset realizacji"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Czy na pewno chcesz zresetować wszystkie ukończone zadania?")) {
                      return;
                    }

                    try {
                      setIsActionsMenuOpen(false);
                      await resetCompletedTasks(selectedRealizationArg).unwrap();
                    } catch {
                      // handled by query error rendering/refetch path
                    }
                  }}
                  disabled={isResettingTasks}
                  className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResettingTasks ? "Resetowanie..." : "Resetuj ukończone zadania"}
                </button>
              </div>
            ) : null}
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

            <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <h2 className="text-sm font-semibold text-zinc-100">Drużyny</h2>
                </div>
                <div className="overflow-x-auto">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    {sortedLogs.map((log) => (
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
                    {sortedLogs.length === 0 && (
                      <p className="text-sm text-zinc-500">Brak eventów dla tej realizacji.</p>
                    )}
                  </div>
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
    </AdminShell>
  );
}


