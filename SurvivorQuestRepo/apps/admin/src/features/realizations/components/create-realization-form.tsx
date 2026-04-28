"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Realization,
  RealizationLanguage,
  RealizationStationDraft,
  RealizationStatus,
  RealizationType,
} from "../types/realization";
import {
  formatRealizationLanguageSummary,
  getRealizationLanguageFlag,
  isRealizationLanguageSelectionInvalid,
  parseRealizationLanguageSelection,
  realizationLanguageOptions,
  toRealizationLanguagePayload,
  realizationTypeOptions,
} from "../types/realization";
import type { Scenario } from "@/features/scenario/types/scenario";
import type { Station } from "@/features/games/types/station";
import { useUploadStationAudioMutation } from "@/features/games/api/station.api";
import {
  useCreateRealizationMutation,
  useUploadRealizationLogoMutation,
  useUploadRealizationOfferMutation,
} from "../api/realization.api";
import {
  hasInvalidRealizationStationDrafts,
  normalizeRealizationStationDrafts,
  RealizationStationsEditor,
  toRealizationStationDraft,
} from "./realization-stations-editor";
import { StyledMarkdownEditor } from "./styled-markdown-editor";
import {
  getStatusLabel,
  toDateTimeLocalValue,
  toIsoFromDateTimeLocal,
} from "../realization.utils";

interface CreateRealizationFormProps {
  scenarios: Scenario[];
  stations: Station[];
  userEmail?: string;
  onClose: () => void;
  onSaved?: (realization: Realization) => void;
}

type DateTimeInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

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

