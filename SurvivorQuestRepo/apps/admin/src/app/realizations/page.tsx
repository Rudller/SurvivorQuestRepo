"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { useGetScenariosQuery } from "@/features/scenario/api/scenario.api";
import type { Realization, RealizationStatus } from "@/features/realizations/types/realization";
import {
  useCreateRealizationMutation,
  useGetRealizationsQuery,
  useUpdateRealizationMutation,
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

function toDateTimeLocalValue(isoDate: string) {
  const date = new Date(isoDate);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function calculateRequiredDevices(teamCount: number) {
  return teamCount + 2;
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
  const [updateRealization, { isLoading: isUpdating }] = useUpdateRealizationMutation();

  const { data: stations } = useGetStationsQuery(undefined, { skip: !meData });
  const {
    data: realizations,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetRealizationsQuery(undefined, { skip: !meData });
  const { data: scenarios } = useGetScenariosQuery(undefined, { skip: !meData });

  const [companyName, setCompanyName] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [peopleCount, setPeopleCount] = useState(10);
  const [positionsCount, setPositionsCount] = useState(2);
  const [status, setStatus] = useState<RealizationStatus>("planned");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [sortField, setSortField] = useState<RealizationSortField>("scheduledAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [formError, setFormError] = useState<string | null>(null);

  const [editingRealization, setEditingRealization] = useState<Realization | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    companyName: "",
    scenarioId: "",
    teamCount: 2,
    peopleCount: 10,
    positionsCount: 2,
    status: "planned" as RealizationStatus,
    scheduledAt: "",
  });

  const scenarioById = useMemo(() => new Map((scenarios ?? []).map((scenario) => [scenario.id, scenario])), [scenarios]);

  const selectedScenario = selectedScenarioId ? scenarioById.get(selectedScenarioId) : undefined;

  const selectedStationsData = useMemo(
    () =>
      (selectedScenario?.stationIds ?? [])
        .map((stationId) => stations?.find((station) => station.id === stationId))
        .filter((station): station is NonNullable<typeof station> => Boolean(station)),
    [selectedScenario, stations],
  );

  const selectedStationsPoints = selectedStationsData.reduce((sum, station) => sum + station.points, 0);
  const requiredDevicesCount = calculateRequiredDevices(teamCount);

  const editSelectedScenario = editValues.scenarioId ? scenarioById.get(editValues.scenarioId) : undefined;

  const editSelectedStations = useMemo(
    () =>
      (editSelectedScenario?.stationIds ?? [])
        .map((stationId) => stations?.find((station) => station.id === stationId))
        .filter((station): station is NonNullable<typeof station> => Boolean(station)),
    [editSelectedScenario, stations],
  );

  const editStationsPoints = editSelectedStations.reduce((sum, station) => sum + station.points, 0);
  const editRequiredDevicesCount = calculateRequiredDevices(editValues.teamCount);

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
                        <table className="w-full min-w-245 text-sm">
                          <thead className="bg-zinc-900 text-zinc-300">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Firma</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Termin</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Status</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Scenariusz</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Punkty</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Drużyny</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Urządzenia</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Osoby</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Stanowiska</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Ostatnia zmiana</th>
                              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider">Akcje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRealizations.map((realization) => {
                              const linkedScenario = scenarioById.get(realization.scenarioId);
                              const realizationStationIds = linkedScenario?.stationIds ?? realization.stationIds;
                              const realizationStations = realizationStationIds
                                .map((stationId) => stations?.find((station) => station.id === stationId))
                                .filter((station): station is NonNullable<typeof station> => Boolean(station));

                              const totalPoints = realizationStations.reduce((sum, station) => sum + station.points, 0);
                              const stationCount = realizationStations.length;

                              return (
                                <tr key={realization.id} className="border-t border-zinc-800 bg-zinc-900/70">
                                  <td className="px-3 py-2 font-medium text-zinc-100">{realization.companyName}</td>
                                  <td className="px-3 py-2 text-zinc-300">
                                    {new Date(realization.scheduledAt).toLocaleString("pl-PL")}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusClass(realization.status)}`}
                                    >
                                      {getStatusLabel(realization.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-zinc-300">
                                    {linkedScenario ? (
                                      <>
                                        <p className="line-clamp-1">{linkedScenario.name}</p>
                                        <p className="text-xs text-zinc-500">Stanowiska: {stationCount}</p>
                                      </>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-amber-300">{totalPoints}</td>
                                  <td className="px-3 py-2 text-zinc-300">{realization.teamCount}</td>
                                  <td className="px-3 py-2 text-zinc-300">{realization.requiredDevicesCount}</td>
                                  <td className="px-3 py-2 text-zinc-300">{realization.peopleCount}</td>
                                  <td className="px-3 py-2 text-zinc-300">{realization.positionsCount}</td>
                                  <td className="px-3 py-2 text-zinc-500">
                                    {new Date(realization.updatedAt).toLocaleString("pl-PL")}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRealization(realization);
                                        setEditError(null);
                                        setEditValues({
                                          companyName: realization.companyName,
                                          scenarioId: realization.scenarioId,
                                          teamCount: realization.teamCount,
                                          peopleCount: realization.peopleCount,
                                          positionsCount: realization.positionsCount,
                                          status: realization.status,
                                          scheduledAt: toDateTimeLocalValue(realization.scheduledAt),
                                        });
                                      }}
                                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                                    >
                                      Edytuj
                                    </button>
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

                if (!companyName.trim() || !selectedScenarioId) {
                  setFormError("Uzupełnij nazwę firmy i wybierz scenariusz.");
                  return;
                }

                if (!scheduledAt) {
                  setFormError("Uzupełnij termin (data i godzina).");
                  return;
                }

                try {
                  await createRealization({
                    companyName: companyName.trim(),
                    scenarioId: selectedScenarioId,
                    teamCount,
                    peopleCount,
                    positionsCount,
                    status,
                    scheduledAt: toIsoFromDateTimeLocal(scheduledAt),
                    changedBy: meData?.user.email,
                  }).unwrap();
                  setCompanyName("");
                  setStatus("planned");
                  setSelectedScenarioId("");
                  setTeamCount(2);
                  setScheduledAt(toDateTimeLocalValue(new Date().toISOString()));
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
                      type="datetime-local"
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
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Drużyny</span>
                      <input
                        type="number"
                        min={1}
                        value={teamCount}
                        onChange={(event) => setTeamCount(Number(event.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>

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

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Scenariusz</span>
                    <select
                      value={selectedScenarioId}
                      onChange={(event) => setSelectedScenarioId(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    >
                      <option value="">Wybierz scenariusz</option>
                      {(scenarios ?? []).map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    {scheduledAt ? new Date(toIsoFromDateTimeLocal(scheduledAt)).toLocaleString("pl-PL") : "-"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Status:</span> {getStatusLabel(status)}
                  </p>
                  <p>
                    <span className="text-zinc-500">Drużyny:</span> {teamCount}
                  </p>
                  <p>
                    <span className="text-zinc-500">Wymagane urządzenia:</span> {requiredDevicesCount}
                  </p>
                  <p>
                    <span className="text-zinc-500">Scenariusz:</span> {selectedScenario?.name ?? "-"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Stanowiska w scenariuszu:</span> {selectedStationsData.length}
                  </p>
                  <p>
                    <span className="text-zinc-500">Suma punktów:</span>{" "}
                    <span className="font-medium text-amber-300">{selectedStationsPoints}</span>
                  </p>
                </div>
              </aside>
            </form>
          </div>
        </section>
      </div>

      {editingRealization && (
        <>
          <button
            type="button"
            aria-label="Zamknij edycję realizacji"
            onClick={() => setEditingRealization(null)}
            className="fixed inset-0 z-40 bg-zinc-950/70"
          />

          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">Edytuj realizację</h2>
                  <p className="mt-1 text-sm text-zinc-400">{editingRealization.companyName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRealization(null)}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
                >
                  Zamknij
                </button>
              </div>

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setEditError(null);

                  if (!editValues.companyName.trim() || !editValues.scenarioId || !editValues.scheduledAt) {
                    setEditError("Uzupełnij firmę, scenariusz i termin realizacji.");
                    return;
                  }

                  try {
                    await updateRealization({
                      id: editingRealization.id,
                      companyName: editValues.companyName.trim(),
                      scenarioId: editValues.scenarioId,
                      teamCount: editValues.teamCount,
                      peopleCount: editValues.peopleCount,
                      positionsCount: editValues.positionsCount,
                      status: editValues.status,
                      scheduledAt: toIsoFromDateTimeLocal(editValues.scheduledAt),
                      changedBy: meData?.user.email,
                    }).unwrap();
                    setEditingRealization(null);
                  } catch {
                    setEditError("Nie udało się zapisać zmian realizacji.");
                  }
                }}
                className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa firmy</span>
                    <input
                      value={editValues.companyName}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, companyName: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="col-span-2 space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Termin realizacji</span>
                    <input
                      type="datetime-local"
                      value={editValues.scheduledAt}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Status</span>
                    <select
                      value={editValues.status}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, status: event.target.value as RealizationStatus }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    >
                      <option value="planned">Zaplanowana</option>
                      <option value="in-progress">W trakcie</option>
                      <option value="done">Zrealizowana</option>
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Drużyny</span>
                    <input
                      type="number"
                      min={1}
                      value={editValues.teamCount}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, teamCount: Number(event.target.value) }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Osoby</span>
                    <input
                      type="number"
                      min={1}
                      value={editValues.peopleCount}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, peopleCount: Number(event.target.value) }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
                    <input
                      type="number"
                      min={1}
                      value={editValues.positionsCount}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, positionsCount: Number(event.target.value) }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="col-span-2 space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Scenariusz</span>
                    <select
                      value={editValues.scenarioId}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, scenarioId: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    >
                      <option value="">Wybierz scenariusz</option>
                      {(scenarios ?? []).map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
                  <p>
                    <span className="text-zinc-500">Wymagane urządzenia:</span> {editRequiredDevicesCount}
                  </p>
                  <p>
                    <span className="text-zinc-500">Suma punktów stanowisk scenariusza:</span>{" "}
                    <span className="font-medium text-amber-300">{editStationsPoints}</span>
                  </p>
                </div>

                {editError && <p className="text-sm text-red-300">{editError}</p>}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRealization(null)}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                  >
                    {isUpdating ? "Zapisywanie..." : "Zapisz"}
                  </button>
                </div>
              </form>

              <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="text-sm font-semibold text-zinc-100">Logi zmian</h3>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {editingRealization.logs.map((log) => (
                    <article key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
                      <p className="text-zinc-200">{log.description}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {log.changedBy} • {new Date(log.changedAt).toLocaleString("pl-PL")}
                      </p>
                    </article>
                  ))}
                  {editingRealization.logs.length === 0 && <p className="text-xs text-zinc-500">Brak logów zmian.</p>}
                </div>
              </section>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
