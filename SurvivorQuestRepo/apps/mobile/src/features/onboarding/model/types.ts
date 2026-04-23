export type Screen = "api" | "code" | "team" | "customization";

export type TeamColor =
  | "red"
  | "rose"
  | "pink"
  | "magenta"
  | "violet"
  | "purple"
  | "indigo"
  | "navy"
  | "blue"
  | "sky"
  | "cyan"
  | "turquoise"
  | "teal"
  | "mint"
  | "aquamarine"
  | "emerald"
  | "green"
  | "lime"
  | "orange"
  | "amber"
  | "gold"
  | "yellow"
  | "brown"
  | "gray"
  | "slate"
  | "black"
  | "white";

export type TeamColorOption = {
  key: TeamColor;
  label: string;
  hex: string;
};

export type TeamCustomizationSelection = {
  slotNumber: number | null;
  name: string;
  colorKey: TeamColor;
  colorLabel: string;
  colorHex: string;
  icon: string;
};

export type RealizationLanguage =
  | "polish"
  | "english"
  | "ukrainian"
  | "russian"
  | "other";

export type RealizationLanguageOption = {
  value: RealizationLanguage;
  label: string;
};

type ResolvedLanguageLabelLocale = "polish" | "english" | "ukrainian" | "russian";
type LanguageLabelLocale = RealizationLanguage;

export function isRealizationLanguage(value: unknown): value is RealizationLanguage {
  return (
    value === "polish" ||
    value === "english" ||
    value === "ukrainian" ||
    value === "russian" ||
    value === "other"
  );
}

export function getRealizationLanguageLabel(value: RealizationLanguage, locale: LanguageLabelLocale = "polish") {
  const labels: Record<RealizationLanguage, Record<ResolvedLanguageLabelLocale, string>> = {
    polish: {
      polish: "Polski",
      english: "Polish",
      ukrainian: "Польська",
      russian: "Польский",
    },
    english: {
      polish: "Angielski",
      english: "English",
      ukrainian: "Англійська",
      russian: "Английский",
    },
    ukrainian: {
      polish: "Ukraiński",
      english: "Ukrainian",
      ukrainian: "Українська",
      russian: "Украинский",
    },
    russian: {
      polish: "Rosyjski",
      english: "Russian",
      ukrainian: "Російська",
      russian: "Русский",
    },
    other: {
      polish: "English",
      english: "English",
      ukrainian: "English",
      russian: "English",
    },
  };

  if (value === "other") {
    return labels.other.english;
  }

  const resolvedLocale: ResolvedLanguageLabelLocale =
    locale === "english" || locale === "ukrainian" || locale === "russian"
      ? locale
      : locale === "other"
        ? "english"
        : "polish";

  return labels[value][resolvedLocale];
}

export function getRealizationLanguageFlag(value: RealizationLanguage) {
  if (value === "polish") return "🇵🇱";
  if (value === "english") return "🇬🇧";
  if (value === "ukrainian") return "🇺🇦";
  if (value === "russian") return "🇷🇺";
  return "🌐";
}

export type OnboardingRealizationSummary = {
  id: string;
  companyName: string;
  language?: RealizationLanguage;
  customLanguage?: string;
  selectedLanguage?: RealizationLanguage;
  availableLanguages?: RealizationLanguageOption[];
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  durationMinutes: number;
  joinCode: string;
  teamCount: number;
  stationIds: string[];
  locationRequired: boolean;
  showLeaderboard: boolean;
  introText?: string;
  gameRules?: string;
};

export type OnboardingSession = {
  realizationId: string | null;
  realizationCode: string;
  sessionToken: string;
  apiBaseUrl: string | null;
  selectedLanguage?: RealizationLanguage;
  realization: OnboardingRealizationSummary | null;
  awaitingAdminStart?: boolean;
  showGameRulesAfterStart?: boolean;
  team: TeamCustomizationSelection;
};
