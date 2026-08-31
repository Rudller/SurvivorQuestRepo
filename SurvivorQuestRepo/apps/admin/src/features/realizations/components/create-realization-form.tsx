"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type {
  Realization,
  RealizationExportFile,
  RealizationLanguage,
  RealizationStationDraft,
  RealizationStatus,
  RealizationTranslations,
  RealizationType,
} from "../types/realization";
import { buildRealizationExport, parseRealizationExportFile } from "../realization-export";
import { RYZYKANCI_DEFAULT_INTRO_TEXT } from "../realization-default-texts";
import { geocodeLocation } from "../realization-geocoding";
import {
  formatRealizationLanguageSummary,
  formatStationsTotalTime,
  getRealizationLanguageFlag,
  isRealizationLanguageSelectionInvalid,
  parseRealizationLanguageSelection,
  realizationLanguageOptions,
  toRealizationLanguagePayload,
  realizationTypeOptions,
} from "../types/realization";
import type { Scenario } from "@/features/scenario/types/scenario";
import { resolveApiErrorMessage } from "@/shared/lib/api-error";
import { resolveFieldBorderClassName } from "@/shared/lib/form-styles";
import { useIsDirty } from "@/shared/lib/use-is-dirty";
import { FormSection } from "@/shared/components/form-section";
import { SummaryCard } from "@/shared/components/summary-card";
import { SegmentedToggle } from "@/shared/components/segmented-toggle";
import { TabStrip, type TabItem } from "@/shared/components/tab-strip";
import type { Station } from "@/features/games/types/station";
import { useUploadStationAudioMutation } from "@/features/games/api/station.api";
import {
  useCreateRealizationMutation,
  useTranslateRealizationTextsMutation,
  useUploadRealizationLogoMutation,
  useUploadRealizationMapImageMutation,
  useUploadRealizationOfferMutation,
} from "../api/realization.api";
import {
  hasInvalidRealizationStationDrafts,
  normalizeRealizationStationDrafts,
  RealizationStationsEditor,
  toRealizationStationDraft,
} from "./realization-stations-editor";
import { StyledMarkdownEditor } from "./styled-markdown-editor";
import { UploadedAssetPicker } from "./uploaded-asset-picker";
import { PointsQrCodesDraftEditor, type PointsQrCodeDraft } from "./points-qr-codes-draft-editor";
import { useCreateRiskSchemeMutation, useGetRiskSchemesQuery } from "@/features/risk-quiz/api/risk-quiz.api";
import {
  getDistinctUsedAssets,
  getStatusLabel,
  RISK_QUIZ_INTRO_TEXT_PLACEHOLDER,
  toDateTimeLocalValue,
  toIsoFromDateTimeLocal,
} from "../realization.utils";
import {
  REALIZATION_FORM_TAB_LABELS,
  REALIZATION_FORM_TAB_ORDER,
  type RealizationFormTabId,
} from "../realization-form-tabs";

interface CreateRealizationFormProps {
  scenarios: Scenario[];
  stations: Station[];
  realizations: Realization[];
  userEmail?: string;
  onClose: () => void;
  onSaved?: (realization: Realization) => void;
}

type DateTimeInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

const assetInputModeOptions = [
  { value: "upload", label: "Prześlij nowy plik" },
  { value: "existing", label: "Wybierz z już użytych" },
] as const;

