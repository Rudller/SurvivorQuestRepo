"use client";

import { useEffect, useMemo, useState } from "react";
import type { Realization, RealizationStatus, RealizationType } from "../types/realization";
import { realizationTypeOptions } from "../types/realization";
import type { Scenario } from "@/features/scenario/types/scenario";
import type { Station } from "@/features/games/types/station";
import { useUpdateRealizationMutation } from "../api/realization.api";
import {
  toDateTimeLocalValue,
  toIsoFromDateTimeLocal,
  calculateRequiredDevices,
  readFileAsDataUrl,
} from "../realization.utils";
import {
  hasInvalidRealizationStationDrafts,
  normalizeRealizationStationDrafts,
  RealizationStationsEditor,
  toRealizationStationDraft,
} from "./realization-stations-editor";

interface EditRealizationPanelProps {
  realization: Realization;
  scenarios: Scenario[];
  stations: Station[];
  userEmail?: string;
  onClose: () => void;
}

export function EditRealizationPanel({
  realization,
  scenarios,
  stations,
  userEmail,
  onClose,
}: EditRealizationPanelProps) {
  const [updateRealization, { isLoading: isUpdating }] = useUpdateRealizationMutation();

  const [editError, setEditError] = useState<string | null>(null);
  const [instructorInput, setInstructorInput] = useState("");
  const [editValues, setEditValues] = useState({
    companyName: realization.companyName,
    contactPerson: realization.contactPerson ?? "",
    contactPhone: realization.contactPhone ?? "",
    contactEmail: realization.contactEmail ?? "",
    instructors: realization.instructors ?? [],
    type: realization.type as RealizationType,
    logoUrl: realization.logoUrl,
    offerPdfUrl: realization.offerPdfUrl,
    offerPdfName: realization.offerPdfName,
    scenarioId: realization.scenarioId,
    teamCount: realization.teamCount,
    peopleCount: realization.peopleCount,
    positionsCount: realization.positionsCount,
    status: realization.status as RealizationStatus,
    scheduledAt: toDateTimeLocalValue(realization.scheduledAt),
  });

  const scenarioById = useMemo(
    () => new Map(scenarios.map((s) => [s.id, s])),
    [scenarios],
  );

  const editSelectedScenario = editValues.scenarioId ? scenarioById.get(editValues.scenarioId) : undefined;
  const [scenarioStations, setScenarioStations] = useState(() =>
    (realization.scenarioStations.length > 0
      ? realization.scenarioStations
      : (editSelectedScenario?.stationIds ?? [])
          .map((stationId) => stations.find((station) => station.id === stationId))
          .filter((station): station is NonNullable<typeof station> => Boolean(station))
    ).map(toRealizationStationDraft),
  );
  const editStationsPoints = scenarioStations.reduce((sum, station) => sum + station.points, 0);
  const editRequiredDevicesCount = calculateRequiredDevices(editValues.teamCount);

  useEffect(() => {
    if (!editSelectedScenario) {
      setScenarioStations([]);
      return;
    }

    if (editSelectedScenario.id === realization.scenarioId && realization.scenarioStations.length > 0) {
      setScenarioStations(realization.scenarioStations.map(toRealizationStationDraft));
      return;
    }

    const mappedStations = (editSelectedScenario.stationIds ?? [])
      .map((stationId) => stations.find((station) => station.id === stationId))
      .filter((station): station is NonNullable<typeof station> => Boolean(station))
      .map(toRealizationStationDraft);

    setScenarioStations(mappedStations);
  }, [editSelectedScenario, realization.scenarioId, realization.scenarioStations, stations]);

  function addInstructor() {
    const name = instructorInput.trim();
    if (!name) {
      return;
    }

    setEditValues((current) => {
      if (current.instructors.some((item) => item.toLocaleLowerCase("pl-PL") === name.toLocaleLowerCase("pl-PL"))) {
        return current;
      }

      return {
        ...current,
        instructors: [...current.instructors, name],
      };
    });
    setInstructorInput("");
  }

  function removeInstructor(nameToRemove: string) {
    setEditValues((current) => ({
      ...current,
      instructors: current.instructors.filter((name) => name !== nameToRemove),
    }));
  }

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij edycję realizacji"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Edytuj realizację</h2>
              <p className="mt-1 text-sm text-zinc-400">{realization.companyName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
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

              if (!editValues.contactPerson.trim()) {
                setEditError("Uzupełnij osobę kontaktową.");
                return;
              }

              if (!editValues.contactPhone.trim() && !editValues.contactEmail.trim()) {
                setEditError("Podaj telefon lub e-mail kontaktowy.");
                return;
              }

              if (scenarioStations.length === 0) {
                setEditError("Dodaj przynajmniej jedno stanowisko realizacji.");
                return;
              }

              if (hasInvalidRealizationStationDrafts(scenarioStations)) {
                setEditError("Uzupełnij nazwę, opis i poprawne parametry wszystkich stanowisk.");
                return;
              }

              try {
                await updateRealization({
                  id: realization.id,
                  companyName: editValues.companyName.trim(),
                  contactPerson: editValues.contactPerson.trim(),
                  contactPhone: editValues.contactPhone.trim() || undefined,
                  contactEmail: editValues.contactEmail.trim() || undefined,
                  instructors: editValues.instructors,
                  type: editValues.type,
                  logoUrl: editValues.logoUrl,
                  offerPdfUrl: editValues.offerPdfUrl,
                  offerPdfName: editValues.offerPdfName,
                  scenarioId: editValues.scenarioId,
                  teamCount: editValues.teamCount,
                  peopleCount: editValues.peopleCount,
                  positionsCount: editValues.positionsCount,
                  status: editValues.status,
                  scheduledAt: toIsoFromDateTimeLocal(editValues.scheduledAt),
                  scenarioStations: normalizeRealizationStationDrafts(scenarioStations),
                  changedBy: userEmail,
                }).unwrap();
                onClose();
              } catch {
                setEditError("Nie udało się zapisać zmian realizacji.");
              }
            }}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <div className="space-y-4">
              {/* ── Klient ── */}
              <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Klient</legend>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa firmy</span>
                  <input
                    value={editValues.companyName}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, companyName: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Typ realizacji</span>
                  <select
                    value={editValues.type}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, type: event.target.value as RealizationType }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    {realizationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Osoba kontaktowa</span>
                    <input
                      value={editValues.contactPerson}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, contactPerson: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Telefon kontaktowy</span>
                    <input
                      value={editValues.contactPhone}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, contactPhone: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">E-mail kontaktowy</span>
                    <input
                      type="email"
                      value={editValues.contactEmail}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, contactEmail: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Logo klienta</span>
                  {editValues.logoUrl && (
                    <img src={editValues.logoUrl} alt="Logo" className="mb-2 h-16 w-16 rounded-lg border border-zinc-700 object-contain" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const url = await readFileAsDataUrl(file);
                        setEditValues((prev) => ({ ...prev, logoUrl: url }));
                      }
                    }}
                    className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
                  />
                  {editValues.logoUrl && (
                    <button type="button" onClick={() => setEditValues((prev) => ({ ...prev, logoUrl: undefined }))} className="text-xs text-red-400 hover:text-red-300">
                      Usuń logo
                    </button>
                  )}
                </div>
              </fieldset>

              {/* ── Instruktorzy ── */}
              <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Instruktorzy</legend>
                <div className="flex gap-2">
                  <input
                    value={instructorInput}
                    onChange={(event) => setInstructorInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addInstructor();
                      }
                    }}
                    placeholder="Dodaj instruktora"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                  <button
                    type="button"
                    onClick={addInstructor}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
                  >
                    Dodaj
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editValues.instructors.map((instructor) => (
                    <span
                      key={instructor}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
                    >
                      {instructor}
                      <button
                        type="button"
                        onClick={() => removeInstructor(instructor)}
                        className="text-red-300 transition hover:text-red-200"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {editValues.instructors.length === 0 && <p className="text-xs text-zinc-500">Brak dodanych instruktorów.</p>}
                </div>
              </fieldset>

              {/* ── Termin i parametry ── */}
              <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Termin i parametry</legend>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Termin realizacji</span>
                  <input
                    type="datetime-local"
                    value={editValues.scheduledAt}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </fieldset>

              {/* ── Scenariusz i oferta ── */}
              <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Scenariusz i oferta</legend>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Scenariusz</span>
                  <select
                    value={editValues.scenarioId}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, scenarioId: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    <option value="">Wybierz scenariusz</option>
                    {scenarios.filter((scenario) => !scenario.sourceTemplateId || scenario.id === realization.scenarioId).map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}{scenario.sourceTemplateId ? " (instancja)" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <RealizationStationsEditor stations={scenarioStations} onChange={setScenarioStations} />

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Oferta PDF</span>
                  {editValues.offerPdfName && (
                    <p className="mb-1 text-xs text-zinc-300">📄 {editValues.offerPdfName}</p>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const url = await readFileAsDataUrl(file);
                        setEditValues((prev) => ({ ...prev, offerPdfUrl: url, offerPdfName: file.name }));
                      }
                    }}
                    className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
                  />
                  {editValues.offerPdfUrl && (
                    <button
                      type="button"
                      onClick={() => setEditValues((prev) => ({ ...prev, offerPdfUrl: undefined, offerPdfName: undefined }))}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Usuń PDF
                    </button>
                  )}
                </div>
              </fieldset>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">Kontakt:</span> {editValues.contactPerson || "-"}
              </p>
              <p>
                <span className="text-zinc-500">Dane kontaktowe:</span>{" "}
                {editValues.contactPhone || editValues.contactEmail
                  ? `${editValues.contactPhone || "-"} / ${editValues.contactEmail || "-"}`
                  : "-"}
              </p>
              <p>
                <span className="text-zinc-500">Wymagane urządzenia:</span> {editRequiredDevicesCount}
              </p>
              <p>
                <span className="text-zinc-500">Suma punktów stanowisk scenariusza:</span>{" "}
                <span className="font-medium text-amber-300">{editStationsPoints}</span>
              </p>
              <p>
                <span className="text-zinc-500">Instruktorzy:</span> {editValues.instructors.length}
              </p>
            </div>

            {editError && <p className="text-sm text-red-300">{editError}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
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
              {realization.logs.map((log) => (
                <article key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
                  <p className="text-zinc-200">{log.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {log.changedBy} • {new Date(log.changedAt).toLocaleString("pl-PL")}
                  </p>
                </article>
              ))}
              {realization.logs.length === 0 && <p className="text-xs text-zinc-500">Brak logów zmian.</p>}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
