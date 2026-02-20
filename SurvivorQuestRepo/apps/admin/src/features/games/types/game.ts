export type GameType = "quiz" | "field" | "other";

export const gameTypeOptions: { value: GameType; label: string }[] = [
  { value: "quiz", label: "Quiz" },
  { value: "field", label: "Gra Terenowa" },
  { value: "other", label: "Inna" },
];

export type Game = {
  id: string;
  name: string;
  type: GameType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  createdAt: string;
  updatedAt: string;
};
