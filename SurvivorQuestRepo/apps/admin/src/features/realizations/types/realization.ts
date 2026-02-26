import type { Station, StationType } from "@/features/games/types/station";

export type RealizationStatus = "planned" | "in-progress" | "done";

export type RealizationType =
  | "outdoor-games"
  | "hotel-games"
  | "workshops"
  | "evening-attractions"
  | "dj"
  | "recreation";

export const realizationTypeOptions: { value: RealizationType; label: string }[] = [
  { value: "outdoor-games", label: "Gry terenowe" },
  { value: "hotel-games", label: "Gry hotelowe" },
  { value: "workshops", label: "Warsztaty" },
  { value: "evening-attractions", label: "Atrakcje wieczorne" },
  { value: "dj", label: "DJ" },
  { value: "recreation", label: "Rekreacja" },
];

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
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  stationIds: string[];
  scenarioStations: Station[];
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
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
};
