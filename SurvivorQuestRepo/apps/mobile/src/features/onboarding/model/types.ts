export type Screen = "api" | "code" | "team";

export type TeamColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "rose"
  | "pink"
  | "slate";

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
};

export type OnboardingSession = {
  realizationId: string | null;
  realizationCode: string;
  sessionToken: string;
  apiBaseUrl: string | null;
  realization: OnboardingRealizationSummary | null;
  team: TeamCustomizationSelection;
};
