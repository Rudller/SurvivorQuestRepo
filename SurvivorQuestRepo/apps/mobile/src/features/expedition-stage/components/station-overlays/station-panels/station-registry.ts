import type { StationPreviewText } from "../preview";
import type { StationTestType } from "../types";

/**
 * Jedno miejsce opisujące każdy z typów stanowisk.
 *
 * Do tej pory wiedza o typie była rozsypana po czterech niezależnych
 * mechanizmach: dwie mapy rendererów w station-renderers.tsx, gałęzie `if`
 * wprost w JSX-ie preview.tsx, ~25 flag boolowskich w use-station-preview-model
 * i dwie drabiny po piętnaście gałęzi na komunikaty wyniku. Nowy typ oznaczał
 * dopisanie się w każdym z nich, a pominięcie któregokolwiek nie dawało żadnego
 * sygnału.
 *
 * `Record`, nie `Partial<Record>`: brak wpisu ma być błędem kompilacji.
 * Dzisiejsze `Partial<Record<…>>` w station-renderers.tsx tego nie dawało i
 * dlatego typ bez renderera po prostu nic nie rysował.
 *
 * Czego tu NIE ma i mieć nie będzie: kontrolerów z station-controllers.ts. To
 * funkcje per akcja o różnych sygnaturach, z najlepszym pokryciem testami w
 * całym module — ujednolicenie ich sygnatur pod wspólny wpis oznaczałoby
 * przepisanie stanu przy kosmetycznym zysku.
 */

/** Klucze słownika tekstów, pod którymi siedzą zwykłe stringi (nie funkcje). */
type StationOutcomeTextKey = {
  [K in keyof StationPreviewText]: StationPreviewText[K] extends string ? K : never;
}[keyof StationPreviewText] &
  string;

export type StationDefinition = {
  /**
   * Komunikaty pokazywane w popupie wyniku. Przeniesione 1:1 z drabin
   * resolveSuccessOutcomeMessage / resolveFailureOutcomeMessage, razem z ich
   * dwiema asymetriami, które wyglądają na przeoczenia, ale są zastanym
   * zachowaniem: typy kodowe mają własny komunikat sukcesu i nie mają własnego
   * komunikatu porażki, a photo-task odwrotnie. Pilnuje tego
   * station-outcome-text.test.ts.
   */
  outcome: {
    success: StationOutcomeTextKey;
    failure: StationOutcomeTextKey;
  };
};

export const STATION_DEFINITIONS = {
  quiz: { outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "audio-quiz": { outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  time: { outcome: { success: "codeApproved", failure: "outcomeFailed" } },
  points: { outcome: { success: "codeApproved", failure: "outcomeFailed" } },
  wordle: { outcome: { success: "wordleSolvedPopup", failure: "wordleFailedPopup" } },
  hangman: { outcome: { success: "hangmanSolvedPopup", failure: "hangmanFailedPopup" } },
  mastermind: { outcome: { success: "mastermindSolvedPopup", failure: "mastermindFailedPopup" } },
  anagram: { outcome: { success: "anagramSolvedPopup", failure: "anagramFailedPopup" } },
  "caesar-cipher": { outcome: { success: "caesarSolvedPopup", failure: "caesarFailedPopup" } },
  memory: { outcome: { success: "memorySolvedPopup", failure: "memoryFailedPopup" } },
  simon: { outcome: { success: "simonSolvedPopup", failure: "simonFailedPopup" } },
  rebus: { outcome: { success: "rebusSolvedPopup", failure: "rebusFailedPopup" } },
  boggle: { outcome: { success: "boggleSolvedPopup", failure: "boggleFailedPopup" } },
  "mini-sudoku": { outcome: { success: "miniSudokuSolvedPopup", failure: "miniSudokuFailedPopup" } },
  matching: { outcome: { success: "matchingSolvedPopup", failure: "matchingFailedPopup" } },
  "strong-password": { outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "photo-task": { outcome: { success: "quizSuccessPopup", failure: "photoTaskRejectedPopup" } },
  "qr-hunt": { outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "open-quiz": { outcome: { success: "openQuizSolvedPopup", failure: "openQuizFailedPopup" } },
  "reviewed-answer": { outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "true-false": { outcome: { success: "trueFalseSolvedPopup", failure: "trueFalseFailedPopup" } },
  // fill-blank prowadzi przepływ open-quiz od początku do końca, więc raportuje
  // tym samym słownictwem. To jedyne miejsce, w którym ta równość jest teraz
  // zapisana — wcześniej wynikała z `||` powtórzonego w obu drabinach.
  "fill-blank": { outcome: { success: "openQuizSolvedPopup", failure: "openQuizFailedPopup" } },
} satisfies Record<StationTestType, StationDefinition>;

export function resolveStationDefinition(stationType: StationTestType): StationDefinition {
  return STATION_DEFINITIONS[stationType];
}
