export type RealizationStatus = "planned" | "in-progress" | "done";

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
  scenarioId: string;
  stationIds: string[];
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