const CREATE_FORM_TAB_ORDER = REALIZATION_FORM_TAB_ORDER.filter((id) => id !== "history");

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isRealizationLanguage(value: string): value is RealizationLanguage {
  return value === "polish" || value === "english" || value === "ukrainian" || value === "russian" || value === "other";
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

export function CreateRealizationForm({ scenarios, stations, realizations, userEmail, onClose, onSaved }: CreateRealizationFormProps) {
  const [createRealization, { isLoading: isCreating }] = useCreateRealizationMutation();
  const [uploadRealizationLogo, { isLoading: isUploadingLogo }] = useUploadRealizationLogoMutation();
  const [uploadRealizationMapImage, { isLoading: isUploadingMapImage }] = useUploadRealizationMapImageMutation();
  const [uploadRealizationOffer, { isLoading: isUploadingOffer }] = useUploadRealizationOfferMutation();
  const [uploadStationAudio, { isLoading: isUploadingStationAudio }] = useUploadStationAudioMutation();
  const [translateRealizationTexts, { isLoading: isAutoTranslating }] = useTranslateRealizationTextsMutation();

  const [activeTab, setActiveTab] = useState<RealizationFormTabId>("basic");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<RealizationLanguage[]>(["polish"]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [introText, setIntroText] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [translations, setTranslations] = useState<RealizationTranslations>({});
  const [textEditingLanguage, setTextEditingLanguage] = useState<RealizationLanguage>("polish");
  const [autoTranslateMessage, setAutoTranslateMessage] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [instructorInput, setInstructorInput] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedType, setSelectedType] = useState<RealizationType>("outdoor-games");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "existing">("upload");
  const [hideMap, setHideMap] = useState(false);
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(undefined);
  const [mapImageInputMode, setMapImageInputMode] = useState<"upload" | "existing">("upload");
  const [offerPdfFile, setOfferPdfFile] = useState<File | null>(null);
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | undefined>(undefined);
  const [offerPdfName, setOfferPdfName] = useState<string | undefined>();
  const [offerPdfError, setOfferPdfError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [peopleCount, setPeopleCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [showLeaderboardDuringGame, setShowLeaderboardDuringGame] = useState(true);
  const [showLeaderboardOnFinish, setShowLeaderboardOnFinish] = useState(true);
  const [hideLeaderboardMinutesBeforeEnd, setHideLeaderboardMinutesBeforeEnd] = useState(0);
  const [teamStationNumberingEnabled, setTeamStationNumberingEnabled] = useState(true);
  const [timedStationPointsDecayEnabled, setTimedStationPointsDecayEnabled] = useState(false);
  const [hideTaskList, setHideTaskList] = useState(false);
  const [riskChatEnabled, setRiskChatEnabled] = useState(true);
  const [riskChatTeamsCanPost, setRiskChatTeamsCanPost] = useState(true);
  const [pigsEnabled, setPigsEnabled] = useState(true);
  const [pigGrantIntervalMinutes, setPigGrantIntervalMinutes] = useState(5);
  const [pigEffectSeconds, setPigEffectSeconds] = useState(90);
  const [pigShowThrowerName, setPigShowThrowerName] = useState(true);
  const [status, setStatus] = useState<RealizationStatus>("planned");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [locationSuggestedCenter, setLocationSuggestedCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const scheduledAtInputRef = useRef<DateTimeInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleLocationBlur() {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      return;
    }

    const geocoded = await geocodeLocation(trimmedLocation);
    setLocationSuggestedCenter(geocoded);
  }

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
  const [pointsQrCodeDrafts, setPointsQrCodeDrafts] = useState<PointsQrCodeDraft[]>([]);
  const [selectedRiskSchemeId, setSelectedRiskSchemeId] = useState("");
  const { data: riskSchemes, isLoading: isRiskSchemesLoading } = useGetRiskSchemesQuery();
  const [createRiskScheme, { isLoading: isCreatingRiskScheme }] = useCreateRiskSchemeMutation();
  const [isCreatingNewRiskScheme, setIsCreatingNewRiskScheme] = useState(false);
  const [newRiskSchemeName, setNewRiskSchemeName] = useState("");
  const [createRiskSchemeError, setCreateRiskSchemeError] = useState<string | null>(null);

  async function handleCreateRiskScheme() {
    setCreateRiskSchemeError(null);
    if (!newRiskSchemeName.trim()) return;
    try {
      const created = await createRiskScheme({ name: newRiskSchemeName.trim() }).unwrap();
      setSelectedRiskSchemeId(created.id);
      setNewRiskSchemeName("");
      setIsCreatingNewRiskScheme(false);
    } catch {
      setCreateRiskSchemeError("Nie udało się utworzyć talii (nazwa może być już zajęta).");
    }
  }
  const selectedStationsPoints = scenarioStations.reduce((sum, station) => sum + station.points, 0);
  const selectedStationsTimeSeconds = scenarioStations.reduce(
    (sum, station) => sum + (station.timeLimitSeconds || 0),
    0,
  );
  const isBusy = isCreating || isUploadingLogo || isUploadingMapImage || isUploadingOffer || isUploadingStationAudio;
  const hasInvalidScenarioStations = hasInvalidRealizationStationDrafts(scenarioStations);
  const isCompanyNameInvalid = submitAttempted && !companyName.trim();
  const isRiskQuizType = selectedType === "risk-quiz";
  const isScenarioInvalid = submitAttempted && !isRiskQuizType && !selectedScenarioId;
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
  const baseTextLanguage = languagePayload.language;
  const textEditableLanguages = useMemo(
    () => (selectedLanguages.includes(baseTextLanguage) ? selectedLanguages : [baseTextLanguage, ...selectedLanguages]),
    [selectedLanguages, baseTextLanguage],
  );
  const isEditingBaseTextLanguage = textEditingLanguage === baseTextLanguage;
  const isTextAutoTranslateDisabled =
    isAutoTranslating || isEditingBaseTextLanguage || textEditingLanguage === "other" || baseTextLanguage === "other";
  const effectiveIntroText = isEditingBaseTextLanguage ? introText : translations[textEditingLanguage]?.introText ?? "";
  const effectiveGameRules = isEditingBaseTextLanguage ? gameRules : translations[textEditingLanguage]?.gameRules ?? "";

  function updateEffectiveIntroText(nextValue: string) {
    if (isEditingBaseTextLanguage) {
      setIntroText(nextValue);
      return;
    }

    setTranslations((current) => ({
      ...current,
      [textEditingLanguage]: { ...current[textEditingLanguage], introText: nextValue },
    }));
  }

  function updateEffectiveGameRules(nextValue: string) {
    if (isEditingBaseTextLanguage) {
      setGameRules(nextValue);
      return;
    }

    setTranslations((current) => ({
      ...current,
      [textEditingLanguage]: { ...current[textEditingLanguage], gameRules: nextValue },
    }));
  }

  // Ryzykanci have no separate rules field, so their whole briefing lives in
  // the intro text — seed it rather than handing the operator an empty box.
  // Only ever touches text that is empty or still the untouched default, so
  // flipping the type around never eats something someone wrote.
  function handleTypeChange(nextType: RealizationType) {
    setSelectedType(nextType);

    if (nextType === "risk-quiz" && !introText.trim()) {
      setIntroText(RYZYKANCI_DEFAULT_INTRO_TEXT);
      return;
    }

    if (nextType !== "risk-quiz" && introText.trim() === RYZYKANCI_DEFAULT_INTRO_TEXT.trim()) {
      setIntroText("");
    }
  }

  async function handleAutoTranslateText() {
    if (isEditingBaseTextLanguage || textEditingLanguage === "other" || baseTextLanguage === "other") {
      return;
    }

    const texts: string[] = [];
    const fields: Array<"introText" | "gameRules"> = [];
    const currentTranslation = translations[textEditingLanguage];

    if (!currentTranslation?.introText?.trim() && introText.trim()) {
      fields.push("introText");
      texts.push(introText);
    }
    if (!isRiskQuizType && !currentTranslation?.gameRules?.trim() && gameRules.trim()) {
      fields.push("gameRules");
      texts.push(gameRules);
    }

    if (texts.length === 0) {
      setAutoTranslateMessage(
        isRiskQuizType
          ? "Tekst wstępu ma już tłumaczenie dla tego języka."
          : "Tekst wstępu i zasady gry mają już tłumaczenie dla tego języka.",
      );
      return;
    }

    setAutoTranslateMessage(null);
    try {
      const response = await translateRealizationTexts({
        sourceLanguage: baseTextLanguage,
        targetLanguage: textEditingLanguage,
        texts,
      }).unwrap();

      setTranslations((current) => {
        const next = { ...current[textEditingLanguage] };
        fields.forEach((field, index) => {
          const translated = response.texts[index]?.trim();
          if (translated) {
            next[field] = translated;
          }
        });
        return { ...current, [textEditingLanguage]: next };
      });
    } catch {
      setAutoTranslateMessage("Nie udało się przetłumaczyć tekstu. Sprawdź konfigurację auto-tłumacza i spróbuj ponownie.");
    }
  }
  const isScheduledAtInvalid = submitAttempted && !scheduledAt;
  const isDurationInvalid = submitAttempted && (!Number.isFinite(durationMinutes) || durationMinutes < 1);
  const isScenarioStationsEmpty = submitAttempted && !isRiskQuizType && scenarioStations.length === 0;
  const basicTabHasError =
    isCompanyNameInvalid ||
    isContactPersonInvalid ||
    isContactChannelInvalid ||
    isLanguageSelectionInvalid ||
    isCustomLanguageInvalid ||
    isScheduledAtInvalid ||
    isDurationInvalid;
  const scenarioTabHasError = isScenarioInvalid;
  const stationsTabHasError = isScenarioStationsEmpty || (submitAttempted && hasInvalidScenarioStations);
  const riskQuizTabHasError = submitAttempted && isRiskQuizType && !selectedRiskSchemeId;
  const tabs: TabItem[] = CREATE_FORM_TAB_ORDER.filter((id) => {
    if (id === "riskQuiz") return isRiskQuizType;
    // Ryzykanci have no scenario and no stations, but they do have the intro
    // text — and that text is their entire briefing, so the tab holding it has
    // to stay reachable. It just drops the scenario picker and renames itself.
    if (id === "stations" || id === "pointsQr") return !isRiskQuizType;
    return true;
  }).map((id) => ({
    id,
    label:
      id === "scenario" && isRiskQuizType ? "Treści i oferta" : REALIZATION_FORM_TAB_LABELS[id],
    hasError:
      id === "basic"
        ? basicTabHasError
        : id === "scenario"
          ? scenarioTabHasError
          : id === "stations"
            ? stationsTabHasError
            : id === "riskQuiz"
              ? riskQuizTabHasError
              : false,
  }));
  const logoPreviewUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : undefined),
    [logoFile],
  );
  const mapImagePreviewUrl = useMemo(
    () => (mapImageFile ? URL.createObjectURL(mapImageFile) : undefined),
    [mapImageFile],
  );
  const copyableRealizationOptions = useMemo(
    () =>
      [...realizations].sort(
        (left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
      ),
    [realizations],
  );
  const usedLogoOptions = useMemo(
    () => getDistinctUsedAssets(realizations, "logoUrl"),
    [realizations],
  );
  const usedMapImageOptions = useMemo(
    () => getDistinctUsedAssets(realizations, "mapImageUrl"),
    [realizations],
  );

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (mapImagePreviewUrl) {
        URL.revokeObjectURL(mapImagePreviewUrl);
      }
    };
  }, [mapImagePreviewUrl]);

  if (!textEditableLanguages.includes(textEditingLanguage)) {
    setTextEditingLanguage(baseTextLanguage);
  }

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

  function applyImportedData(data: RealizationExportFile) {
    const importedLanguageSelection = parseRealizationLanguageSelection(
      data.realization.language,
      data.realization.customLanguage,
    );

    setCompanyName(data.realization.companyName);
    setLocation(data.realization.location ?? "");
    setContactPerson(data.realization.contactPerson);
    setContactPhone(data.realization.contactPhone ?? "");
    setContactEmail(data.realization.contactEmail ?? "");
    setSelectedLanguages(importedLanguageSelection.selectedLanguages);
    setCustomLanguage(importedLanguageSelection.customLanguage);
    setIntroText(data.realization.introText ?? "");
    setGameRules(data.realization.gameRules ?? "");
    setTranslations(data.realization.translations ?? {});
    setInstructors(data.realization.instructors);
    setInstructorInput("");
    setNotes(data.realization.notes ?? "");
    setSelectedType(data.realization.type);
    setLogoFile(null);
    setLogoUrl(data.realization.logoUrl);
    setLogoInputMode("upload");
    setHideMap(data.realization.hideMap);
    setMapImageFile(null);
    setMapImageUrl(data.realization.mapImageUrl);
    setMapImageInputMode("upload");
    setOfferPdfFile(null);
    setOfferPdfUrl(data.realization.offerPdfUrl);
    setOfferPdfName(data.realization.offerPdfName);
    setOfferPdfError(null);
    setSelectedScenarioId("");
    setTeamCount(data.realization.teamCount);
    setPeopleCount(data.realization.peopleCount);
    setDurationMinutes(data.realization.durationMinutes);
    setShowLeaderboardDuringGame(data.realization.showLeaderboardDuringGame);
    setShowLeaderboardOnFinish(data.realization.showLeaderboardOnFinish);
    setHideLeaderboardMinutesBeforeEnd(data.realization.hideLeaderboardMinutesBeforeEnd ?? 0);
    setTeamStationNumberingEnabled(data.realization.teamStationNumberingEnabled);
    setTimedStationPointsDecayEnabled(data.realization.timedStationPointsDecayEnabled);
    setHideTaskList(data.realization.hideTaskList);
    setRiskChatEnabled(data.realization.riskChatEnabled);
    setRiskChatTeamsCanPost(data.realization.riskChatTeamsCanPost);
    setPigsEnabled(data.realization.pigsEnabled);
    setPigGrantIntervalMinutes(data.realization.pigGrantIntervalMinutes);
    setPigEffectSeconds(data.realization.pigEffectSeconds);
    setPigShowThrowerName(data.realization.pigShowThrowerName);
    setStatus(data.realization.status);
    setScheduledAt(toDateTimeLocalValue(data.realization.scheduledAt));
    setScenarioStations(data.scenarioStations);
    const importedLocation = data.realization.location?.trim();
    setLocationSuggestedCenter(null);
    if (importedLocation) {
      void geocodeLocation(importedLocation).then(setLocationSuggestedCenter);
    }
    setFormError(null);
    setSubmitAttempted(false);
    setActiveTab("basic");
  }

  async function handleImportFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    try {
      const raw = JSON.parse(await file.text());
      const parsed = parseRealizationExportFile(raw);
      if (!parsed) {
        setImportError("Niepoprawny plik JSON realizacji.");
        return;
      }

      const confirmed = window.confirm(
        "Wgranie tego pliku nadpisze wszystkie obecnie wypełnione pola formularza. Kontynuować?",
      );
      if (!confirmed) {
        return;
      }

      setImportError(null);
      applyImportedData(parsed);
    } catch {
      setImportError("Nie udało się odczytać pliku JSON.");
    }
  }

  function handleCopyFromRealization(realizationId: string) {
    if (!realizationId) {
      return;
    }

    const sourceRealization = realizations.find((item) => item.id === realizationId);
    if (!sourceRealization) {
      setImportError("Nie znaleziono wybranej realizacji.");
      return;
    }

    const confirmed = window.confirm(
      "Skopiowanie tej realizacji nadpisze wszystkie obecnie wypełnione pola formularza. Kontynuować?",
    );
    if (!confirmed) {
      return;
    }

    setImportError(null);
    applyImportedData(buildRealizationExport(sourceRealization));
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

  const isDirty = useIsDirty({
    companyName,
    location,
    contactPerson,
    contactPhone,
    contactEmail,
    selectedLanguages,
    customLanguage,
    introText,
    gameRules,
    translations,
    instructors,
    notes,
    selectedType,
    logoFileName: logoFile?.name ?? null,
    logoUrl,
    logoInputMode,
    hideMap,
    mapImageFileName: mapImageFile?.name ?? null,
    mapImageUrl,
    mapImageInputMode,
    offerPdfFileName: offerPdfFile?.name ?? null,
    offerPdfUrl,
    offerPdfName,
    selectedScenarioId,
    teamCount,
    peopleCount,
    durationMinutes,
    showLeaderboardDuringGame,
    showLeaderboardOnFinish,
    hideLeaderboardMinutesBeforeEnd,
    teamStationNumberingEnabled,
    timedStationPointsDecayEnabled,
    hideTaskList,
    riskChatEnabled,
    riskChatTeamsCanPost,
    pigsEnabled,
    pigGrantIntervalMinutes,
    pigEffectSeconds,
    pigShowThrowerName,
    status,
    scheduledAt,
    scenarioStations,
    pointsQrCodeDrafts,
  });

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel tworzenia realizacji"
        onClick={() => {
          if (!isDirty) {
            onClose();
          }
        }}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950 lg:w-3/4">
        <form
          className="sq-form flex h-full min-h-0 flex-col"
          onSubmit={async (event) => {
            event.preventDefault();
            setFormError(null);
            setSubmitAttempted(true);

            const basicTabInvalid =
              !companyName.trim() ||
              !contactPerson.trim() ||
              (!contactPhone.trim() && !contactEmail.trim()) ||
              isRealizationLanguageSelectionInvalid(languageSelection) ||
              !scheduledAt ||
              !Number.isFinite(durationMinutes) ||
              durationMinutes < 1;
            const scenarioTabInvalid = !isRiskQuizType && !selectedScenarioId;
            const stationsTabInvalid = !isRiskQuizType && scenarioStations.length === 0;
            const riskQuizTabInvalid = isRiskQuizType && !selectedRiskSchemeId;
            const hasIncompleteFields =
              basicTabInvalid || scenarioTabInvalid || stationsTabInvalid || riskQuizTabInvalid;

            if (hasInvalidScenarioStations) {
              setActiveTab("stations");
              setFormError("Nie można zapisać realizacji: popraw dane stanowisk (nazwa/opis/punkty/kody/quiz).");
              return;
            }

            if (hasIncompleteFields) {
              const firstInvalidTab: RealizationFormTabId = basicTabInvalid
                ? "basic"
                : scenarioTabInvalid
                  ? "scenario"
                  : stationsTabInvalid
                    ? "stations"
                    : "riskQuiz";
              setActiveTab(firstInvalidTab);

              if (!window.confirm("Uwaga: część pól nie jest uzupełniona lub zawiera niepoprawne dane. Czy chcesz kontynuować?")) {
                return;
              }
            }

            let fallbackScenarioId = "";
            if (!isRiskQuizType) {
              fallbackScenarioId =
                selectedScenarioId || scenarios.find((scenario) => !scenario.sourceTemplateId)?.id || scenarios[0]?.id || "";
              if (!fallbackScenarioId) {
                setFormError("Brak dostępnego scenariusza do utworzenia realizacji.");
                return;
              }
            }

            const scenarioStationsWithUploadedAudio = await uploadPendingStationAudioFiles(scenarioStations);
            const normalizedScenarioStations = normalizeRealizationStationDrafts(scenarioStationsWithUploadedAudio);
            const useCustomScenarioStations = !isRiskQuizType && scenarioStations.length > 0;
            const fallbackScenarioStations = isRiskQuizType ? [] : mapScenarioStations(fallbackScenarioId);
            const positionsCountForSubmit = isRiskQuizType
              ? 1
              : Math.max(
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
              let finalLogoUrl = logoUrl;
              let finalOfferPdfUrl = offerPdfUrl;
              let nextOfferPdfName = offerPdfName;

              if (logoFile) {
                const uploadedLogo = await uploadRealizationLogo(logoFile).unwrap();
                finalLogoUrl = uploadedLogo.url;
              }

              let finalMapImageUrl = mapImageUrl;
              if (mapImageFile) {
                const uploadedMapImage = await uploadRealizationMapImage(mapImageFile).unwrap();
                finalMapImageUrl = uploadedMapImage.url;
              }

              if (offerPdfFile) {
                const uploadedOffer = await uploadRealizationOffer(offerPdfFile).unwrap();
                finalOfferPdfUrl = uploadedOffer.url;
                nextOfferPdfName = offerPdfFile.name;
              }

              const createdRealization = await createRealization({
                companyName: normalizedCompanyName,
                location: location.trim() || undefined,
                language: languagePayload.language,
                customLanguage: languagePayload.customLanguage,
                introText: introText || undefined,
                gameRules: gameRules.trim() || undefined,
                translations: Object.keys(translations).length > 0 ? translations : undefined,
                contactPerson: normalizedContactPerson,
                contactPhone: normalizedContactPhone,
                contactEmail: normalizedContactEmail,
                instructors,
                notes: notes.trim() || undefined,
                type: selectedType,
                logoUrl: finalLogoUrl,
                hideMap,
                mapImageUrl: finalMapImageUrl,
                offerPdfUrl: finalOfferPdfUrl,
                offerPdfName: nextOfferPdfName,
                scenarioId: isRiskQuizType ? undefined : fallbackScenarioId,
                riskSchemeId: isRiskQuizType ? selectedRiskSchemeId : undefined,
                teamCount: normalizedTeamCount,
                peopleCount: normalizedPeopleCount,
                positionsCount: positionsCountForSubmit,
                durationMinutes: normalizedDurationMinutes,
                showLeaderboard: showLeaderboardDuringGame || showLeaderboardOnFinish,
                showLeaderboardDuringGame,
                showLeaderboardOnFinish,
                hideLeaderboardMinutesBeforeEnd,
                teamStationNumberingEnabled,
                timedStationPointsDecayEnabled,
                hideTaskList,
                riskChatEnabled,
                riskChatTeamsCanPost,
                pigsEnabled,
                pigGrantIntervalMinutes,
                pigEffectSeconds,
                pigShowThrowerName,
                status,
                scheduledAt: normalizedScheduledAt,
                scenarioStations: useCustomScenarioStations ? normalizedScenarioStations : undefined,
                pointsQrCodes: pointsQrCodeDrafts.map((draft) => ({
                  points: draft.points,
                  label: draft.label || undefined,
                  code: draft.code || undefined,
                  claimMode: draft.claimMode,
                })),
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
              setTranslations({});
              setTextEditingLanguage("polish");
              setInstructors([]);
              setInstructorInput("");
              setNotes("");
              setStatus("planned");
              setTimedStationPointsDecayEnabled(false);
              setSelectedScenarioId("");
              setTeamCount(2);
              setDurationMinutes(120);
              setShowLeaderboardDuringGame(true);
              setShowLeaderboardOnFinish(true);
              setTeamStationNumberingEnabled(true);
              setLogoFile(null);
              setLogoUrl(undefined);
              setLogoInputMode("upload");
              setHideMap(false);
              setMapImageFile(null);
              setMapImageUrl(undefined);
              setMapImageInputMode("upload");
              setOfferPdfFile(null);
              setOfferPdfUrl(undefined);
              setOfferPdfName(undefined);
              setScheduledAt(toDateTimeLocalValue(new Date().toISOString()));
              setScenarioStations([]);
              setPointsQrCodeDrafts([]);
              setSelectedRiskSchemeId("");
              setSubmitAttempted(false);
              setActiveTab("basic");
              onClose();
            } catch (error) {
              setFormError(resolveApiErrorMessage(error) ?? "Nie udało się dodać realizacji.");
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-6">
            <h2 className="text-xl font-semibold text-zinc-100">Nowa realizacja</h2>
            <div className="flex shrink-0 items-center gap-2">
              {copyableRealizationOptions.length > 0 && (
                <select
                  value=""
                  onChange={(event) => handleCopyFromRealization(event.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 outline-none transition hover:border-zinc-500 focus:border-amber-400/80"
                >
                  <option value="">Kopiuj z istniejącej realizacji...</option>
                  {copyableRealizationOptions.map((realization) => (
                    <option key={realization.id} value={realization.id}>
                      {realization.companyName} • {new Date(realization.scheduledAt).toLocaleDateString("pl-PL")}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                Importuj z JSON
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                Zamknij
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="sq-button rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
              >
                {isCreating
                  ? "Dodawanie..."
                  : isUploadingLogo || isUploadingMapImage || isUploadingOffer || isUploadingStationAudio
                    ? "Przesyłanie plików..."
                    : "Dodaj realizację"}
              </button>
            </div>
          </div>

          <TabStrip tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as RealizationFormTabId)} className="px-4 sm:px-6" />

          {importError && (
            <div className="mx-4 mt-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 sm:mx-6">
              {importError}
            </div>
          )}
          {formError && <p className="sq-error-banner mx-4 mt-3 sm:mx-6">{formError}</p>}

          <div className="sq-thin-scrollbar min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            {activeTab === "basic" && (
              <>
                <FormSection title="Klient">
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa firmy</span>
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Nazwa firmy"
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isCompanyNameInvalid)}`}
                    />
                    {isCompanyNameInvalid ? <p className="text-xs text-red-300">Uzupełnij nazwę firmy.</p> : null}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Typ realizacji</span>
                    <select
                      value={selectedType}
                      onChange={(event) => handleTypeChange(event.target.value as RealizationType)}
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedLanguagesSet.has("other") && (
                      <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs uppercase tracking-wider text-zinc-400">Wpisz język</span>
                        <input
                          value={customLanguage}
                          onChange={(event) => setCustomLanguage(event.target.value)}
                          placeholder="Np. Hiszpański"
                          className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isCustomLanguageInvalid)}`}
                        />
                        {isCustomLanguageInvalid ? <p className="text-xs text-red-300">Wpisz własny język realizacji.</p> : null}
                      </label>
                    )}

                    <label className="space-y-1.5 sm:col-span-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Lokalizacja realizacji</span>
                      <input
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        onBlur={handleLocationBlur}
                        placeholder="np. Warszawa, Pole Mokotowskie"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Osoba kontaktowa</span>
                      <input
                        value={contactPerson}
                        onChange={(event) => setContactPerson(event.target.value)}
                        placeholder="Imię i nazwisko"
                        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isContactPersonInvalid)}`}
                      />
                      {isContactPersonInvalid ? <p className="text-xs text-red-300">Uzupełnij osobę kontaktową.</p> : null}
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Telefon kontaktowy</span>
                      <input
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="+48 ..."
                        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isContactChannelInvalid)}`}
                      />
                    </label>

                    <label className="space-y-1.5 sm:col-span-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">E-mail kontaktowy</span>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        placeholder="kontakt@firma.pl"
                        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isContactChannelInvalid)}`}
                      />
                      {isContactChannelInvalid ? <p className="text-xs text-red-300">Podaj telefon lub e-mail kontaktowy.</p> : null}
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Logo klienta</span>
                    {(logoPreviewUrl ?? logoUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreviewUrl ?? logoUrl} alt="Logo" className="mb-2 h-16 w-16 rounded-lg border border-zinc-700 object-contain" />
                    )}
                    {usedLogoOptions.length > 0 && (
                      <SegmentedToggle options={assetInputModeOptions} value={logoInputMode} onChange={setLogoInputMode} />
                    )}
                    {logoInputMode === "existing" && usedLogoOptions.length > 0 ? (
                      <UploadedAssetPicker
                        options={usedLogoOptions}
                        selectedUrl={logoUrl}
                        onSelect={(url) => {
                          setLogoUrl(url);
                          setLogoFile(null);
                        }}
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          setLogoFile(file);
                          setLogoUrl(undefined);
                          setFormError(null);
                          event.currentTarget.value = "";
                        }}
                        className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
                      />
                    )}
                    {isUploadingLogo && <p className="text-xs text-amber-300">Przesyłanie logo...</p>}
                    {(logoFile || logoUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoUrl(undefined);
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Usuń logo
                      </button>
                    )}
                  </div>
                </FormSection>

                <FormSection title="Instruktorzy">
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
                </FormSection>

                <FormSection title="Notatki">
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Notatki wewnętrzne</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Notatki robocze widoczne tylko w panelu admina."
                      rows={4}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                    <p className="text-xs text-zinc-500">Widoczne tylko w panelu admina, nie w aplikacji mobilnej.</p>
                  </label>
                </FormSection>

                <FormSection title="Harmonogram i status">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Termin realizacji</span>
                      <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                          <input
                            ref={scheduledAtInputRef}
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(event) => setScheduledAt(event.target.value)}
                            className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isScheduledAtInvalid)}`}
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
                        <button
                          type="button"
                          onClick={() => setScheduledAt(toDateTimeLocalValue(new Date().toISOString()))}
                          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 transition hover:border-amber-400/80 hover:text-amber-300"
                        >
                          Teraz
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
                  </div>
                </FormSection>

                <FormSection title="Liczebność">
                  <div className="grid gap-3 sm:grid-cols-3">
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
                        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isDurationInvalid)}`}
                      />
                      {isDurationInvalid ? <p className="text-xs text-red-300">Czas trwania musi być większy od 0.</p> : null}
                    </label>
                  </div>
                </FormSection>
              </>
            )}

            {activeTab === "gameplay" && (
              <>
                <FormSection title="Ustawienia rozgrywki">
                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showLeaderboardDuringGame}
                      onChange={(event) => setShowLeaderboardDuringGame(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Pokaż leaderboard w trakcie gry (mobile)
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={showLeaderboardOnFinish}
                      onChange={(event) => setShowLeaderboardOnFinish(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Pokaż leaderboard na ekranie końcowym (mobile)
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">
                      Ukryj leaderboard X minut przed końcem czasu (0 = wyłączone)
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={hideLeaderboardMinutesBeforeEnd}
                      onChange={(event) =>
                        setHideLeaderboardMinutesBeforeEnd(Math.max(0, Math.round(Number(event.target.value) || 0)))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                    <p className="text-xs text-zinc-500">
                      Tablica wyników zniknie z ekranu gry na X minut przed końcem czasu i nie pojawi się też na ekranie końcowym.
                    </p>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={teamStationNumberingEnabled}
                      onChange={(event) => setTeamStationNumberingEnabled(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Numeracja stanowisk dla drużyn
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={timedStationPointsDecayEnabled}
                      onChange={(event) => setTimedStationPointsDecayEnabled(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Spadek punktów w grach czasowych
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={hideTaskList}
                      onChange={(event) => setHideTaskList(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Ukryj listę zadań (mobile) — pasek postępu zostaje widoczny
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={riskChatEnabled}
                      onChange={(event) => setRiskChatEnabled(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Czat w Ryzykantach
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={riskChatTeamsCanPost}
                      disabled={!riskChatEnabled}
                      onChange={(event) => setRiskChatTeamsCanPost(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Drużyny mogą pisać — odznacz, by zostawić sam kanał ogłoszeń
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={pigsEnabled}
                      onChange={(event) => setPigsEnabled(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Świnie — przeszkadzajki rzucane między drużynami
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={pigShowThrowerName}
                      disabled={!pigsEnabled}
                      onChange={(event) => setPigShowThrowerName(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Świnie — widoczna nazwa drużyny rzucającej
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">
                        Świnie co ile minut (1-20)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={pigGrantIntervalMinutes}
                        disabled={!pigsEnabled}
                        onChange={(event) => setPigGrantIntervalMinutes(Number(event.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80 disabled:opacity-55"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">
                        Czas działania świni (15-300 s)
                      </span>
                      <input
                        type="number"
                        min={15}
                        max={300}
                        value={pigEffectSeconds}
                        disabled={!pigsEnabled}
                        onChange={(event) => setPigEffectSeconds(Number(event.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80 disabled:opacity-55"
                      />
                    </label>
                  </div>
                </FormSection>

                <FormSection title="Mapa">
                  <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={hideMap}
                      onChange={(event) => setHideMap(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Ukryj mapę
                  </label>

                  {hideMap && (
                    <div className="space-y-1.5">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Grafika zamiast mapy</span>
                      {(mapImagePreviewUrl ?? mapImageUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mapImagePreviewUrl ?? mapImageUrl}
                          alt="Grafika mapy"
                          className="mb-2 h-24 w-full rounded-lg border border-zinc-700 object-cover"
                        />
                      )}
                      {usedMapImageOptions.length > 0 && (
                        <SegmentedToggle options={assetInputModeOptions} value={mapImageInputMode} onChange={setMapImageInputMode} />
                      )}
                      {mapImageInputMode === "existing" && usedMapImageOptions.length > 0 ? (
                        <UploadedAssetPicker
                          options={usedMapImageOptions}
                          selectedUrl={mapImageUrl}
                          onSelect={(url) => {
                            setMapImageUrl(url);
                            setMapImageFile(null);
                          }}
                        />
                      ) : (
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }

                            setMapImageFile(file);
                            setMapImageUrl(undefined);
                            setFormError(null);
                            event.currentTarget.value = "";
                          }}
                          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-zinc-300"
                        />
                      )}
                      <p className="text-xs text-zinc-500">
                        Jeśli nie dodasz grafiki, zostanie użyte domyślne logo SurvivorQuest.
                      </p>
                      {isUploadingMapImage && <p className="text-xs text-amber-300">Przesyłanie grafiki...</p>}
                      {(mapImageFile || mapImageUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            setMapImageFile(null);
                            setMapImageUrl(undefined);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Usuń grafikę
                        </button>
                      )}
                    </div>
                  )}
                </FormSection>
              </>
            )}

            {activeTab === "scenario" && (
              <FormSection title={isRiskQuizType ? "Treści i oferta" : "Scenariusz i oferta"}>
                {!isRiskQuizType && (
                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Scenariusz (szablon)</span>
                  <select
                    value={selectedScenarioId}
                    onChange={(event) => {
                      const nextScenarioId = event.target.value;
                      setSelectedScenarioId(nextScenarioId);
                      setScenarioStations(mapScenarioStations(nextScenarioId));
                      const nextScenario = scenarioById.get(nextScenarioId);
                      if (nextScenario) {
                        setIntroText(nextScenario.introText ?? "");
                        setGameRules(nextScenario.gameRules ?? "");
                        setTranslations({});
                      }
                    }}
                    className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${resolveFieldBorderClassName(isScenarioInvalid)}`}
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
                )}

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
                  {(offerPdfFile || offerPdfUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOfferPdfFile(null);
                        setOfferPdfUrl(undefined);
                        setOfferPdfName(undefined);
                        setOfferPdfError(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Usuń PDF
                    </button>
                  )}
                </div>

                {textEditableLanguages.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
                      <span>{getRealizationLanguageFlag(baseTextLanguage)}</span>
                      <span>Podstawowy: {realizationLanguageOptions.find((option) => option.value === baseTextLanguage)?.label}</span>
                    </span>
                    <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
                      <span>Edytowany język</span>
                      <select
                        value={textEditingLanguage}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (isRealizationLanguage(nextValue)) {
                            setTextEditingLanguage(nextValue);
                          }
                        }}
                        className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
                      >
                        {textEditableLanguages.map((language) => (
                          <option key={`text-editing-${language}`} value={language}>
                            {getRealizationLanguageFlag(language)} {realizationLanguageOptions.find((option) => option.value === language)?.label}
                            {language === baseTextLanguage ? " (podstawowy)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleAutoTranslateText()}
                      disabled={isTextAutoTranslateDisabled}
                      title={
                        isEditingBaseTextLanguage
                          ? "Wybierz inny język niż podstawowy, aby przetłumaczyć"
                          : textEditingLanguage === "other" || baseTextLanguage === "other"
                            ? "Auto-tłumaczenie jest niedostępne dla języka niestandardowego"
                            : undefined
                      }
                      className="rounded-md border border-amber-400/60 px-2.5 py-1 text-xs text-amber-200 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAutoTranslating ? "Tłumaczenie..." : "Auto-tłumacz"}
                    </button>
                  </div>
                )}
                {autoTranslateMessage && <p className="text-xs text-zinc-400">{autoTranslateMessage}</p>}

                <StyledMarkdownEditor
                  label="Tekst wstępu"
                  value={effectiveIntroText}
                  onChange={updateEffectiveIntroText}
                  placeholder={
                    isRiskQuizType
                      ? "Treść widoczna na ekranie oczekiwania — tu wpisz też zasady gry."
                      : "Treść wyświetlana po customizacji drużyny, przed startem aplikacji."
                  }
                  rows={isRiskQuizType ? 10 : 5}
                  helperText="To pole jest opcjonalne. Obsługuje podstawowe formatowanie i listy."
                />
                {/* Ryzykanci carry their whole briefing in the intro text on the
                    waiting screen, so they get no separate rules field — the mobile
                    app skips the post-start rules popup for them too (see
                    apps/mobile/src/features/onboarding/model/game-rules.ts). */}
                {!isRiskQuizType && (
                  <StyledMarkdownEditor
                    label="Zasady gry"
                    value={effectiveGameRules}
                    onChange={updateEffectiveGameRules}
                    placeholder="Wpisz zasady gry widoczne po Welcome screen."
                    rows={8}
                    helperText="To pole jest opcjonalne. Obsługuje podstawowe formatowanie i listy."
                  />
                )}
              </FormSection>
            )}

            {activeTab === "stations" && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  Dla stanowisk Na czas i Na punkty ustaw kod zaliczenia (pole przy stanowisku lub po rozwinięciu).
                </p>
                <RealizationStationsEditor
                  stations={scenarioStations}
                  onChange={setScenarioStations}
                  showValidation={submitAttempted}
                  selectedLanguages={selectedLanguages}
                  suggestedCenter={locationSuggestedCenter}
                />
                {isScenarioStationsEmpty ? (
                  <p className="mt-2 text-xs text-red-300">Dodaj co najmniej jedno stanowisko do realizacji.</p>
                ) : null}
              </div>
            )}

            {activeTab === "pointsQr" && (
              <PointsQrCodesDraftEditor drafts={pointsQrCodeDrafts} onChange={setPointsQrCodeDrafts} />
            )}

            {activeTab === "riskQuiz" && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">
                  Wybierz talię (zestaw kategorii z przypisanymi zadaniami) do tej realizacji. Talie tworzysz i
                  edytujesz w osobnej zakładce „Ryzykanci” w panelu bocznym.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Talia</span>
                  <select
                    value={selectedRiskSchemeId}
                    onChange={(event) => setSelectedRiskSchemeId(event.target.value)}
                    className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80 ${resolveFieldBorderClassName(
                      submitAttempted && isRiskQuizType && !selectedRiskSchemeId,
                    )}`}
                  >
                    <option value="">
                      {isRiskSchemesLoading ? "Ładowanie talii..." : "— wybierz talię —"}
                    </option>
                    {(riskSchemes ?? []).map((scheme) => (
                      <option key={scheme.id} value={scheme.id}>
                        {scheme.name} ({scheme.schemeCategories.length} kat.)
                      </option>
                    ))}
                  </select>
                </label>

                {isCreatingNewRiskScheme ? (
                  <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <input
                      value={newRiskSchemeName}
                      onChange={(event) => setNewRiskSchemeName(event.target.value)}
                      placeholder="Nazwa talii, np. Standardowy zestaw"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                    />
                    {createRiskSchemeError ? <p className="text-xs text-red-300">{createRiskSchemeError}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCreateRiskScheme()}
                        disabled={isCreatingRiskScheme || !newRiskSchemeName.trim()}
                        className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                      >
                        {isCreatingRiskScheme ? "Tworzenie..." : "Utwórz i wybierz"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewRiskScheme(false);
                          setNewRiskSchemeName("");
                          setCreateRiskSchemeError(null);
                        }}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewRiskScheme(true)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                  >
                    + Utwórz nową talię
                  </button>
                )}

                {!isRiskSchemesLoading && riskSchemes && riskSchemes.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Brak talii jeszcze. Utwórz pierwszą powyżej albo w zakładce „Ryzykanci” w panelu bocznym.
                  </p>
                ) : null}

                <StyledMarkdownEditor
                  label="Tekst wstępu"
                  value={introText}
                  onChange={setIntroText}
                  placeholder={RISK_QUIZ_INTRO_TEXT_PLACEHOLDER}
                  rows={5}
                  helperText="Opcjonalne. Jeśli zostawisz puste, w aplikacji mobilnej wyświetli się tekst z placeholdera."
                />
              </div>
            )}

            {activeTab === "summary" && (
              <SummaryCard title="Podsumowanie">
                <div className="space-y-1.5 text-sm text-zinc-300">
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
                  {!isRiskQuizType && (
                    <p>
                      <span className="text-zinc-500">Zasady gry:</span> {gameRules.trim() ? "Tak" : "Nie"}
                    </p>
                  )}
                  <p>
                    <span className="text-zinc-500">Leaderboard w trakcie gry:</span> {showLeaderboardDuringGame ? "Tak" : "Nie"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Leaderboard na ekranie końcowym:</span> {showLeaderboardOnFinish ? "Tak" : "Nie"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Ukryj leaderboard przed końcem:</span>{" "}
                    {hideLeaderboardMinutesBeforeEnd > 0 ? `${hideLeaderboardMinutesBeforeEnd} min` : "Wyłączone"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Numeracja stanowisk dla drużyn:</span> {teamStationNumberingEnabled ? "Tak" : "Nie"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Spadek punktów w grach czasowych:</span> {timedStationPointsDecayEnabled ? "Tak" : "Nie"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Lista zadań (mobile):</span> {hideTaskList ? "Ukryta" : "Widoczna"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Mapa:</span>{" "}
                    {hideMap ? "Ukryta (grafika statyczna)" : "Widoczna (interaktywna)"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Stanowiska w realizacji:</span> {scenarioStations.length}
                  </p>
                  <p>
                    <span className="text-zinc-500">Suma punktów:</span>{" "}
                    <span className="font-medium text-amber-300">{selectedStationsPoints}</span>
                  </p>
                  <p>
                    <span className="text-zinc-500">Suma czasu zadań:</span>{" "}
                    <span className="font-medium text-amber-300">
                      {formatStationsTotalTime(selectedStationsTimeSeconds)}
                    </span>
                  </p>
                  <p>
                    <span className="text-zinc-500">Instruktorzy:</span> {instructors.length}
                  </p>
                  <p>
                    <span className="text-zinc-500">Notatki:</span> {notes.trim() ? "Tak" : "Nie"}
                  </p>
                </div>
              </SummaryCard>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}
