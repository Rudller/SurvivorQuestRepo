import type { ChallengeDifficulty, ChallengeDifficultyMode, StationQuiz } from "@/features/games/types/station";
import type { RealizationLanguage } from "../types/realization";

// Common props every per-type preview body receives from MobileStationPreview.
// stationKey seeds the deterministic puzzle-content generation (puzzle-helpers.ts)
// so unsaved/new stations still get stable (if arbitrary) preview content.
export type StationPreviewProps = {
  stationKey: string;
  name: string;
  quiz?: StationQuiz;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  challengeDifficulty?: ChallengeDifficulty;
  challengeDifficultyMode?: ChallengeDifficultyMode;
  language: RealizationLanguage;
  imageUrl?: string;
};

export function toPuzzleView(props: Pick<StationPreviewProps, "stationKey" | "name" | "quiz">) {
  return {
    stationId: props.stationKey,
    name: props.name,
    quizQuestion: props.quiz?.question,
    quizAnswers: props.quiz?.answers,
    quizCorrectAnswerIndex: props.quiz?.correctAnswerIndex,
  };
}