export function CreateRealizationForm({ scenarios, stations, userEmail, onClose, onSaved }: CreateRealizationFormProps) {
  const [createRealization, { isLoading: isCreating }] = useCreateRealizationMutation();
  const [uploadRealizationLogo, { isLoading: isUploadingLogo }] = useUploadRealizationLogoMutation();
  const [uploadRealizationOffer, { isLoading: isUploadingOffer }] = useUploadRealizationOfferMutation();
  const [uploadStationAudio, { isLoading: isUploadingStationAudio }] = useUploadStationAudioMutation();

  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<RealizationLanguage[]>(["polish"]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [introText, setIntroText] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [instructors, setInstructors] = useState<string[]>([]);
  const [instructorInput, setInstructorInput] = useState("");
  const [selectedType, setSelectedType] = useState<RealizationType>("outdoor-games");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [offerPdfFile, setOfferPdfFile] = useState<File | null>(null);
  const [offerPdfName, setOfferPdfName] = useState<string | undefined>();
  const [offerPdfError, setOfferPdfError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [peopleCount, setPeopleCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [teamStationNumberingEnabled, setTeamStationNumberingEnabled] = useState(true);
  const [status, setStatus] = useState<RealizationStatus>("planned");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const scheduledAtInputRef = useRef<DateTimeInputElement | null>(null);

  const scenarioById = useMemo(
    () => new Map(scenarios.map((s) => [s.id, s])),
    [scenarios],
  );

  function mapScenarioStations(scenarioId: string) {
    const scenario = scenarioById.get(scenarioId);
    if (!scenario) {
      return [];
    }

    return (scenario.stationIds ?? [])
      .map((stationId) => stations.find((station) => station.id === stationId))
      .filter((station): station is NonNullable<typeof station> => Boolean(station))
      .map(toRealizationStationDraft);
  }

  async function uploadPendingStationAudioFiles(stationDrafts: RealizationStationDraft[]) {
    return Promise.all(
      stationDrafts.map(async (station) => {
        if (station.type !== "audio-quiz" || !station.pendingAudioFile) {
          return station;
        }

        const uploadedAudio = await uploadStationAudio(station.pendingAudioFile).unwrap();
        const targetLanguage = station.pendingAudioLanguage ?? "polish";
        const clearedPending = {
          pendingAudioFile: null,
          pendingAudioLanguage: undefined,
        } as const;

        if (targetLanguage === "polish") {
          if (!station.quiz) {
            return { ...station, ...clearedPending };
          }

          return {
            ...station,
            quiz: {
              ...station.quiz,
              audioUrl: uploadedAudio.url,
            },
            ...clearedPending,
          };
        }

        const currentTranslation = station.translations?.[targetLanguage];
        const sourceQuiz = currentTranslation?.quiz ?? station.quiz;
        if (!sourceQuiz) {
          return { ...station, ...clearedPending };
        }

        return {
          ...station,
          translations: {
            ...(station.translations ?? {}),
            [targetLanguage]: {
              ...(currentTranslation ?? {}),
              quiz: {
                ...sourceQuiz,
                audioUrl: uploadedAudio.url,
              },
            },
          },
          ...clearedPending,
        };
      }),
    );
  }

  const selectedScenario = selectedScenarioId ? scenarioById.get(selectedScenarioId) : undefined;
  const [scenarioStations, setScenarioStations] = useState(() => [] as ReturnType<typeof mapScenarioStations>);
  const positionsCount = scenarioStations.length;
  const selectedStationsPoints = scenarioStations.reduce((sum, station) => sum + station.points, 0);
  const isBusy = isCreating || isUploadingLogo || isUploadingOffer || isUploadingStationAudio;
  const hasInvalidScenarioStations = hasInvalidRealizationStationDrafts(scenarioStations);
  const isCompanyNameInvalid = submitAttempted && !companyName.trim();
  const isScenarioInvalid = submitAttempted && !selectedScenarioId;
  const isContactPersonInvalid = submitAttempted && !contactPerson.trim();
  const isContactChannelInvalid = submitAttempted && !contactPhone.trim() && !contactEmail.trim();
  const languageSelection = useMemo(
    () => ({
      selectedLanguages,
      customLanguage,
    }),
    [selectedLanguages, customLanguage],
  );
  const selectedLanguagesSet = useMemo(() => new Set(selectedLanguages), [selectedLanguages]);
  const languagePayload = useMemo(
    () => toRealizationLanguagePayload(languageSelection),
    [languageSelection],
  );
  const isLanguageSelectionInvalid = submitAttempted && isRealizationLanguageSelectionInvalid(languageSelection);
  const isCustomLanguageInvalid = isLanguageSelectionInvalid && selectedLanguagesSet.has("other");
  const isScheduledAtInvalid = submitAttempted && !scheduledAt;
  const isDurationInvalid = submitAttempted && (!Number.isFinite(durationMinutes) || durationMinutes < 1);
  const isScenarioStationsEmpty = submitAttempted && scenarioStations.length === 0;
  const logoPreviewUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : undefined),
    [logoFile],
  );

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

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

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel tworzenia realizacji"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <form
          className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          onSubmit={async (event) => {
        event.preventDefault();
        setFormError(null);
        setSubmitAttempted(true);
        const hasIncompleteFields =
          !companyName.trim() ||
          !selectedScenarioId ||
          !contactPerson.trim() ||
          (!contactPhone.trim() && !contactEmail.trim()) ||
          isRealizationLanguageSelectionInvalid(languageSelection) ||
          !scheduledAt ||
          !Number.isFinite(durationMinutes) ||
          durationMinutes < 1 ||
          scenarioStations.length === 0;

        if (hasInvalidScenarioStations) {
          setFormError("Nie można zapisać realizacji: popraw dane stanowisk (nazwa/opis/punkty/kody/quiz).");
          return;
        }

        if (
          hasIncompleteFields &&
          !window.confirm("Uwaga: część pól nie jest uzupełniona lub zawiera niepoprawne dane. Czy chcesz kontynuować?")
        ) {
          return;
        }

        const fallbackScenarioId =
          selectedScenarioId || scenarios.find((scenario) => !scenario.sourceTemplateId)?.id || scenarios[0]?.id || "";
        if (!fallbackScenarioId) {
          setFormError("Brak dostępnego scenariusza do utworzenia realizacji.");
          return;
        }

        const scenarioStationsWithUploadedAudio = await uploadPendingStationAudioFiles(scenarioStations);
        const normalizedScenarioStations = normalizeRealizationStationDrafts(scenarioStationsWithUploadedAudio);
        const useCustomScenarioStations = scenarioStations.length > 0;
        const fallbackScenarioStations = mapScenarioStations(fallbackScenarioId);
        const positionsCountForSubmit = Math.max(
          1,
          useCustomScenarioStations ? normalizedScenarioStations.length : fallbackScenarioStations.length,
        );
        const normalizedCompanyName = companyName.trim() || "Nowa realizacja";
        const normalizedContactPerson = contactPerson.trim() || "Brak osoby kontaktowej";
        const normalizedContactEmail = contactEmail.trim() || undefined;
        const normalizedContactPhone = contactPhone.trim() || (normalizedContactEmail ? undefined : "Nie podano");
        const normalizedScheduledAt = toIsoFromDateTimeLocal(scheduledAt) || new Date().toISOString();
        const normalizedTeamCount = Math.max(1, Math.round(teamCount) || 1);
        const normalizedPeopleCount = Math.max(1, Math.round(peopleCount) || 1);
        const normalizedDurationMinutes = Math.max(1, Math.round(durationMinutes) || 120);

        try {
          let logoUrl: string | undefined;
          let offerPdfUrl: string | undefined;
          let nextOfferPdfName: string | undefined;

          if (logoFile) {
            const uploadedLogo = await uploadRealizationLogo(logoFile).unwrap();
            logoUrl = uploadedLogo.url;
          }

          if (offerPdfFile) {
            const uploadedOffer = await uploadRealizationOffer(offerPdfFile).unwrap();
            offerPdfUrl = uploadedOffer.url;
            nextOfferPdfName = offerPdfFile.name;
          }

          const createdRealization = await createRealization({
            companyName: normalizedCompanyName,
            location: location.trim() || undefined,
            language: languagePayload.language,
            customLanguage: languagePayload.customLanguage,
            introText: introText || undefined,
            gameRules: gameRules.trim() || undefined,
            contactPerson: normalizedContactPerson,
            contactPhone: normalizedContactPhone,
            contactEmail: normalizedContactEmail,
            instructors,
            type: selectedType,
            logoUrl,
            offerPdfUrl,
            offerPdfName: nextOfferPdfName,
            scenarioId: fallbackScenarioId,
            teamCount: normalizedTeamCount,
            peopleCount: normalizedPeopleCount,
            positionsCount: positionsCountForSubmit,
            durationMinutes: normalizedDurationMinutes,
            showLeaderboard,
            teamStationNumberingEnabled,
            status,
            scheduledAt: normalizedScheduledAt,
            scenarioStations: useCustomScenarioStations ? normalizedScenarioStations : undefined,
            changedBy: userEmail,
          }).unwrap();
          onSaved?.(createdRealization);
          setCompanyName("");
          setLocation("");
          setContactPerson("");
          setContactPhone("");
          setContactEmail("");
          const defaultLanguageSelection = parseRealizationLanguageSelection("polish");
          setSelectedLanguages(defaultLanguageSelection.selectedLanguages);
          setCustomLanguage(defaultLanguageSelection.customLanguage);
          setIntroText("");
          setGameRules("");
          setInstructors([]);
          setInstructorInput("");
          setStatus("planned");
          setSelectedScenarioId("");
          setTeamCount(2);
          setDurationMinutes(120);
          setShowLeaderboard(true);
          setTeamStationNumberingEnabled(true);
          setLogoFile(null);
          setOfferPdfFile(null);
          setOfferPdfName(undefined);
          setScheduledAt(toDateTimeLocalValue(new Date().toISOString()));
          setScenarioStations([]);
          setSubmitAttempted(false);
          onClose();
        } catch {
          setFormError("Nie udało się dodać realizacji.");
        }
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nowa realizacja</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
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
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  isCompanyNameInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                }`}
              />
              {isCompanyNameInvalid ? <p className="text-xs text-red-300">Uzupełnij nazwę firmy.</p> : null}
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
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  isContactPersonInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                }`}
              />
              {isContactPersonInvalid ? <p className="text-xs text-red-300">Uzupełnij osobę kontaktową.</p> : null}
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Język realizacji</span>
              <div
                className={`grid gap-2 rounded-lg border bg-zinc-950 p-3 ${
                  isLanguageSelectionInvalid ? "border-red-500/70" : "border-zinc-700"
                }`}
              >
                {realizationLanguageOptions.map((option) => {
                  const isChecked = selectedLanguagesSet.has(option.value);
                  return (
                    <label key={option.value} className="inline-flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => {
                          setSelectedLanguages((current) => {
                            if (event.target.checked) {
                              return [...current, option.value].filter(
                                (value, index, list) => list.indexOf(value) === index,
                              );
                            }
                            return current.filter((value) => value !== option.value);
                          });
                        }}
                        className="h-4 w-4 accent-amber-400"
                      />
                      <span>{getRealizationLanguageFlag(option.value)}</span>
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {isLanguageSelectionInvalid ? (
                <p className="text-xs text-red-300">Wybierz co najmniej jeden język realizacji.</p>
              ) : null}
            </label>

            {selectedLanguagesSet.has("other") && (
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-zinc-400">Wpisz język</span>
                <input
                  value={customLanguage}
                  onChange={(event) => setCustomLanguage(event.target.value)}
                  placeholder="Np. Hiszpański"
                  className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                    isCustomLanguageInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                  }`}
                />
                {isCustomLanguageInvalid ? <p className="text-xs text-red-300">Wpisz własny język realizacji.</p> : null}
              </label>
            )}

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Lokalizacja realizacji</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="np. Warszawa, Pole Mokotowskie"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Telefon kontaktowy</span>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="+48 ..."
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  isContactChannelInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                }`}
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400">E-mail kontaktowy</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="kontakt@firma.pl"
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  isContactChannelInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                }`}
              />
              {isContactChannelInvalid ? <p className="text-xs text-red-300">Podaj telefon lub e-mail kontaktowy.</p> : null}
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Logo klienta</span>
            {logoPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreviewUrl} alt="Logo" className="mb-2 h-16 w-16 rounded-lg border border-zinc-700 object-contain" />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                setLogoFile(file);
                setFormError(null);
                event.currentTarget.value = "";
              }}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
            />
            {isUploadingLogo && <p className="text-xs text-amber-300">Przesyłanie logo...</p>}
            {logoFile && (
              <button type="button" onClick={() => setLogoFile(null)} className="text-xs text-red-400 hover:text-red-300">
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
              <div className="relative">
                <input
                  ref={scheduledAtInputRef}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
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

            <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 md:col-span-2">
              <input
                type="checkbox"
                checked={showLeaderboard}
                onChange={(event) => setShowLeaderboard(event.target.checked)}
                className="h-4 w-4 accent-amber-400"
              />
              Pokaż leaderboard na ekranie końcowym (mobile)
            </label>

            <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 md:col-span-2">
              <input
                type="checkbox"
                checked={teamStationNumberingEnabled}
                onChange={(event) => setTeamStationNumberingEnabled(event.target.checked)}
                className="h-4 w-4 accent-amber-400"
              />
              Numeracja stanowisk dla drużyn
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
              <span className="text-xs uppercase tracking-wider text-zinc-400">Czas trwania (min)</span>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  isDurationInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
                }`}
              />
              {isDurationInvalid ? <p className="text-xs text-red-300">Czas trwania musi być większy od 0.</p> : null}
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
              onChange={(event) => {
                const nextScenarioId = event.target.value;
                setSelectedScenarioId(nextScenarioId);
                setScenarioStations(mapScenarioStations(nextScenarioId));
              }}
              className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                isScenarioInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80"
              }`}
            >
              <option value="">Wybierz scenariusz</option>
              {scenarios.filter((s) => !s.sourceTemplateId).map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
            {isScenarioInvalid ? <p className="text-xs text-red-300">Wybierz scenariusz.</p> : null}
          </label>

          <details
            open
            className={`rounded-lg border bg-zinc-950/60 p-3 ${
              isScenarioStationsEmpty || (submitAttempted && hasInvalidScenarioStations) ? "border-red-500/60" : "border-zinc-800"
            }`}
          >
            <summary className="cursor-pointer text-xs uppercase tracking-wider text-zinc-400">
              Stanowiska realizacji ({scenarioStations.length}) • {selectedStationsPoints} pkt
            </summary>
            <div className="mt-3">
              <p className="mb-2 text-xs text-zinc-500">
                Dla stanowisk Na czas i Na punkty ustaw kod zaliczenia (pole przy stanowisku lub po rozwinięciu).
              </p>
              <RealizationStationsEditor
                stations={scenarioStations}
                onChange={setScenarioStations}
                showValidation={submitAttempted}
                selectedLanguages={selectedLanguages}
              />
              {isScenarioStationsEmpty ? (
                <p className="mt-2 text-xs text-red-300">Dodaj co najmniej jedno stanowisko do realizacji.</p>
              ) : null}
            </div>
          </details>

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Oferta PDF</span>
            {offerPdfName && <p className="mb-1 text-xs text-zinc-300">📄 {offerPdfName}</p>}
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                if (!isPdfFile(file)) {
                  setOfferPdfFile(null);
                  setOfferPdfName(undefined);
                  setOfferPdfError("Niedozwolony format pliku. Wybierz plik PDF.");
                  event.currentTarget.value = "";
                  return;
                }

                setOfferPdfFile(file);
                setOfferPdfName(file.name);
                setOfferPdfError(null);
                setFormError(null);
                event.currentTarget.value = "";
              }}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
            />
            {offerPdfError && <p className="text-xs text-red-300">{offerPdfError}</p>}
            {isUploadingOffer && <p className="text-xs text-amber-300">Przesyłanie PDF...</p>}
            {offerPdfFile && (
              <button
                type="button"
                onClick={() => {
                  setOfferPdfFile(null);
                  setOfferPdfName(undefined);
                  setOfferPdfError(null);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Usuń PDF
              </button>
              )}
            </div>

            <StyledMarkdownEditor
              label="Tekst wstępu"
              value={introText}
              onChange={setIntroText}
              placeholder="Treść wyświetlana po customizacji drużyny, przed startem aplikacji."
              rows={5}
              helperText="To pole jest opcjonalne. Obsługuje podstawowe formatowanie i listy."
            />
            <StyledMarkdownEditor
              label="Zasady gry"
              value={gameRules}
              onChange={setGameRules}
              placeholder="Wpisz zasady gry widoczne po Welcome screen."
              rows={8}
              helperText="To pole jest opcjonalne. Obsługuje podstawowe formatowanie i listy."
            />
          </fieldset>

        {formError && <p className="text-sm text-red-300">{formError}</p>}

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
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {isCreating
              ? "Dodawanie..."
              : isUploadingLogo || isUploadingOffer || isUploadingStationAudio
                ? "Przesyłanie plików..."
                : "Dodaj realizację"}
          </button>
        </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Podsumowanie</p>
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Firma:</span> {companyName.trim() || "-"}
          </p>
          <p>
            <span className="text-zinc-500">Kontakt:</span> {contactPerson.trim() || "-"}
          </p>
          <p>
            <span className="text-zinc-500">Lokalizacja:</span> {location.trim() || "-"}
          </p>
          <p>
            <span className="text-zinc-500">Język realizacji:</span>{" "}
            {formatRealizationLanguageSummary(languagePayload.language, languagePayload.customLanguage)}
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
            <span className="text-zinc-500">Czas trwania:</span> {Math.max(1, Math.round(durationMinutes) || 120)} min
          </p>
          <p>
            <span className="text-zinc-500">Drużyny:</span> {teamCount}
          </p>
          <p>
            <span className="text-zinc-500">Scenariusz:</span> {selectedScenario?.name ?? "-"}
          </p>
          <p>
            <span className="text-zinc-500">Tekst wstępu:</span> {introText.trim() ? "Tak" : "Nie"}
          </p>
          <p>
            <span className="text-zinc-500">Zasady gry:</span> {gameRules.trim() ? "Tak" : "Nie"}
          </p>
          <p>
            <span className="text-zinc-500">Leaderboard na ekranie końcowym:</span> {showLeaderboard ? "Tak" : "Nie"}
          </p>
          <p>
            <span className="text-zinc-500">Numeracja stanowisk dla drużyn:</span> {teamStationNumberingEnabled ? "Tak" : "Nie"}
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
      </section>
        </form>
      </aside>
    </>
  );
}
