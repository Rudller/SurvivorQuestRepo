"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { useGetMediaLibraryQuery, useGetRealizationsQuery } from "@/features/realizations/api/realization.api";
import { getAssetUsageMap } from "@/features/realizations/realization.utils";
import {
  getApiEnvironmentLabel,
  getConfiguredApiUrl,
  subscribeConfiguredApiUrlChange,
} from "@/shared/api/api-path";
import { AdminShell } from "@/shared/components/admin-shell";
import { MediaLibraryGrid } from "@/features/realizations/components/media-library-grid";

export default function MediaLibraryPage() {
  const router = useRouter();

  const { data: meData, isLoading: isMeLoading, isError: isMeError, error: meError } = useMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const canManageMediaLibrary = meData?.user.role === "admin";

  const {
    data: mediaLibrary,
    isLoading: isMediaLibraryLoading,
    isError: isMediaLibraryError,
    error: mediaLibraryError,
    refetch,
  } = useGetMediaLibraryQuery(undefined, { skip: !canManageMediaLibrary });
  const { data: realizations } = useGetRealizationsQuery(undefined, { skip: !canManageMediaLibrary });

  const usedByLogoUrl = useMemo(
    () => getAssetUsageMap(realizations ?? [], "logoUrl"),
    [realizations],
  );
  const usedByMapImageUrl = useMemo(
    () => getAssetUsageMap(realizations ?? [], "mapImageUrl"),
    [realizations],
  );

  const [apiUrl, setApiUrl] = useState(() => getConfiguredApiUrl());
  const [environmentLabel, setEnvironmentLabel] = useState(() => getApiEnvironmentLabel());
  const isProductionEnvironment = environmentLabel === "PRODUKCJA";

  useEffect(() => {
    return subscribeConfiguredApiUrlChange(() => {
      setApiUrl(getConfiguredApiUrl());
      setEnvironmentLabel(getApiEnvironmentLabel());
    });
  }, []);

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
    >
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Biblioteka plików</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Wszystkie logo klientów i grafiki zamiast mapy wgrane do serwera — również te nieużywane przez żadną realizację.
            </p>
          </div>
        </div>

        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            isProductionEnvironment
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-sky-500/40 bg-sky-500/10 text-sky-200"
          }`}
        >
          <p className="font-medium">
            Połączono z: {environmentLabel} ({apiUrl})
          </p>
          <p className="mt-1 text-xs opacity-90">
            Pliki i realizacje na tej liście dotyczą wyłącznie środowiska, z którym jesteś teraz połączony — magazyn plików
            jest współdzielony, ale bazy danych są osobne. Plik oznaczony jako &quot;Nieużywane w tym środowisku&quot; może
            być używany w drugim środowisku.
          </p>
        </div>

        {!canManageMediaLibrary && (
          <p className="text-sm text-zinc-400">Biblioteka plików jest dostępna tylko dla administratorów.</p>
        )}

        {canManageMediaLibrary && isMediaLibraryLoading && <p className="text-zinc-400">Ładowanie biblioteki...</p>}

        {canManageMediaLibrary && isMediaLibraryError && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <p>Nie udało się pobrać biblioteki plików.</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(mediaLibraryError, null, 2)}</pre>
            <button onClick={() => refetch()} className="mt-2 rounded bg-amber-400 px-3 py-1.5 text-zinc-950">
              Spróbuj ponownie
            </button>
          </div>
        )}

        {canManageMediaLibrary && !isMediaLibraryLoading && !isMediaLibraryError && (
          <div className="space-y-8">
            <MediaLibraryGrid
              title="Logo klientów"
              assets={mediaLibrary?.logos ?? []}
              usedByUrl={usedByLogoUrl}
            />
            <MediaLibraryGrid
              title="Grafiki zamiast mapy"
              assets={mediaLibrary?.mapImages ?? []}
              usedByUrl={usedByMapImageUrl}
            />
          </div>
        )}
      </>
    </AdminShell>
  );
}
