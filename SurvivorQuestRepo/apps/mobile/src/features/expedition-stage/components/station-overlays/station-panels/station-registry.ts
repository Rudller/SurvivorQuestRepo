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
 * Jawna adnotacja `Record<StationTestType, StationDefinition>`, nie
 * `Partial<Record<…>>`: brak wpisu ma być błędem kompilacji.
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

/**
 * Rodzina stanowiska — po czym poznaje się, jak wygląda i czego wymaga
 * ukończenie. Zastępuje isQuizStationType (osiemnastoczłonowa alternatywa),
 * requiresCode, requiresPhotoUpload i requiresQrScan.
 */
export type StationFamily = "quiz" | "code" | "photo" | "qr";

export type StationDefinition = {
  family: StationFamily;
  /**
   * Typ, którego przepływ stanowisko prowadzi w całości. Ustawiony tylko tam,
   * gdzie to naprawdę ten sam przepływ, a nie podobny — dziś wyłącznie
   * fill-blank, czyli pytanie otwarte z luką narysowaną w treści: identyczny
   * zapis, identyczne sprawdzanie.
   *
   * Wcześniej ta równość żyła jako `stationType === "open-quiz" ||
   * stationType === "fill-blank"` powtórzone w kilku miejscach, więc dołożenie
   * kolejnego wariantu wymagało znalezienia ich wszystkich.
   */
  behavesAs?: StationTestType;
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

export const STATION_DEFINITIONS: Record<StationTestType, StationDefinition> = {
  quiz: { family: "quiz", outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "audio-quiz": { family: "quiz", outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  time: { family: "code", outcome: { success: "codeApproved", failure: "outcomeFailed" } },
  points: { family: "code", outcome: { success: "codeApproved", failure: "outcomeFailed" } },
  wordle: { family: "quiz", outcome: { success: "wordleSolvedPopup", failure: "wordleFailedPopup" } },
  hangman: { family: "quiz", outcome: { success: "hangmanSolvedPopup", failure: "hangmanFailedPopup" } },
  mastermind: { family: "quiz", outcome: { success: "mastermindSolvedPopup", failure: "mastermindFailedPopup" } },
  anagram: { family: "quiz", outcome: { success: "anagramSolvedPopup", failure: "anagramFailedPopup" } },
  "caesar-cipher": { family: "quiz", outcome: { success: "caesarSolvedPopup", failure: "caesarFailedPopup" } },
  memory: { family: "quiz", outcome: { success: "memorySolvedPopup", failure: "memoryFailedPopup" } },
  simon: { family: "quiz", outcome: { success: "simonSolvedPopup", failure: "simonFailedPopup" } },
  rebus: { family: "quiz", outcome: { success: "rebusSolvedPopup", failure: "rebusFailedPopup" } },
  boggle: { family: "quiz", outcome: { success: "boggleSolvedPopup", failure: "boggleFailedPopup" } },
  "mini-sudoku": { family: "quiz", outcome: { success: "miniSudokuSolvedPopup", failure: "miniSudokuFailedPopup" } },
  matching: { family: "quiz", outcome: { success: "matchingSolvedPopup", failure: "matchingFailedPopup" } },
  "strong-password": { family: "quiz", outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "photo-task": { family: "photo", outcome: { success: "quizSuccessPopup", failure: "photoTaskRejectedPopup" } },
  "qr-hunt": { family: "qr", outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "open-quiz": { family: "quiz", outcome: { success: "openQuizSolvedPopup", failure: "openQuizFailedPopup" } },
  "reviewed-answer": { family: "quiz", outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" } },
  "true-false": { family: "quiz", outcome: { success: "trueFalseSolvedPopup", failure: "trueFalseFailedPopup" } },
  // fill-blank prowadzi przepływ open-quiz od początku do końca, więc raportuje
  // tym samym słownictwem. To jedyne miejsce, w którym ta równość jest teraz
  // zapisana — wcześniej wynikała z `||` powtórzonego w obu drabinach.
  "fill-blank": { family: "quiz", behavesAs: "open-quiz", outcome: { success: "openQuizSolvedPopup", failure: "openQuizFailedPopup" } },
};

export function resolveStationDefinition(stationType: StationTestType): StationDefinition {
  return STATION_DEFINITIONS[stationType];
}

/**
 * Typ, którego przepływem stanowisko faktycznie jedzie. Dla wszystkiego poza
 * fill-blank to ten sam typ, którym jest.
 */
export function resolveEffectiveStationType(stationType: StationTestType): StationTestType {
  return STATION_DEFINITIONS[stationType].behavesAs ?? stationType;
}

export function resolveStationFamily(stationType: StationTestType): StationFamily {
  return STATION_DEFINITIONS[stationType].family;
}
