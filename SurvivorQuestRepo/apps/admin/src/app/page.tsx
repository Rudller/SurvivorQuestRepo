"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { DashboardCalendar } from "@/features/dashboard/components/dashboard-calendar";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { useGetRealizationsQuery } from "@/features/realizations/api/realization.api";
import { getTaskCounts } from "@/features/tasks/lib/tasks.data";
import { AdminShell } from "@/shared/components/admin-shell";

export default function HomePage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const canManageAdminTasks = meData?.user.role === "admin";
  const { data: stations } = useGetStationsQuery(undefined, { skip: !canManageAdminTasks });
  const {
    data: realizations,
    isLoading: isRealizationsLoading,
    isError: isRealizationsError,
    refetch: refetchRealizations,
  } = useGetRealizationsQuery(undefined, {
    skip: !meData,
  });
  const taskCounts = getTaskCounts();

  const nearestRealization = useMemo(() => {
    if (!realizations?.length) {
      return null;
    }

    const sortedByDate = [...realizations].sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    );

    const nowTimestamp = Date.now();
    return (
      sortedByDate.find((realization) => new Date(realization.scheduledAt).getTime() >= nowTimestamp) ||
      sortedByDate[0]
    );
  }, [realizations]);

  const nearestStations = nearestRealization
    ? nearestRealization.scenarioStations.length > 0
      ? nearestRealization.scenarioStations
      : nearestRealization.stationIds
          .map((stationId) => stations?.find((station) => station.id === stationId))
          .filter((station): station is NonNullable<typeof station> => Boolean(station))
    : [];

  const nearestStationNames = nearestRealization
    ? nearestStations.map((station) => station.name).join(", ") || "-"
    : "-";

  const nearestTotalPoints = nearestStations.reduce((sum, station) => sum + station.points, 0);

  const nearestStatusBadgeClassName =
    nearestRealization?.status === "done"
      ? "bg-emerald-500/20 text-emerald-300"
      : nearestRealization?.status === "planned"
        ? "bg-sky-500/20 text-sky-300"
        : "bg-rose-500/20 text-rose-300";

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
      userRole={meData?.user.role}
      isLoggingOut={isLoggingOut}
      onLogout={async () => {
        await logout().unwrap();
        router.replace("/login");
      }}
      contentClassName="space-y-6 p-4 sm:p-6 lg:p-8"
    >
      {canManageAdminTasks ? (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Podgląd listy zadań</h1>
            <Link
              href="/tasks"
              className="text-sm font-medium text-amber-300 transition hover:text-amber-200"
            >
              Otwórz tablicę →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Do zrobienia</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">{taskCounts.todo}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-wider text-zinc-500">W trakcie</p>
              <p className="mt-2 text-2xl font-semibold text-sky-300">{taskCounts["in-progress"]}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Zrobione</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{taskCounts.done}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
          <div className="mb-4">
            <h1 className="text-xl font-semibold tracking-tight">Panel instruktora</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Szybki dostęp do realizacji, drużyn, kalendarza i czatu bez sekcji administracyjnych.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/current-realization"
              className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 transition hover:border-amber-300/60 hover:bg-amber-500/15"
            >
              <p className="text-sm font-semibold text-amber-200">Aktualna realizacja</p>
              <p className="mt-1 text-xs text-zinc-400">Drużyny, mapa, zadania i QR.</p>
            </Link>
            <Link
              href="/realizations"
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-600"
            >
              <p className="text-sm font-semibold text-zinc-100">Realizacje</p>
              <p className="mt-1 text-xs text-zinc-400">Lista i kody QR wybranych eventów.</p>
            </Link>
            <Link
              href="/calendar"
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-600"
            >
              <p className="text-sm font-semibold text-zinc-100">Kalendarz</p>
              <p className="mt-1 text-xs text-zinc-400">Terminy zaplanowanych realizacji.</p>
            </Link>
            <Link
              href="/chat"
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-600"
            >
              <p className="text-sm font-semibold text-zinc-100">Czat</p>
              <p className="mt-1 text-xs text-zinc-400">Komunikacja zespołu.</p>
            </Link>
          </div>
        </div>
      )}

      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Najbliższa realizacja</h2>
          <Link href="/realizations" className="text-sm font-medium text-amber-300 hover:text-amber-200">
            Zobacz wszystkie →
          </Link>
        </div>

        {isRealizationsLoading && <p className="text-sm text-zinc-400">Ładowanie realizacji...</p>}

        {!isRealizationsLoading && !nearestRealization && (
          <p className="text-sm text-zinc-400">Brak realizacji do wyświetlenia.</p>
        )}

        {!isRealizationsLoading && nearestRealization && (
          <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Firma</p>
              <p className="mt-1 text-base font-medium text-zinc-100">{nearestRealization.companyName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Stanowiska</p>
              <p className="mt-1 text-base font-medium text-zinc-100">{nearestStationNames}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Status</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${nearestStatusBadgeClassName}`}
              >
                {nearestRealization.status}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Termin</p>
              <p className="mt-1 text-base font-medium text-zinc-100">
                {new Date(nearestRealization.scheduledAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Skala</p>
              <p className="mt-1 text-base font-medium text-zinc-100">
                {nearestRealization.peopleCount} osób • {nearestRealization.positionsCount} stanowiska
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Punkty</p>
              <p className="mt-1 text-base font-medium text-amber-300">{nearestTotalPoints}</p>
            </div>
          </div>
        )}
      </div>

      <DashboardCalendar
        realizations={realizations}
        isLoading={isRealizationsLoading}
        isError={isRealizationsError}
        onRetry={refetchRealizations}
      />
    </AdminShell>
  );
}


