"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Realization,
  RealizationLanguage,
  RealizationStatus,
  RealizationType,
} from "../types/realization";
import {
  getRealizationLanguageLabel,
  realizationLanguageOptions,
  realizationTypeOptions,
} from "../types/realization";
import type { Scenario } from "@/features/scenario/types/scenario";
import type { Station } from "@/features/games/types/station";
import {
  useUpdateRealizationMutation,
  useUploadRealizationLogoMutation,
  useUploadRealizationOfferMutation,
} from "../api/realization.api";
import {
  toDateTimeLocalValue,
  toIsoFromDateTimeLocal,
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
  onSaved?: (realization: Realization) => void;
}

type DateTimeInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

function CalendarInputIcon() {
  return (
    // Icon based on Heroicons (MIT) calendar style.
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M8 2v3M16 2v3M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="5" width="18" height="16" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EditRealizationPanel({
  realization,
  scenarios,
  stations,
  userEmail,
  onClose,
  onSaved,
}: EditRealizationPanelProps) {
  const [updateRealization, { isLoading: isUpdating }] = useUpdateRealizationMutation();
  const [uploadRealizationLogo, { isLoading: isUploadingLogo }] = useUploadRealizationLogoMutation();
  const [uploadRealizationOffer, { isLoading: isUploadingOffer }] = useUploadRealizationOfferMutation();

  const [editError, setEditError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [joinCodeCopied, setJoinCodeCopied] = useState(false);
  const [instructorInput, setInstructorInput] = useState("");
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingOfferPdfFile, setPendingOfferPdfFile] = useState<File | null>(null);
  const scheduledAtInputRef = useRef<DateTimeInputElement | null>(null);
  const [editValues, setEditValues] = useState({
    companyName: realization.companyName,
    location: realization.location ?? "",
    language: realization.language,
    customLanguage: realization.customLanguage ?? "",
    introText: realization.introText ?? "",
    contactPerson: realization.contactPerson ?? "",
    contactPhone: realization.contactPhone ?? "",
    contactEmail: realization.contactEmail ?? "",
    instructors: realization.instructors ?? [],
    type: realization.type as RealizationType,
    logoUrl: realization.logoUrl,
    offerPdfUrl: realization.offerPdfUrl,
    offerPdfName: realization.offerPdfName,
    scenarioId: realization.scenarioTemplateId ?? realization.scenarioId,
    teamCount: realization.teamCount,
    peopleCount: realization.peopleCount,
    durationMinutes: realization.durationMinutes,
    status: realization.status as RealizationStatus,
    scheduledAt: toDateTimeLocalValue(realization.scheduledAt),
  });

  const scenarioById = useMemo(
    () => new Map(scenarios.map((s) => [s.id, s])),
    [scenarios],
  );

  function mapScenarioStations(scenarioId: string) {
    const scenario = scenarioById.get(scenarioId);
    if (!scenario) {
      return [];
    }

    if (
      scenario.id === (realization.scenarioTemplateId ?? realization.scenarioId) &&
      realization.scenarioStations.length > 0
    ) {
      return realization.scenarioStations.map(toRealizationStationDraft);
    }

    return (scenario.stationIds ?? [])
      .map((stationId) => stations.find((station) => station.id === stationId))
      .filter((station): station is NonNullable<typeof station> => Boolean(station))
      .map(toRealizationStationDraft);
  }

  const [scenarioStations, setScenarioStations] = useState(() =>
    mapScenarioStations(realization.scenarioTemplateId ?? realization.scenarioId),
  );
  const positionsCount = scenarioStations.length;
  const editStationsPoints = scenarioStations.reduce((sum, station) => sum + station.points, 0);
  const isBusy = isUpdating || isUploadingLogo || isUploadingOffer;
  const hasInvalidScenarioStations = hasInvalidRealizationStationDrafts(scenarioStations);
  const isCompanyNameInvalid = submitAttempted && !editValues.companyName.trim();
  const isScenarioInvalid = submitAttempted && !editValues.scenarioId;
  const isContactPersonInvalid = submitAttempted && !editValues.contactPerson.trim();
  const isContactChannelInvalid = submitAttempted && !editValues.contactPhone.trim() && !editValues.contactEmail.trim();
  const isCustomLanguageInvalid = submitAttempted && editValues.language === "other" && !editValues.customLanguage.trim();
  const isScheduledAtInvalid = submitAttempted && !editValues.scheduledAt;
  const isDurationInvalid = submitAttempted && (!Number.isFinite(editValues.durationMinutes) || editValues.durationMinutes < 1);
  const isScenarioStationsEmpty = submitAttempted && scenarioStations.length === 0;
  const pendingLogoPreviewUrl = useMemo(
    () => (pendingLogoFile ? URL.createObjectURL(pendingLogoFile) : undefined),
    [pendingLogoFile],
  );

  useEffect(() => {
    return () => {
      if (pendingLogoPreviewUrl) {
        URL.revokeObjectURL(pendingLogoPreviewUrl);
      }
    };
  }, [pendingLogoPreviewUrl]);

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

  function openScheduledAtPicker() {
    const input = scheduledAtInputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  async function copyJoinCode() {
    try {
      await navigator.clipboard.writeText(realization.joinCode);
      setJoinCodeCopied(true);
      window.setTimeout(() => setJoinCodeCopied(false), 1500);
    } catch {
      setEditError("Nie udało się skopiować kodu dołączenia.");
    }
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
              setSubmitAttempted(true);

              const hasIncompleteFields =
                !editValues.companyName.trim() ||
                !editValues.scenarioId ||
                !editValues.scheduledAt ||
                !editValues.contactPerson.trim() ||
                (!editValues.contactPhone.trim() && !editValues.contactEmail.trim()) ||
                (editValues.language === "other" && !editValues.customLanguage.trim()) ||
                !Number.isFinite(editValues.durationMinutes) ||
                editValues.durationMinutes < 1 ||
                scenarioStations.length === 0;

              if (hasInvalidScenarioStations) {
                setEditError("Nie można zapisać realizacji: popraw dane stanowisk (nazwa/opis/punkty/kody/quiz).");
                return;
              }

              if (
                hasIncompleteFields &&
                !window.confirm("Uwaga: część pól nie jest uzupełniona lub zawiera niepoprawne dane. Czy chcesz kontynuować?")
              ) {
                return;
              }

              const fallbackScenarioId =
                editValues.scenarioId ||
                realization.scenarioTemplateId ||
                realization.scenarioId ||
                scenarios.find((scenario) => !scenario.sourceTemplateId)?.id ||
                scenarios[0]?.id ||
                "";
              if (!fallbackScenarioId) {
                setEditError("Brak dostępnego scenariusza do zapisania realizacji.");
                return;
              }

              const selectedScenarioTemplate = scenarioById.get(fallbackScenarioId);
              if (!selectedScenarioTemplate || selectedScenarioTemplate.sourceTemplateId) {
                setEditError("Wybierz scenariusz szablonowy.");
                return;
              }

              const normalizedScenarioStations = normalizeRealizationStationDrafts(scenarioStations);
              const useCustomScenarioStations = scenarioStations.length > 0;
              const fallbackScenarioStations = mapScenarioStations(fallbackScenarioId);
              const positionsCountForSubmit = Math.max(
                1,
                useCustomScenarioStations ? normalizedScenarioStations.length : fallbackScenarioStations.length,
              );
              const normalizedCompanyName = editValues.companyName.trim() || "Nowa realizacja";
              const normalizedContactPerson = editValues.contactPerson.trim() || "Brak osoby kontaktowej";
              const normalizedContactEmail = editValues.contactEmail.trim() || undefined;
              const normalizedContactPhone =
                editValues.contactPhone.trim() || (normalizedContactEmail ? undefined : "Nie podano");
              const normalizedCustomLanguage =
                editValues.language === "other"
                  ? editValues.customLanguage.trim() || "Nieokreślony"
                  : undefined;
              const normalizedScheduledAt =
                toIsoFromDateTimeLocal(editValues.scheduledAt) || new Date().toISOString();
              const normalizedTeamCount = Math.max(1, Math.round(editValues.teamCount) || 1);
              const normalizedPeopleCount = Math.max(1, Math.round(editValues.peopleCount) || 1);
              const normalizedDurationMinutes = Math.max(
                1,
                Math.round(editValues.durationMinutes) || 120,
              );

              try {
                let nextLogoUrl = editValues.logoUrl;
                let nextOfferPdfUrl = editValues.offerPdfUrl;
                let nextOfferPdfName = editValues.offerPdfName;

                if (pendingLogoFile) {
                  const uploadedLogo = await uploadRealizationLogo(pendingLogoFile).unwrap();
                  nextLogoUrl = uploadedLogo.url;
                }

                if (pendingOfferPdfFile) {
                  const uploadedOffer = await uploadRealizationOffer(pendingOfferPdfFile).unwrap();
                  nextOfferPdfUrl = uploadedOffer.url;
                  nextOfferPdfName = pendingOfferPdfFile.name;
                }

                const updatedRealization = await updateRealization({
                  id: realization.id,
                  companyName: normalizedCompanyName,
                  location: editValues.location.trim() || undefined,
                  language: editValues.language,
                  customLanguage: normalizedCustomLanguage,
                  introText: editValues.introText.trim() || undefined,
                  contactPerson: normalizedContactPerson,
                  contactPhone: normalizedContactPhone,
                  contactEmail: normalizedContactEmail,
                  instructors: editValues.instructors,
                  type: editValues.type,
                  logoUrl: nextLogoUrl,
                  offerPdfUrl: nextOfferPdfUrl,
                  offerPdfName: nextOfferPdfName,
                  scenarioId: fallbackScenarioId,
                  teamCount: normalizedTeamCount,
                  peopleCount: normalizedPeopleCount,
                  positionsCount: positionsCountForSubmit,
                  durationMinutes: normalizedDurationMinutes,
                  status: editValues.status,
                  scheduledAt: normalizedScheduledAt,
                  scenarioStations: useCustomScenarioStations ? normalizedScenarioStations : undefined,
                  changedBy: userEmail,
                }).unwrap();
                onSaved?.(updatedRealization);
                setSubmitAttempted(false);
                onClose();
              } catch {
                setEditError("Nie udało się zapisać zmian realizacji.");
              }
            }}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <div className="space-y-4">
              <section className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">ID realizacji</p>
                  <p className="break-all font-mono text-xs text-zinc-300">{realization.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Kod dołączenia</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold tracking-wider text-zinc-100">{realization.joinCode}</p>
                    <button
                      type="button"
                      onClick={() => void copyJoinCode()}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 transition hover:border-zinc-500"
                    >
                      {joinCodeCopied ? "Skopiowano" : "Kopiuj"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Daty</p>
                  <p className="text-xs text-zinc-400">
                    Utworzono: {new Date(realization.createdAt).toLocaleString("pl-PL")} • Ostatnia zmiana:{" "}
                    {new Date(realization.updatedAt).toLocaleString("pl-PL")}
                  </p>
                </div>
              </section>

              {/* ── Klient ── */}
              <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Klient</legend>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa firmy</span>
                  <input
                    value={editValues.companyName}
                    onChange={(event) => setEditValues((prev) => ({ ...prev, companyName: event.target.value }))}
                    className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                      isCompanyNameInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                    }`}
                  />
                  {isCompanyNameInvalid ? <p className="text-xs text-red-300">Uzupełnij nazwę firmy.</p> : null}
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

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Język realizacji</span>
                  <select
                    value={editValues.language}
                    onChange={(event) =>
                      setEditValues((prev) => {
                        const nextLanguage = event.target.value as RealizationLanguage;
                        return {
                          ...prev,
                          language: nextLanguage,
                          customLanguage: nextLanguage === "other" ? prev.customLanguage : "",
                        };
                      })
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    {realizationLanguageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {editValues.language === "other" && (
                    <label className="space-y-1.5 sm:col-span-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Wpisz język</span>
                      <input
                        value={editValues.customLanguage}
                        onChange={(event) =>
                          setEditValues((prev) => ({ ...prev, customLanguage: event.target.value }))
                        }
                        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                          isCustomLanguageInvalid
                            ? "border-red-500/70 focus:border-red-400/80"
                            : "border-zinc-700 focus:border-amber-400/80"
                        }`}
                      />
                      {isCustomLanguageInvalid ? <p className="text-xs text-red-300">Wpisz własny język realizacji.</p> : null}
                    </label>
                  )}

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Lokalizacja realizacji</span>
                    <input
                      value={editValues.location}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, location: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Osoba kontaktowa</span>
                    <input
                      value={editValues.contactPerson}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, contactPerson: event.target.value }))}
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                        isContactPersonInvalid
                          ? "border-red-500/70 focus:border-red-400/80"
                          : "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                    {isContactPersonInvalid ? <p className="text-xs text-red-300">Uzupełnij osobę kontaktową.</p> : null}
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Telefon kontaktowy</span>
                    <input
                      value={editValues.contactPhone}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, contactPhone: event.target.value }))}
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                        isContactChannelInvalid
                          ? "border-red-500/70 focus:border-red-400/80"
                          : "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">E-mail kontaktowy</span>
                    <input
                      type="email"
                      value={editValues.contactEmail}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, contactEmail: event.target.value }))}
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                        isContactChannelInvalid
                          ? "border-red-500/70 focus:border-red-400/80"
                          : "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                    {isContactChannelInvalid ? <p className="text-xs text-red-300">Podaj telefon lub e-mail kontaktowy.</p> : null}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Logo klienta</span>
                  {(pendingLogoPreviewUrl || editValues.logoUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingLogoPreviewUrl ?? editValues.logoUrl}
                      alt="Logo"
                      className="mb-2 h-16 w-16 rounded-lg border border-zinc-700 object-contain"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      setPendingLogoFile(file);
                      setEditError(null);
                      event.currentTarget.value = "";
                    }}
                    className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
                  />
                  {isUploadingLogo && <p className="text-xs text-amber-300">Przesyłanie logo...</p>}
                  {(pendingLogoFile || editValues.logoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingLogoFile(null);
                        setEditValues((prev) => ({ ...prev, logoUrl: undefined }));
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
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
                  <div className="relative">
                    <input
                      ref={scheduledAtInputRef}
                      type="datetime-local"
                      value={editValues.scheduledAt}
                      onChange={(event) => setEditValues((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-100 outline-none ${
                        isScheduledAtInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={openScheduledAtPicker}
                      aria-label="Otwórz kalendarz terminu realizacji"
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 transition hover:text-zinc-200"
                    >
                      <CalendarInputIcon />
                    </button>
                  </div>
                  {isScheduledAtInvalid ? <p className="text-xs text-red-300">Uzupełnij termin realizacji.</p> : null}
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
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Czas trwania (min)</span>
                    <input
                      type="number"
                      min={1}
                      value={editValues.durationMinutes}
                      onChange={(event) =>
                        setEditValues((prev) => ({
                          ...prev,
                          durationMinutes: Number(event.target.value),
                        }))
                      }
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                        isDurationInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                      }`}
                    />
                    {isDurationInvalid ? <p className="text-xs text-red-300">Czas trwania musi być większy od 0.</p> : null}
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
                    onChange={(event) => {
                      const nextScenarioId = event.target.value;
                      setEditValues((prev) => ({ ...prev, scenarioId: nextScenarioId }));
                      setScenarioStations(mapScenarioStations(nextScenarioId));
                    }}
                    className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                      isScenarioInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                    }`}
                  >
                    <option value="">Wybierz scenariusz</option>
                    {scenarios.filter((scenario) => !scenario.sourceTemplateId).map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                  {isScenarioInvalid ? <p className="text-xs text-red-300">Wybierz scenariusz.</p> : null}
                </label>

                <p className="text-xs text-zinc-500">
                  Dla stanowisk Na czas i Na punkty ustaw kod zaliczenia (pole przy stanowisku lub po rozwinięciu).
                </p>
                <div
                  className={`rounded-lg border ${
                    isScenarioStationsEmpty || (submitAttempted && hasInvalidScenarioStations)
                      ? "border-red-500/60"
                      : "border-transparent"
                  }`}
                >
                  <RealizationStationsEditor
                    stations={scenarioStations}
                    onChange={setScenarioStations}
                    showValidation={submitAttempted}
                  />
                </div>
                {isScenarioStationsEmpty ? (
                  <p className="text-xs text-red-300">Dodaj co najmniej jedno stanowisko do realizacji.</p>
                ) : null}

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Oferta PDF</span>
                  {(pendingOfferPdfFile?.name ?? editValues.offerPdfName) && (
                    <p className="mb-1 text-xs text-zinc-300">📄 {pendingOfferPdfFile?.name ?? editValues.offerPdfName}</p>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      setPendingOfferPdfFile(file);
                      setEditError(null);
                      event.currentTarget.value = "";
                    }}
                    className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
                  />
                  {isUploadingOffer && <p className="text-xs text-amber-300">Przesyłanie PDF...</p>}
                  {(pendingOfferPdfFile || editValues.offerPdfUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOfferPdfFile(null);
                        setEditValues((prev) => ({ ...prev, offerPdfUrl: undefined, offerPdfName: undefined }));
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Usuń PDF
                    </button>
                  )}
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Tekst wstępu</span>
                  <textarea
                    value={editValues.introText}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        introText: event.target.value,
                      }))
                    }
                    placeholder="Treść wyświetlana po customizacji drużyny, przed startem aplikacji."
                    rows={5}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                  <p className="text-xs text-zinc-500">To pole jest opcjonalne.</p>
                </label>
              </fieldset>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">Kontakt:</span> {editValues.contactPerson || "-"}
              </p>
              <p>
                <span className="text-zinc-500">Lokalizacja:</span> {editValues.location.trim() || "-"}
              </p>
              <p>
                <span className="text-zinc-500">Język realizacji:</span>{" "}
                {editValues.language === "other"
                  ? editValues.customLanguage.trim() || "Inne"
                  : getRealizationLanguageLabel(editValues.language)}
              </p>
              <p>
                <span className="text-zinc-500">Dane kontaktowe:</span>{" "}
                {editValues.contactPhone || editValues.contactEmail
                  ? `${editValues.contactPhone || "-"} / ${editValues.contactEmail || "-"}`
                  : "-"}
              </p>
              <p>
                <span className="text-zinc-500">Kod dołączenia:</span>{" "}
                <span className="font-mono text-zinc-200">{realization.joinCode}</span>
              </p>
              <p>
                <span className="text-zinc-500">Tekst wstępu:</span> {editValues.introText.trim() ? "Tak" : "Nie"}
              </p>
              <p>
                <span className="text-zinc-500">Suma punktów stanowisk scenariusza:</span>{" "}
                <span className="font-medium text-amber-300">{editStationsPoints}</span>
              </p>
              <p>
                <span className="text-zinc-500">Czas trwania:</span>{" "}
                {Math.max(1, Math.round(editValues.durationMinutes) || 120)} min
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
                disabled={isBusy}
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isUpdating
                  ? "Zapisywanie..."
                  : isUploadingLogo || isUploadingOffer
                    ? "Przesyłanie plików..."
                    : "Zapisz"}
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
