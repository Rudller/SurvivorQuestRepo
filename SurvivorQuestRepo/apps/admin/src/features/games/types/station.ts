export type StationType = "quiz" | "time" | "points";

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
  createdAt: string;
  updatedAt: string;
};
