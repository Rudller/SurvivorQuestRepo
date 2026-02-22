export type Screen = "code" | "team" | "customize";

export type TeamColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "emerald"
  | "cyan"
  | "blue"
  | "violet"
  | "rose";

export type TeamColorOption = {
  key: TeamColor;
  label: string;
  hex: string;
};
