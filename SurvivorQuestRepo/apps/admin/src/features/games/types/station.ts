export type StationType = "quiz" | "time" | "points";
export type StationKind = "template" | "scenario-instance" | "realization-instance";

export const stationTypeOptions: { value: StationType; label: string }[] = [
  { value: "time", label: "Na czas" },
  { value: "points", label: "Na punkty" },
  { value: "quiz", label: "Quiz" },
];

export type Station = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  kind: StationKind;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
};
