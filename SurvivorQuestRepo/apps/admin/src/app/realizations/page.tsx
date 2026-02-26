"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { useGetScenariosQuery } from "@/features/scenario/api/scenario.api";
import type { Realization } from "@/features/realizations/types/realization";
import { useGetRealizationsQuery } from "@/features/realizations/api/realization.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";
import { RealizationsTable } from "@/features/realizations/components/realizations-table";
import { CreateRealizationForm } from "@/features/realizations/components/create-realization-form";
import { EditRealizationPanel } from "@/features/realizations/components/edit-realization-panel";
import type { RealizationSortField, SortDirection } from "@/features/realizations/realization.utils";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function RealizationsPage() {
  const router = useRouter();

  const { data: meData, isLoading: isMeLoading, isError: isMeError, error: meError } = useMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data: stations } = useGetStationsQuery(undefined, { skip: !meData });
  const { data: realizations, isLoading, isError, error, refetch } = useGetRealizationsQuery(undefined, { skip: !meData });
  const { data: scenarios } = useGetScenariosQuery(undefined, { skip: !meData });

  const [sortField, setSortField] = useState<RealizationSortField>("scheduledAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingRealization, setEditingRealization] = useState<Realization | null>(null);

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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(360px,1fr)] xl:items-start">
            <div className="space-y-5 xl:order-1">
              {isLoading && <p className="text-zinc-400">Ładowanie realizacji...</p>}

              {isError && (
                <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <p>Nie udało się pobrać realizacji.</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(error, null, 2)}</pre>
                  <button onClick={() => refetch()} className="mt-2 rounded bg-amber-400 px-3 py-1.5 text-zinc-950">
                    Spróbuj ponownie
                  </button>
                </div>
              )}

              {!isLoading && !isError && (
                <RealizationsTable
                  realizations={realizations ?? []}
                  scenarios={scenarios ?? []}
                  stations={stations ?? []}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortFieldChange={setSortField}
                  onSortDirectionChange={setSortDirection}
                  onEdit={setEditingRealization}
                />
              )}
            </div>

            <CreateRealizationForm
              scenarios={scenarios ?? []}
              stations={stations ?? []}
              userEmail={meData?.user.email}
            />
          </div>
        </section>
      </div>

      {editingRealization && (
        <EditRealizationPanel
          realization={editingRealization}
          scenarios={scenarios ?? []}
          stations={stations ?? []}
          userEmail={meData?.user.email}
          onClose={() => setEditingRealization(null)}
        />
      )}

    </main>
  );
}
