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

export function isRealizationLanguage(value: unknown): value is RealizationLanguage {
  return (
    value === "polish" ||
    value === "english" ||
    value === "ukrainian" ||
    value === "russian" ||
    value === "other"
  );
}

export function getRealizationLanguageLabel(value: RealizationLanguage) {
  if (value === "polish") return "Polski";
  if (value === "english") return "Angielski";
  if (value === "ukrainian") return "Ukraiński";
  if (value === "russian") return "Rosyjski";
  return "Inne";
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
