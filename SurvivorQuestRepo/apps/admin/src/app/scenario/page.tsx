"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetScenariosQuery } from "@/features/scenario/api/scenario.api";
import type { Scenario } from "@/features/scenario/types/scenario";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";
import { CreateScenarioForm } from "@/features/scenario/components/create-scenario-form";
import { ScenariosTable } from "@/features/scenario/components/scenarios-table";
import { EditScenarioModal } from "@/features/scenario/components/edit-scenario-modal";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function ScenarioPage() {
  const router = useRouter();

  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { data: stations = [], isLoading: isStationsLoading } = useGetStationsQuery();
  const {
    data: scenarios = [],
    isLoading: isScenariosLoading,
    isError: isScenariosError,
    error: scenariosError,
    refetch,
  } = useGetScenariosQuery(undefined, { skip: !meData });

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

  if (isScenariosError && isUnauthorized(scenariosError)) {
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
            <CreateScenarioForm stations={stations} isStationsLoading={isStationsLoading} />

            <ScenariosTable
              scenarios={scenarios}
              stations={stations}
              isLoading={isScenariosLoading}
              onEdit={setEditingScenario}
              onRefetch={() => void refetch()}
            />
          </div>
        </section>
      </div>

      {editingScenario && (
        <EditScenarioModal
          scenario={editingScenario}
          stations={stations}
          onClose={() => setEditingScenario(null)}
        />
      )}
    </main>
  );
}
