"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetCurrentRealizationOverviewQuery } from "@/features/current-realization/api/current-realization.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function CurrentRealizationPage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch,
  } = useGetCurrentRealizationOverviewQuery(undefined, {
    skip: !meData,
  });

  const topTeams = useMemo(
    () => [...(overview?.teams ?? [])].sort((left, right) => right.points - left.points),
    [overview?.teams],
  );

  useEffect(() => {
    if (isMeError && isUnauthorized(meError)) {
      router.replace("/login");
    }
  }, [isMeError, meError, router]);

  if (isMeLoading) {
    return <main className="p-8">Sprawdzanie sesji...</main>;
  }

  if (isMeError) {
    return <main className="p-8">Przekierowanie do logowania...</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar
        userEmail={meData?.user.email}
        isLoggingOut={isLoggingOut}
        onLogout={async () => {
          await logout().unwrap();
          router.replace("/login");
        }}
      />

      <div className="min-h-screen pl-72">
        <section className="space-y-6 p-6 lg:p-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Aktualna realizacja</h1>
                {overview && (
                  <p className="mt-2 text-sm text-zinc-400">
                    {overview.realization.companyName} • {new Date(overview.realization.scheduledAt).toLocaleString("pl-PL")}
                  </p>
                )}
              </div>

              {overview && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-right text-xs text-amber-200">
                  <p>Kod dołączenia</p>
                  <p className="mt-0.5 text-sm font-semibold tracking-widest">{overview.realization.joinCode}</p>
                </div>
              )}
            </div>

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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Aktywne drużyny</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-100">{overview.stats.activeTeams}/{overview.realization.teamCount}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Ukończone zadania</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-100">{overview.stats.completedTasks}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Suma punktów</p>
                    <p className="mt-1 text-xl font-semibold text-amber-300">{overview.stats.pointsTotal}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Eventy</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-100">{overview.stats.eventCount}</p>
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
                            <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Urządzenia</th>
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
                              <td className="px-3 py-2 text-zinc-300">{team.deviceCount}</td>
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
                          <span className="text-zinc-500">Gry:</span> {overview.realization.gameIds.join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <h2 className="text-sm font-semibold text-zinc-100">Log zdarzeń</h2>
                      <div className="mt-3 max-h-105 space-y-2 overflow-y-auto pr-1">
                        {overview.logs.map((log) => (
                          <article key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                            <p className="text-xs font-medium uppercase tracking-wider text-amber-300">{log.eventType}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {log.actorType} • {log.actorId} • {new Date(log.createdAt).toLocaleString("pl-PL")}
                            </p>
                          </article>
                        ))}
                        {overview.logs.length === 0 && (
                          <p className="text-sm text-zinc-500">Brak eventów dla tej realizacji.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
