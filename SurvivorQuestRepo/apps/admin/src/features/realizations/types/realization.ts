import type { Station, StationType } from "@/features/games/types/station";

export type RealizationStatus = "planned" | "in-progress" | "done";

export type RealizationType =
  | "outdoor-games"
  | "hotel-games"
  | "workshops"
  | "evening-attractions"
  | "dj"
  | "recreation";

export type RealizationLanguage =
  | "polish"
  | "english"
  | "ukrainian"
  | "russian"
  | "other";

export const realizationTypeOptions: { value: RealizationType; label: string }[] = [
  { value: "outdoor-games", label: "Gry terenowe" },
  { value: "hotel-games", label: "Gry hotelowe" },
  { value: "workshops", label: "Warsztaty" },
  { value: "evening-attractions", label: "Atrakcje wieczorne" },
  { value: "dj", label: "DJ" },
  { value: "recreation", label: "Rekreacja" },
];

export const realizationLanguageOptions: { value: RealizationLanguage; label: string }[] = [
  { value: "polish", label: "Polski" },
  { value: "english", label: "Angielski" },
  { value: "ukrainian", label: "Ukraiński" },
  { value: "russian", label: "Rosyjski" },
  { value: "other", label: "Inne" },
];

export const realizationLanguageFlagByValue: Record<RealizationLanguage, string> = {
  polish: "🇵🇱",
  english: "🇬🇧",
  ukrainian: "🇺🇦",
  russian: "🇷🇺",
  other: "🌐",
};

export function getRealizationLanguageLabel(language: RealizationLanguage) {
  return (
    realizationLanguageOptions.find((option) => option.value === language)?.label ??
    realizationLanguageOptions[0].label
  );
}

export function getRealizationLanguageFlag(language: RealizationLanguage) {
  return realizationLanguageFlagByValue[language] ?? realizationLanguageFlagByValue.polish;
}

export type RealizationLanguageSelection = {
  selectedLanguages: RealizationLanguage[];
  customLanguage: string;
};

const REALIZATION_LANGUAGE_ORDER = realizationLanguageOptions.map((option) => option.value);

const LANGUAGE_TOKEN_TO_VALUE = new Map<string, RealizationLanguage>(
  realizationLanguageOptions.flatMap((option) => [
    [option.value.toLowerCase(), option.value],
    [option.label.toLowerCase(), option.value],
  ]),
);

function splitLanguageTokens(value: string) {
  return value
    .split(/\s*(?:\+|,|;|\n)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLanguageSelection(languages: RealizationLanguage[]) {
  const selected = new Set(languages);
  return REALIZATION_LANGUAGE_ORDER.filter((value) => selected.has(value));
}

function normalizeCustomLanguage(value: string) {
  return splitLanguageTokens(value).join(", ");
}

export function parseRealizationLanguageSelection(
  language: RealizationLanguage,
  customLanguage?: string,
): RealizationLanguageSelection {
  if (language !== "other") {
    return {
      selectedLanguages: [language],
      customLanguage: "",
    };
  }

  const tokens = splitLanguageTokens(customLanguage ?? "");
  const selectedKnown = new Set<RealizationLanguage>();
  const customParts: string[] = [];

  for (const token of tokens) {
    const mappedValue = LANGUAGE_TOKEN_TO_VALUE.get(token.toLowerCase());
    if (mappedValue && mappedValue !== "other") {
      selectedKnown.add(mappedValue);
      continue;
    }

    if (mappedValue === "other") {
      continue;
    }

    customParts.push(token);
  }

  const selectedCandidates: RealizationLanguage[] = [...selectedKnown];
  if (customParts.length > 0 || selectedKnown.size === 0) {
    selectedCandidates.push("other");
  }

  const selectedLanguages = normalizeLanguageSelection(selectedCandidates);

  return {
    selectedLanguages,
    customLanguage: customParts.join(", "),
  };
}

export function isRealizationLanguageSelectionInvalid(selection: RealizationLanguageSelection) {
  const selectedSet = new Set(selection.selectedLanguages);
  const hasKnownLanguage = selection.selectedLanguages.some((value) => value !== "other");
  const hasOtherLanguage = selectedSet.has("other");
  const normalizedCustomLanguage = normalizeCustomLanguage(selection.customLanguage);

  if (!hasKnownLanguage && !hasOtherLanguage) {
    return true;
  }

  if (hasOtherLanguage && !normalizedCustomLanguage) {
    return true;
  }

  return false;
}

export function toRealizationLanguagePayload(selection: RealizationLanguageSelection): {
  language: RealizationLanguage;
  customLanguage?: string;
} {
  const selectedLanguages = normalizeLanguageSelection(selection.selectedLanguages);
  const selectedSet = new Set(selectedLanguages);
  const knownLanguages = selectedLanguages.filter((value) => value !== "other");
  const customParts = splitLanguageTokens(selection.customLanguage);

  if (knownLanguages.length === 1 && !selectedSet.has("other") && customParts.length === 0) {
    return {
      language: knownLanguages[0],
    };
  }

  const displayParts = [
    ...knownLanguages.map((value) => getRealizationLanguageLabel(value)),
    ...customParts,
  ];

  return {
    language: "other",
    customLanguage: displayParts.length > 0 ? displayParts.join(" + ") : "Inne",
  };
}

export function formatRealizationLanguageSummary(language: RealizationLanguage, customLanguage?: string) {
  return language === "other"
    ? customLanguage?.trim() || "Inne"
    : getRealizationLanguageLabel(language);
}

export type RealizationLog = {
  id: string;
  changedBy: string;
  changedAt: string;
  action: "created" | "updated";
  description: string;
};

export type Realization = {
  id: string;
  companyName: string;
  location?: string;
  language: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  scenarioTemplateId?: string;
  scenarioTemplateName?: string;
  stationIds: string[];
  scenarioStations: Station[];
  joinCode: string;
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
  durationMinutes: number;
  locationRequired: boolean;
  showLeaderboard: boolean;
  teamStationNumberingEnabled: boolean;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: RealizationLog[];
};

export type RealizationStationDraft = {
  id?: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  quiz?: Station["quiz"];
  translations?: Station["translations"];
  latitude?: number;
  longitude?: number;
  pendingAudioFile?: File | null;
  pendingAudioLanguage?: RealizationLanguage;
};
