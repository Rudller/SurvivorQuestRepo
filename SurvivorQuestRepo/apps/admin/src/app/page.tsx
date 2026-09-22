"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { DashboardCalendar } from "@/features/dashboard/components/dashboard-calendar";
import { DashboardStatusBar } from "@/features/dashboard/components/dashboard-status-bar";
import { DashboardKpiRow, type KpiTile } from "@/features/dashboard/components/dashboard-kpi-row";
import { DashboardTeamRanking } from "@/features/dashboard/components/dashboard-team-ranking";
import { DashboardStationProgress } from "@/features/dashboard/components/dashboard-station-progress";
import { DashboardRecentEvents } from "@/features/dashboard/components/dashboard-recent-events";
import { DashboardUpcomingList } from "@/features/dashboard/components/dashboard-upcoming-list";
import { DashboardBusinessOverview } from "@/features/dashboard/components/dashboard-business-overview";
import { resolveDashboardMode } from "@/features/dashboard/model/dashboard-mode";
import { buildLiveSummary, getMinutesLeft } from "@/features/dashboard/model/live-summary";
import { buildBusinessSummary } from "@/features/dashboard/model/business-summary";
import {
  useGetCurrentRealizationOverviewQuery,
  useGetPendingPhotoReviewsQuery,
} from "@/features/current-realization/api/current-realization.api";
import { useGetRealizationsQuery } from "@/features/realizations/api/realization.api";
import { AdminShell } from "@/shared/components/admin-shell";

const RECENT_EVENTS_SHOWN = 8;
const UPCOMING_SHOWN = 4;

/** Odświeżanie zegara „zostało X”, żeby licznik nie czekał na kolejny poll. */
const CLOCK_TICK_MS = 30_000;

export default function HomePage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const isAdmin = meData?.user.role === "admin";

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useGetCurrentRealizationOverviewQuery(undefined, {
    skip: !meData,
    // Podgląd, nie sterowanie — rzadziej niż 10 s w /current-realization, bo
    // ten endpoint przy każdym wywołaniu czyta drużyny, urządzenia, postępy
    // i log zdarzeń realizacji.
    pollingInterval: 15_000,
  });

  const mode = resolveDashboardMode(overview, now);
  const isLive = mode === "live";

  const { data: pendingReviews } = useGetPendingPhotoReviewsQuery(undefined, {
    skip: !meData || !isLive,
    pollingInterval: 15_000,
  });

  const {
    data: realizations,
    isLoading: isRealizationsLoading,
    isError: isRealizationsError,
    refetch: refetchRealizations,
  } = useGetRealizationsQuery(undefined, { skip: !meData, pollingInterval: 60_000 });

  const liveSummary = useMemo(
    () => (overview ? buildLiveSummary(overview) : null),
    [overview],
  );

  const businessSummary = useMemo(
    () => (isAdmin && realizations ? buildBusinessSummary(realizations, now) : null),
    [isAdmin, realizations, now],
  );

  /**
   * `durationMinutes` nie przychodzi z `/mobile/admin/realizations/current`,
   * więc długość bierzemy z listy realizacji po tym samym id.
   */
  const currentRealizationRecord = overview
    ? realizations?.find((realization) => realization.id === overview.realization.id)
    : undefined;

  const minutesLeft = overview
    ? getMinutesLeft(
        overview.realization.scheduledAt,
        currentRealizationRecord?.durationMinutes,
        now,
      )
    : null;

  const daysUntil = overview
    ? Math.ceil((new Date(overview.realization.scheduledAt).getTime() - now) / 86_400_000)
    : null;

  const upcomingRealizations = useMemo(() => {
    if (!realizations?.length) {
      return [];
    }

    return [...realizations]
      .filter((realization) => new Date(realization.scheduledAt).getTime() >= now)
      .sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
      )
      .slice(0, UPCOMING_SHOWN);
  }, [realizations, now]);

  const kpiTiles: KpiTile[] = useMemo(() => {
    if (isLive && liveSummary) {
      const pendingCount = pendingReviews?.length ?? 0;

      return [
        {
          label: "Drużyny w grze",
          value: `${liveSummary.teamsActive}/${liveSummary.teamsTotal}`,
          hint: "aktywne / dołączone",
        },
        {
          label: "Postęp stanowisk",
          value: `${liveSummary.tasksDone}/${liveSummary.tasksTotal}`,
          hint: `${liveSummary.tasksPercent}% zadań`,
        },
        {
          label: "Do akceptacji",
          value: String(pendingCount),
          hint: pendingCount > 0 ? "czeka na Mistrza Gry" : "nic nie czeka",
          tone: pendingCount > 0 ? "alert" : "default",
          href: "/current-realization",
        },
        {
          label: "Punkty łącznie",
          value: String(liveSummary.pointsTotal),
        },
      ];
    }

    if (!overview) {
      return [];
    }

    return [
      {
        label: mode === "upcoming" ? "Do startu" : "Termin",
        value: daysUntil !== null && daysUntil >= 0 ? `${daysUntil} dni` : "minął",
      },
      { label: "Drużyn zaplanowanych", value: String(overview.realization.teamCount) },
      { label: "Stanowisk", value: String(overview.realization.stations.length) },
      { label: "Kod dołączenia", value: overview.realization.joinCode },
    ];
  }, [isLive, liveSummary, pendingReviews, overview, mode, daysUntil]);

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

  const hasLoadError = isOverviewError && isRealizationsError;

  return (
    <AdminShell
      userEmail={meData?.user.email}
      userRole={meData?.user.role}
      isLoggingOut={isLoggingOut}
      onLogout={async () => {
        await logout().unwrap();
        router.replace("/login");
      }}
      contentClassName="space-y-6 p-4 sm:p-6 lg:p-8"
    >
      <h1 className="sr-only">Panel główny</h1>

      {hasLoadError && (
        <div className="sq-error-banner flex flex-wrap items-center justify-between gap-2">
          <span>Nie udało się pobrać danych panelu.</span>
          <button
            type="button"
            onClick={() => {
              refetchOverview();
              refetchRealizations();
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm hover:border-amber-400/40"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {isOverviewLoading ? (
        <div className="h-28 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/60" />
      ) : (
        <DashboardStatusBar
          mode={mode}
          realization={overview?.realization ?? null}
          minutesLeft={minutesLeft}
          daysUntil={daysUntil}
        />
      )}

      {kpiTiles.length > 0 && <DashboardKpiRow tiles={kpiTiles} />}

      {isLive && liveSummary && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardTeamRanking teams={liveSummary.ranking} />
            <DashboardStationProgress stations={liveSummary.stations} />
          </div>

          <DashboardRecentEvents
            logs={(overview?.logs ?? []).slice(0, RECENT_EVENTS_SHOWN)}
            stations={overview?.realization.stations ?? []}
          />
        </>
      )}

      {!isLive &&
        (isRealizationsLoading ? (
          <div className="h-40 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/60" />
        ) : (
          <DashboardUpcomingList realizations={upcomingRealizations} />
        ))}

      {businessSummary && <DashboardBusinessOverview summary={businessSummary} />}

      <DashboardCalendar
        realizations={realizations ?? []}
        isLoading={isRealizationsLoading}
        isError={isRealizationsError}
        onRetry={refetchRealizations}
      />
    </AdminShell>
  );
}
