import {
  normalizePuzzleText,
  resolveCorrectAnswerText,
  resolvePuzzleSecret,
} from "../../expedition-stage/components/station-overlays/puzzle-helpers";
import type { StationTestViewModel } from "../../expedition-stage/components/station-overlays/types";

export type RiskCorrectAnswer = {
  // "answer" -> "Poprawna odpowiedź", "secret" -> "Hasło".
  kind: "answer" | "secret";
  text: string;
};

/**
 * Co pokazać drużynie po błędnej odpowiedzi albo po końcu czasu.
 *
 * Idzie tymi samymi helperami co panele stacji, więc pokazany tekst to dokładnie
 * to, z czym panel porównywał wpisaną odpowiedź. `null` dla typów, w których nie
 * ma czego zdradzić: kod od organizatora (na czas/na punkty), zdjęcie i
 * odpowiedź opisowa (ocenia Game Master, klucz nie trafia na tablet), łączenie
 * par i prawda/fałsz.
 */
export function resolveRiskCorrectAnswer(
  station: StationTestViewModel,
  correctIndex?: number,
): RiskCorrectAnswer | null {
  const text = resolveText(station, correctIndex).trim();
  if (!text) {
    return null;
  }
  const kind = station.stationType === "wordle" || station.stationType === "hangman" || station.stationType === "anagram"
    ? "secret"
    : "answer";
  return { kind, text };
}

function resolveText(station: StationTestViewModel, correctIndex?: number): string {
  switch (station.stationType) {
    case "quiz":
    case "audio-quiz": {
      // Indeks z serwera ma pierwszeństwo — to on ocenił odpowiedź.
      const answers = station.quizAnswers ?? [];
      if (typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < answers.length) {
        return answers[correctIndex] ?? "";
      }
      return resolveCorrectAnswerText(station);
    }
    case "open-quiz":
      return resolveCorrectAnswerText(station);
    case "wordle":
    case "hangman":
      return resolvePuzzleSecret(station, station.stationType);
    case "anagram":
      return normalizePuzzleText(resolveCorrectAnswerText(station) || station.name);
    default:
      return "";
  }
}
