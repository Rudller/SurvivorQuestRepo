"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetGamesQuery } from "@/features/games/api/game.api";
import {
  useCreateRealizationMutation,
  useGetRealizationsQuery,
} from "@/features/realizations/api/realization.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function RealizationsPage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [createRealization, { isLoading: isCreating }] = useCreateRealizationMutation();

  const { data: games } = useGetGamesQuery(undefined, { skip: !meData });
  const {
    data: realizations,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetRealizationsQuery(undefined, { skip: !meData });

  const [companyName, setCompanyName] = useState("");
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [peopleCount, setPeopleCount] = useState(10);
  const [positionsCount, setPositionsCount] = useState(2);
  const [status, setStatus] = useState<"planned" | "in-progress" | "done">("planned");
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState<string | null>(null);

  const selectedGamesPoints = selectedGameIds.reduce((sum, gameId) => {
    const gamePoints = games?.find((game) => game.id === gameId)?.points ?? 0;
    return sum + gamePoints;
  }, 0);

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
        <section className="space-y-4 p-6 lg:p-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Realizacje</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Dodawaj i zarządzaj realizacjami przypisanymi do konkretnych gier.
            </p>
          </div>

          <form
            className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setFormError(null);

              if (!companyName.trim() || selectedGameIds.length === 0) {
                setFormError("Uzupełnij nazwę firmy i wybierz co najmniej jedną grę.");
                return;
              }

              try {
                await createRealization({
                  companyName: companyName.trim(),
                  gameIds: selectedGameIds,
                  peopleCount,
                  positionsCount,
                  status,
                  scheduledAt,
                }).unwrap();
                setCompanyName("");
                setStatus("planned");
                setSelectedGameIds([]);
              } catch {
                setFormError("Nie udało się dodać realizacji.");
              }
            }}
          >
            <h2 className="md:col-span-2 text-lg font-semibold">Dodaj realizację</h2>

            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Nazwa firmy"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
              <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Wybierz gry</p>
              <div className="space-y-1.5">
                {(games ?? []).map((game) => {
                  const isChecked = selectedGameIds.includes(game.id);

                  return (
                    <label key={game.id} className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                      <span className="truncate">{game.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedGameIds((prev) =>
                            checked ? [...prev, game.id] : prev.filter((id) => id !== game.id),
                          );
                        }}
                        className="h-4 w-4 accent-amber-400"
                      />
                    </label>
                  );
                })}
                {games?.length === 0 && <p className="text-xs text-zinc-500">Brak gier do wyboru.</p>}
              </div>
              <p className="mt-2 text-xs font-medium text-amber-300">
                Suma punktów wybranych gier: {selectedGamesPoints}
              </p>
            </div>

            <input
              type="number"
              min={1}
              value={peopleCount}
              onChange={(event) => setPeopleCount(Number(event.target.value))}
              placeholder="Ilość osób"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />

            <input
              type="number"
              min={1}
              value={positionsCount}
              onChange={(event) => setPositionsCount(Number(event.target.value))}
              placeholder="Ilość stanowisk"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "planned" | "in-progress" | "done")}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            >
              <option value="planned">Zaplanowana</option>
              <option value="in-progress">W trakcie</option>
              <option value="done">Zrealizowana</option>
            </select>

            <input
              type="date"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />

            {formError && <p className="md:col-span-2 text-sm text-red-300">{formError}</p>}

            <button
              type="submit"
              disabled={isCreating}
              className="md:col-span-2 inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {isCreating ? "Dodawanie..." : "Dodaj realizację"}
            </button>
          </form>

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
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Firma</th>
                    <th className="px-3 py-2 text-left">Gry</th>
                    <th className="px-3 py-2 text-left">Punkty</th>
                    <th className="px-3 py-2 text-left">Osoby</th>
                    <th className="px-3 py-2 text-left">Stanowiska</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(realizations ?? []).map((realization) => {
                    const gameNames =
                      realization.gameIds
                        .map((gameId) => games?.find((game) => game.id === gameId)?.name)
                        .filter(Boolean)
                        .join(", ") || "-";

                    const totalPoints = realization.gameIds.reduce((sum, gameId) => {
                      const points = games?.find((game) => game.id === gameId)?.points ?? 0;
                      return sum + points;
                    }, 0);

                    return (
                      <tr key={realization.id} className="border-t border-zinc-800 bg-zinc-900/70">
                        <td className="px-3 py-2">{realization.companyName}</td>
                        <td className="px-3 py-2 text-zinc-300">{gameNames}</td>
                        <td className="px-3 py-2 text-amber-300">{totalPoints}</td>
                        <td className="px-3 py-2">{realization.peopleCount}</td>
                        <td className="px-3 py-2">{realization.positionsCount}</td>
                        <td className="px-3 py-2 text-zinc-300">{realization.status}</td>
                      </tr>
                    );
                  })}
                  {realizations?.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-zinc-400" colSpan={6}>
                        Brak realizacji.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
