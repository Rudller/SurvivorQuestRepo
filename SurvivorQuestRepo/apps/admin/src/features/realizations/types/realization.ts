export type RealizationStatus = "planned" | "in-progress" | "done";

export type Realization = {
  id: string;
  companyName: string;
  gameIds: string[];
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
};
