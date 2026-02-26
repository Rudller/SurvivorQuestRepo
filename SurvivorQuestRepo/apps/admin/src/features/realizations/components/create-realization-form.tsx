"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealizationStatus, RealizationType } from "../types/realization";
import { realizationTypeOptions } from "../types/realization";
import type { Scenario } from "@/features/scenario/types/scenario";
import type { Station } from "@/features/games/types/station";
import { useCreateRealizationMutation } from "../api/realization.api";
import {
  hasInvalidRealizationStationDrafts,
  normalizeRealizationStationDrafts,
  RealizationStationsEditor,
  toRealizationStationDraft,
} from "./realization-stations-editor";
import {
  getStatusLabel,
  toDateTimeLocalValue,
  toIsoFromDateTimeLocal,
  calculateRequiredDevices,
  readFileAsDataUrl,
} from "../realization.utils";

interface CreateRealizationFormProps {
  scenarios: Scenario[];
  stations: Station[];
  userEmail?: string;
}

export function CreateRealizationForm({ scenarios, stations, userEmail }: CreateRealizationFormProps) {
  const [createRealization, { isLoading: isCreating }] = useCreateRealizationMutation();

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [instructors, setInstructors] = useState<string[]>([]);
  const [instructorInput, setInstructorInput] = useState("");
  const [selectedType, setSelectedType] = useState<RealizationType>("outdoor-games");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | undefined>();
  const [offerPdfName, setOfferPdfName] = useState<string | undefined>();
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [peopleCount, setPeopleCount] = useState(10);
  const [positionsCount, setPositionsCount] = useState(2);
  const [status, setStatus] = useState<RealizationStatus>("planned");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [formError, setFormError] = useState<string | null>(null);

  const scenarioById = useMemo(
    () => new Map(scenarios.map((s) => [s.id, s])),
    [scenarios],
  );

  const selectedScenario = selectedScenarioId ? scenarioById.get(selectedScenarioId) : undefined;
  const [scenarioStations, setScenarioStations] = useState(() =>
    (selectedScenario?.stationIds ?? [])
      .map((stationId) => stations.find((station) => station.id === stationId))
      .filter((station): station is NonNullable<typeof station> => Boolean(station))
      .map(toRealizationStationDraft),
  );
  const selectedStationsPoints = scenarioStations.reduce((sum, station) => sum + station.points, 0);
  const requiredDevicesCount = calculateRequiredDevices(teamCount);

  useEffect(() => {
    if (!selectedScenario) {
      setScenarioStations([]);
      return;
    }

    const mappedStations = (selectedScenario.stationIds ?? [])
      .map((stationId) => stations.find((station) => station.id === stationId))
      .filter((station): station is NonNullable<typeof station> => Boolean(station))
      .map(toRealizationStationDraft);

    setScenarioStations(mappedStations);
  }, [selectedScenario, stations]);

  function addInstructor() {
    const name = instructorInput.trim();
    if (!name) {
      return;
    }

    setInstructors((current) => {
      if (current.some((item) => item.toLocaleLowerCase("pl-PL") === name.toLocaleLowerCase("pl-PL"))) {
        return current;
      }

      return [...current, name];
    });
    setInstructorInput("");
  }

  function removeInstructor(nameToRemove: string) {
    setInstructors((current) => current.filter((name) => name !== nameToRemove));
  }

  return (
    <form
      className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 xl:order-2 xl:sticky xl:top-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!companyName.trim() || !selectedScenarioId) {
          setFormError("Uzupełnij nazwę firmy i wybierz scenariusz.");
          return;
        }

        if (!contactPerson.trim()) {
          setFormError("Uzupełnij osobę kontaktową.");
          return;
        }

        if (!contactPhone.trim() && !contactEmail.trim()) {
          setFormError("Podaj telefon lub e-mail kontaktowy.");
          return;
        }

        if (!scheduledAt) {
          setFormError("Uzupełnij termin (data i godzina).");
          return;
        }

        if (scenarioStations.length === 0) {
          setFormError("Dodaj przynajmniej jedno stanowisko realizacji.");
          return;
        }

        if (hasInvalidRealizationStationDrafts(scenarioStations)) {
          setFormError("Uzupełnij nazwę, opis i poprawne parametry wszystkich stanowisk.");
          return;
        }

        try {
          await createRealization({
            companyName: companyName.trim(),
            contactPerson: contactPerson.trim(),
            contactPhone: contactPhone.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            instructors,
            type: selectedType,
            logoUrl,
            offerPdfUrl,
            offerPdfName,
            scenarioId: selectedScenarioId,
            teamCount,
            peopleCount,
            positionsCount,
            status,
            scheduledAt: toIsoFromDateTimeLocal(scheduledAt),
            scenarioStations: normalizeRealizationStationDrafts(scenarioStations),
            changedBy: userEmail,
          }).unwrap();
          setCompanyName("");
          setContactPerson("");
          setContactPhone("");
          setContactEmail("");
          setInstructors([]);
          setInstructorInput("");
          setStatus("planned");
          setSelectedScenarioId("");
          setTeamCount(2);
          setLogoUrl(undefined);
          setOfferPdfUrl(undefined);
          setOfferPdfName(undefined);
          setScheduledAt(toDateTimeLocalValue(new Date().toISOString()));
          setScenarioStations([]);
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

        {/* ── Klient i kontakt ── */}
        <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Klient i kontakt</legend>

          <div className="grid gap-3 md:grid-cols-2">
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
              <span className="text-xs uppercase tracking-wider text-zinc-400">Typ realizacji</span>
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value as RealizationType)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              >
                {realizationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Osoba kontaktowa</span>
              <input
                value={contactPerson}
                onChange={(event) => setContactPerson(event.target.value)}
                placeholder="Imię i nazwisko"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Telefon kontaktowy</span>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="+48 ..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400">E-mail kontaktowy</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="kontakt@firma.pl"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Logo klienta</span>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="mb-2 h-16 w-16 rounded-lg border border-zinc-700 object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setLogoUrl(await readFileAsDataUrl(file));
              }}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
            />
            {logoUrl && (
              <button type="button" onClick={() => setLogoUrl(undefined)} className="text-xs text-red-400 hover:text-red-300">
                Usuń logo
              </button>
            )}
          </div>
        </fieldset>

        {/* ── Termin i parametry ── */}
        <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Termin i parametry</legend>

          <div className="grid gap-3 md:grid-cols-2">
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
            {instructors.map((instructor) => (
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
            {instructors.length === 0 && <p className="text-xs text-zinc-500">Brak dodanych instruktorów.</p>}
          </div>
        </fieldset>

        {/* ── Scenariusz i oferta ── */}
        <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Scenariusz i oferta</legend>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Scenariusz (szablon)</span>
            <select
              value={selectedScenarioId}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            >
              <option value="">Wybierz scenariusz</option>
              {scenarios.filter((s) => !s.sourceTemplateId).map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </label>

          <details className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <summary className="cursor-pointer text-xs uppercase tracking-wider text-zinc-400">
              Stanowiska realizacji ({scenarioStations.length}) • {selectedStationsPoints} pkt
            </summary>
            <div className="mt-3">
              <RealizationStationsEditor stations={scenarioStations} onChange={setScenarioStations} />
            </div>
          </details>

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Oferta PDF</span>
            {offerPdfName && <p className="mb-1 text-xs text-zinc-300">📄 {offerPdfName}</p>}
            <input
              type="file"
              accept="application/pdf"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setOfferPdfUrl(await readFileAsDataUrl(file));
                  setOfferPdfName(file.name);
                }
              }}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
            />
            {offerPdfUrl && (
              <button
                type="button"
                onClick={() => {
                  setOfferPdfUrl(undefined);
                  setOfferPdfName(undefined);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Usuń PDF
              </button>
            )}
          </div>
        </fieldset>

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
            <span className="text-zinc-500">Kontakt:</span> {contactPerson.trim() || "-"}
          </p>
          <p>
            <span className="text-zinc-500">Dane kontaktowe:</span>{" "}
            {contactPhone.trim() || contactEmail.trim() ? `${contactPhone.trim() || "-"} / ${contactEmail.trim() || "-"}` : "-"}
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
            <span className="text-zinc-500">Stanowiska w realizacji:</span> {scenarioStations.length}
          </p>
          <p>
            <span className="text-zinc-500">Suma punktów:</span>{" "}
            <span className="font-medium text-amber-300">{selectedStationsPoints}</span>
          </p>
          <p>
            <span className="text-zinc-500">Instruktorzy:</span> {instructors.length}
          </p>
        </div>
      </aside>
    </form>
  );
}
