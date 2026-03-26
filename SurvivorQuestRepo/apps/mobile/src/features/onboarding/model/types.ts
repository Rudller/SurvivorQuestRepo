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

export type OnboardingRealizationSummary = {
  id: string;
  companyName: string;
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  durationMinutes: number;
  joinCode: string;
  teamCount: number;
  stationIds: string[];
  locationRequired: boolean;
  introText?: string;
  gameRules?: string;
};

export type OnboardingSession = {
  realizationId: string | null;
  realizationCode: string;
  sessionToken: string;
  apiBaseUrl: string | null;
  realization: OnboardingRealizationSummary | null;
  awaitingAdminStart?: boolean;
  showGameRulesAfterStart?: boolean;
  team: TeamCustomizationSelection;
};
