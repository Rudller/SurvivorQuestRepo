"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import type { Station } from "@/features/games/types/station";
import { AdminSidebar } from "@/shared/components/admin-sidebar";
import { StationsTable } from "@/features/games/components/stations-table";
import { CreateStationForm } from "@/features/games/components/create-station-form";
import { EditStationModal } from "@/features/games/components/edit-station-modal";
import type { StationSortField, SortDirection } from "@/features/games/station.utils";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function StationPage() {
  const router = useRouter();

  const { data: meData, isLoading: isMeLoading, isError: isMeError, error: meError } = useMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data: games, isLoading: isGamesLoading, isError, error, refetch } = useGetStationsQuery(undefined, {
    skip: !meData,
  });

  const [sortField, setSortField] = useState<StationSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingGame, setEditingGame] = useState<Station | null>(null);

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
        <section className="space-y-5 p-6 lg:space-y-6 lg:p-8">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)] xl:items-start">
            <CreateStationForm />

            <div className="space-y-5 xl:order-1">
              {isGamesLoading && <p className="text-zinc-400">Ładowanie stanowisk...</p>}

              {isError && (
                <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <p>Nie udało się pobrać stanowisk.</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(error, null, 2)}</pre>
                  <button onClick={() => refetch()} className="mt-2 rounded bg-amber-400 px-3 py-1.5 text-zinc-950">
                    Spróbuj ponownie
                  </button>
                </div>
              )}

              {!isGamesLoading && !isError && (
                <StationsTable
                  stations={games ?? []}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortFieldChange={setSortField}
                  onSortDirectionChange={setSortDirection}
                  onEdit={setEditingGame}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {editingGame && (
        <EditStationModal
          station={editingGame}
          onClose={() => setEditingGame(null)}
        />
      )}
    </main>
  );
}
