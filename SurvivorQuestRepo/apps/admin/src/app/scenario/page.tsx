"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import {
  useCreateScenarioMutation,
  useDeleteScenarioMutation,
  useGetScenariosQuery,
  useUpdateScenarioMutation,
} from "@/features/scenario/api/scenario.api";
import type { Scenario } from "@/features/scenario/types/scenario";
import { useGetStationsQuery } from "@/features/games/api/station.api";
import { stationTypeOptions } from "@/features/games/types/station";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function ScenarioPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    description: "",
    stationIds: [] as string[],
  });
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const [createScenario, { isLoading: isCreating }] = useCreateScenarioMutation();
  const [updateScenario, { isLoading: isUpdating }] = useUpdateScenarioMutation();
  const [deleteScenario, { isLoading: isDeleting }] = useDeleteScenarioMutation();

  const stationById = useMemo(() => new Map(stations.map((station) => [station.id, station])), [stations]);

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

  function getTypeLabel(value: string) {
    return stationTypeOptions.find((option) => option.value === value)?.label ?? "Quiz";
  }

  function toggleCreateStationSelection(stationId: string) {
    setSelectedStationIds((current) =>
      current.includes(stationId) ? current.filter((item) => item !== stationId) : [...current, stationId],
    );
  }

  function toggleEditStationSelection(stationId: string) {
    setEditValues((current) => ({
      ...current,
      stationIds: current.stationIds.includes(stationId)
        ? current.stationIds.filter((item) => item !== stationId)
        : [...current.stationIds, stationId],
    }));
  }

  function resetCreateForm() {
    setName("");
    setDescription("");
    setSelectedStationIds([]);
    setFormError(null);
  }

  function openEditScenario(scenario: Scenario) {
    setEditingScenario(scenario);
    setEditValues({
      name: scenario.name,
      description: scenario.description,
      stationIds: scenario.stationIds,
    });
    setDeleteConfirmName("");
    setEditError(null);
    setDeleteError(null);
  }

  function closeEditScenario() {
    setEditingScenario(null);
    setEditValues({
      name: "",
      description: "",
      stationIds: [],
    });
    setDeleteConfirmName("");
    setEditError(null);
    setDeleteError(null);
  }

  async function onCreateScenario() {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 3) {
      setFormError("Nazwa scenariusza musi mieć co najmniej 3 znaki.");
      return;
    }

    if (selectedStationIds.length === 0) {
      setFormError("Wybierz przynajmniej jedno stanowisko.");
      return;
    }

    try {
      setFormError(null);
      await createScenario({
        name: trimmedName,
        description: trimmedDescription,
        stationIds: selectedStationIds,
      }).unwrap();
      resetCreateForm();
    } catch {
      setFormError("Nie udało się utworzyć scenariusza.");
    }
  }

  async function onSaveEditedScenario() {
    if (!editingScenario) {
      return;
    }

    const trimmedName = editValues.name.trim();
    const trimmedDescription = editValues.description.trim();

    if (trimmedName.length < 3) {
      setEditError("Nazwa scenariusza musi mieć co najmniej 3 znaki.");
      return;
    }

    if (editValues.stationIds.length === 0) {
      setEditError("Wybierz przynajmniej jedno stanowisko.");
      return;
    }

    try {
      setEditError(null);
      await updateScenario({
        id: editingScenario.id,
        name: trimmedName,
        description: trimmedDescription,
        stationIds: editValues.stationIds,
      }).unwrap();
      closeEditScenario();
    } catch {
      setEditError("Nie udało się zapisać scenariusza.");
    }
  }

  async function onDeleteScenario() {
    if (!editingScenario) {
      return;
    }

    if (deleteConfirmName.trim() !== editingScenario.name) {
      setDeleteError("Nazwa scenariusza nie zgadza się z potwierdzeniem.");
      return;
    }

    try {
      setDeleteError(null);
      await deleteScenario({
        id: editingScenario.id,
        confirmName: deleteConfirmName.trim(),
      }).unwrap();
      closeEditScenario();
    } catch {
      setDeleteError("Nie udało się usunąć scenariusza.");
    }
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
            <form
              className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 xl:order-2 xl:sticky xl:top-6"
              onSubmit={async (event) => {
                event.preventDefault();
                await onCreateScenario();
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Nowy scenariusz</h2>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">Roboczy</span>
                </div>

                <div className="grid gap-4">
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa scenariusza</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Np. Scenariusz firmowy"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={4}
                      placeholder="Krótki opis przepływu scenariusza"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
                    <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                      {isStationsLoading ? (
                        <p className="text-xs text-zinc-500">Ładowanie stanowisk...</p>
                      ) : stations.length === 0 ? (
                        <p className="text-xs text-zinc-500">Brak stanowisk do przypisania.</p>
                      ) : (
                        stations.map((station) => {
                          const checked = selectedStationIds.includes(station.id);

                          return (
                            <label
                              key={station.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                                checked
                                  ? "border-amber-300 bg-amber-400/10"
                                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => toggleCreateStationSelection(station.id)}
                              />
                              <div>
                                <p className="text-sm font-semibold text-zinc-100">{station.name}</p>
                                <p className="text-xs text-zinc-400">
                                  {getTypeLabel(station.type)} • {station.points} pkt • Czas: {station.timeLimitSeconds}s
                                </p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {formError && <p className="text-sm text-red-300">{formError}</p>}

                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                >
                  {isCreating ? "Dodawanie..." : "Dodaj scenariusz"}
                </button>
              </div>
            </form>

            <div className="space-y-5 xl:order-1">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">Lista scenariuszy</h3>
                  <p className="mt-1 text-xs text-zinc-500">Realizacja • Scenariusz • Stanowiska • Aktywności</p>
                </div>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition hover:border-zinc-500"
                >
                  Odśwież
                </button>
              </div>

              {isScenariosLoading && <p className="text-zinc-400">Ładowanie scenariuszy...</p>}

              {!isScenariosLoading && scenarios.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
                  <p className="text-sm font-medium text-zinc-200">Brak scenariuszy</p>
                  <p className="mt-1 text-sm text-zinc-400">Dodaj pierwszy scenariusz w formularzu po prawej stronie.</p>
                </div>
              )}

              {!isScenariosLoading && scenarios.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <div className="grid grid-cols-[1.2fr_2fr_1fr_120px] gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs uppercase tracking-wider text-zinc-400">
                    <span>Nazwa</span>
                    <span>Stanowiska / aktywności</span>
                    <span>Aktualizacja</span>
                    <span>Akcje</span>
                  </div>

                  <div className="divide-y divide-zinc-800">
                    {scenarios.map((scenario) => (
                      <div key={scenario.id} className="grid grid-cols-[1.2fr_2fr_1fr_120px] gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{scenario.name}</p>
                          <p className="mt-1 text-xs text-zinc-400">{scenario.description || "Brak opisu scenariusza."}</p>
                        </div>

                        <div className="space-y-1">
                          {scenario.stationIds.length === 0 ? (
                            <p className="text-xs text-zinc-500">Brak przypisanych stanowisk.</p>
                          ) : (
                            scenario.stationIds.slice(0, 3).map((stationId) => {
                              const station = stationById.get(stationId);

                              if (!station) {
                                return (
                                  <p key={stationId} className="text-xs text-zinc-500">
                                    • Stanowisko {stationId} (brak w katalogu)
                                  </p>
                                );
                              }

                              return (
                                <p key={station.id} className="text-xs text-zinc-300">
                                  • {station.name}: {station.description || "Brak opisu aktywności"}
                                </p>
                              );
                            })
                          )}
                          {scenario.stationIds.length > 3 && (
                            <p className="text-xs text-zinc-500">+{scenario.stationIds.length - 3} więcej...</p>
                          )}
                        </div>

                        <div className="text-xs text-zinc-400">
                          {new Date(scenario.updatedAt).toLocaleString("pl-PL", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>

                        <div className="flex items-start justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => openEditScenario(scenario)}
                            className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                          >
                            Edytuj
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {editingScenario && (
        <>
          <button
            type="button"
            aria-label="Zamknij edycję scenariusza"
            onClick={closeEditScenario}
            className="fixed inset-0 z-40 bg-zinc-950/70"
          />

          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">Edytuj scenariusz</h2>
                  <p className="mt-1 text-sm text-zinc-400">{editingScenario.name}</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditScenario}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
                >
                  Zamknij
                </button>
              </div>

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onSaveEditedScenario();
                }}
                className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa scenariusza</span>
                  <input
                    value={editValues.name}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                  <textarea
                    value={editValues.description}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, description: event.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 pr-2">
                    {(stations ?? []).map((station) => {
                      const isChecked = editValues.stationIds.includes(station.id);

                      return (
                        <label key={station.id} className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                          <span className="truncate">{station.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEditStationSelection(station.id)}
                            className="h-4 w-4 accent-amber-400"
                          />
                        </label>
                      );
                    })}
                  </div>
                </label>

                {editError && <p className="text-sm text-red-300">{editError}</p>}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEditScenario}
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

              <section className="rounded-lg border border-red-900/70 bg-red-950/20 p-3">
                <p className="text-xs uppercase tracking-wider text-red-300">Usuń scenariusz</p>
                <p className="mt-2 text-xs text-red-200">
                  Wpisz nazwę <strong>{editingScenario.name}</strong>, aby potwierdzić usunięcie.
                </p>
                <input
                  value={deleteConfirmName}
                  onChange={(event) => setDeleteConfirmName(event.target.value)}
                  className="mt-2 w-full rounded-md border border-red-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                  placeholder="Nazwa scenariusza"
                />
                {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}
                <button
                  type="button"
                  onClick={() => void onDeleteScenario()}
                  disabled={isDeleting}
                  className="mt-3 rounded-lg border border-red-700 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Usuń scenariusz
                </button>
              </section>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
