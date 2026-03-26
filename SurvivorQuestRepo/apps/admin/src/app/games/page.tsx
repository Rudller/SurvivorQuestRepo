"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import type { Station } from "@/features/games/types/station";
import { AdminSidebar } from "@/shared/components/admin-sidebar";
import { StationsTable } from "@/features/games/components/stations-table";
import { CreateStationForm } from "@/features/games/components/create-station-form";
import { EditStationModal } from "@/features/games/components/edit-station-modal";
import type { StationSortField, SortDirection } from "@/features/games/station.utils";

export default function StationPage() {
  const router = useRouter();
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);

  const { data: meData, isLoading: isMeLoading, isError: isMeError, error: meError } = useMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data: games, isLoading: isGamesLoading, isError, error, refetch } = useGetStationsQuery(undefined, {
    skip: !meData,
  });

  const [sortField, setSortField] = useState<StationSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingGame, setEditingGame] = useState<Station | null>(null);

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
        <section className="space-y-4 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-zinc-100">Stanowiska</h1>
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              Nowe stanowisko
            </button>
          </div>

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
        </section>
      </div>

      {isCreatePanelOpen && (
        <CreateStationForm onClose={() => setIsCreatePanelOpen(false)} />
      )}
      {editingGame && (
        <EditStationModal
          station={editingGame}
          onClose={() => setEditingGame(null)}
        />
      )}
    </main>
  );
}


