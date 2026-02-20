"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetGamesQuery } from "@/features/games/api/game.api";
import type { RealizationStatus } from "@/features/realizations/types/realization";
import {
  useCreateRealizationMutation,
  useGetRealizationsQuery,
} from "@/features/realizations/api/realization.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

type RealizationSortField = "company" | "scheduledAt" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

function getStatusLabel(status: RealizationStatus) {
  switch (status) {
    case "planned":
      return "Zaplanowana";
    case "in-progress":
      return "W trakcie";
    case "done":
      return "Zrealizowana";
    default:
      return status;
  }
}

function getStatusClass(status: RealizationStatus) {
  switch (status) {
    case "planned":
      return "border-sky-400/40 bg-sky-500/10 text-sky-300";
    case "in-progress":
      return "border-amber-400/40 bg-amber-500/10 text-amber-300";
    case "done":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-zinc-700 text-zinc-300";
  }
}

function getStatusOrder(status: RealizationStatus) {
  if (status === "planned") {
    return 0;
  }

  if (status === "in-progress") {
    return 1;
  }

  return 2;
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
  const [status, setStatus] = useState<RealizationStatus>("planned");
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [sortField, setSortField] = useState<RealizationSortField>("scheduledAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedGamesData = useMemo(
    () =>
      selectedGameIds
        .map((gameId) => games?.find((game) => game.id === gameId))
        .filter((game): game is NonNullable<typeof game> => Boolean(game)),
    [selectedGameIds, games],
  );

  const selectedGamesPoints = selectedGamesData.reduce((sum, game) => sum + game.points, 0);

  const sortedRealizations = useMemo(() => {
    const list = [...(realizations ?? [])];

    list.sort((left, right) => {
      if (sortField === "company") {
        const value = left.companyName.localeCompare(right.companyName, "pl", { sensitivity: "base" });
        return sortDirection === "asc" ? value : -value;
      }

      if (sortField === "status") {
        const value = getStatusOrder(left.status) - getStatusOrder(right.status);
        return sortDirection === "asc" ? value : -value;
      }

      const leftTime = new Date(sortField === "scheduledAt" ? left.scheduledAt : left.createdAt).getTime();
      const rightTime = new Date(sortField === "scheduledAt" ? right.scheduledAt : right.createdAt).getTime();
      const value = leftTime - rightTime;
      return sortDirection === "asc" ? value : -value;
    });

    return list;
  }, [realizations, sortField, sortDirection]);

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
                <div className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <h3 className="text-sm font-medium text-zinc-200">Lista realizacji</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-zinc-400">Sortuj po</label>
                      <select
                        value={sortField}
                        onChange={(event) => setSortField(event.target.value as RealizationSortField)}
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
                      >
                        <option value="scheduledAt">Termin</option>
                        <option value="company">Firma</option>
                        <option value="status">Status</option>
                        <option value="createdAt">Data utworzenia</option>
                      </select>
                      <select
                        value={sortDirection}
                        onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
                      >
                        <option value="asc">Rosnąco</option>
                        <option value="desc">Malejąco</option>
                      </select>
                    </div>
                  </div>

                  {sortedRealizations.length === 0 && (
                    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
                      <p className="text-sm font-medium text-zinc-200">Brak realizacji</p>
                      <p className="mt-1 text-sm text-zinc-400">Dodaj pierwszą realizację w panelu po prawej.</p>
                    </div>
                  )}

                  {sortedRealizations.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                      <div className="overflow-x-auto">
                        <table className="min-w-245 w-full text-sm">
                          <thead className="bg-zinc-900 text-zinc-300">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Firma</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Termin</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Status</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Gry</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Punkty</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Osoby</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Stanowiska</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Utworzono</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRealizations.map((realization) => {
                              const realizationGames = realization.gameIds
                                .map((gameId) => games?.find((game) => game.id === gameId))
                                .filter((game): game is NonNullable<typeof game> => Boolean(game));

                              const totalPoints = realizationGames.reduce((sum, game) => sum + game.points, 0);
                              const firstGamesLabel = realizationGames.slice(0, 2).map((game) => game.name).join(", ");
                              const moreGamesCount = realizationGames.length - 2;

                              return (
                                <tr key={realization.id} className="border-t border-zinc-800 bg-zinc-900/70">
                                  <td className="px-3 py-2 font-medium text-zinc-100">{realization.companyName}</td>
                                  <td className="px-3 py-2 text-zinc-300">
                                    {new Date(realization.scheduledAt).toLocaleDateString("pl-PL")}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusClass(realization.status)}`}
                                    >
                                      {getStatusLabel(realization.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-zinc-300">
                                    {realizationGames.length > 0 ? (
                                      <>
                                        <p className="line-clamp-1">{firstGamesLabel}</p>
                                        {moreGamesCount > 0 && (
                                          <p className="text-xs text-zinc-500">+{moreGamesCount} więcej</p>
                                        )}
                                      </>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-amber-300">{totalPoints}</td>
                                  <td className="px-3 py-2 text-zinc-300">{realization.peopleCount}</td>
                                  <td className="px-3 py-2 text-zinc-300">{realization.positionsCount}</td>
                                  <td className="px-3 py-2 text-zinc-500">
                                    {new Date(realization.createdAt).toLocaleDateString("pl-PL")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form
              className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 xl:order-2 xl:sticky xl:top-6"
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Nowa realizacja</h2>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">Robocza</span>
                </div>

                <div className="grid gap-4">
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa firmy</span>
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Nazwa firmy"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Termin realizacji</span>
                    <input
                      type="date"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Status</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as RealizationStatus)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    >
                      <option value="planned">Zaplanowana</option>
                      <option value="in-progress">W trakcie</option>
                      <option value="done">Zrealizowana</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Osoby</span>
                      <input
                        type="number"
                        min={1}
                        value={peopleCount}
                        onChange={(event) => setPeopleCount(Number(event.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
                      <input
                        type="number"
                        min={1}
                        value={positionsCount}
                        onChange={(event) => setPositionsCount(Number(event.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>
                  </div>

                  <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">Wybierz gry</p>
                    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
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
                  </div>
                </div>

                {formError && <p className="text-sm text-red-300">{formError}</p>}

                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                >
                  {isCreating ? "Dodawanie..." : "Dodaj realizację"}
                </button>
              </div>

              <aside className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Podsumowanie</p>
                <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
                  <p>
                    <span className="text-zinc-500">Firma:</span> {companyName.trim() || "-"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Termin:</span>{" "}
                    {scheduledAt ? new Date(scheduledAt).toLocaleDateString("pl-PL") : "-"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Status:</span> {getStatusLabel(status)}
                  </p>
                  <p>
                    <span className="text-zinc-500">Wybrane gry:</span> {selectedGamesData.length}
                  </p>
                  <p>
                    <span className="text-zinc-500">Suma punktów:</span>{" "}
                    <span className="font-medium text-amber-300">{selectedGamesPoints}</span>
                  </p>
                </div>
              </aside>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
