import type { StationPreviewText } from "../preview";
import type { StationTestType } from "../types";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";

import { AnagramStationPanel } from "./anagram-station-panel";
import { BoggleMediaSection } from "./boggle-station-panel";
import { CaesarStationPanel } from "./caesar-station-panel";
import { HangmanStationPanel } from "./hangman-station-panel";
import { MatchingMediaSection } from "./matching-station-panel";
import { MastermindMediaSection, MastermindStationPanel } from "./mastermind-station-panel";
import { MemoryMediaSection } from "./memory-station-panel";
import { MiniSudokuMediaSection } from "./mini-sudoku-station-panel";
import { OpenQuizStationPanel } from "./open-quiz-station-panel";
import { QuizAudioPanel } from "./quiz-audio-station-panel";
import { RebusStationPanel } from "./rebus-station-panel";
import { ReviewedAnswerStationPanel } from "./reviewed-answer-station-panel";
import { SimonStationPanel } from "./simon-station-panel";
import { TrueFalseStationPanel } from "./true-false-station-panel";
import { StrongPasswordStationPanel } from "./strong-password-station-panel";
import { WordleInteractionPanel, WordleMediaBoard } from "./wordle-station-panel";


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

export type StationMediaContext = {
  wordleMediaBoardProps: ComponentProps<typeof WordleMediaBoard>;
  simonPanelProps: ComponentProps<typeof SimonStationPanel>;
  mastermindMediaSectionProps: ComponentProps<typeof MastermindMediaSection>;
  memoryMediaSectionProps: ComponentProps<typeof MemoryMediaSection>;
  miniSudokuMediaSectionProps: ComponentProps<typeof MiniSudokuMediaSection>;
  matchingMediaSectionProps: ComponentProps<typeof MatchingMediaSection>;
  boggleMediaSectionProps: ComponentProps<typeof BoggleMediaSection>;
};


export type StationInteractionContext = {
  quizAudioPanelSharedProps: Omit<ComponentProps<typeof QuizAudioPanel>, "isAudioQuizStation">;
  wordleInteractionPanelProps: ComponentProps<typeof WordleInteractionPanel>;
  hangmanStationPanelProps: ComponentProps<typeof HangmanStationPanel>;
  mastermindStationPanelProps: ComponentProps<typeof MastermindStationPanel>;
  anagramStationPanelProps: ComponentProps<typeof AnagramStationPanel>;
  caesarStationPanelProps: ComponentProps<typeof CaesarStationPanel>;
  rebusStationPanelProps: ComponentProps<typeof RebusStationPanel>;
  strongPasswordStationPanelProps: ComponentProps<typeof StrongPasswordStationPanel>;
  openQuizStationPanelProps: ComponentProps<typeof OpenQuizStationPanel>;
  reviewedAnswerStationPanelProps: ComponentProps<typeof ReviewedAnswerStationPanel>;
  trueFalseStationPanelProps: ComponentProps<typeof TrueFalseStationPanel>;
};


/**
 * Renderery mają osobne konteksty zamiast jednego wspólnego, bo ich zestawy
 * propsów powstają w preview.tsx w różnych momentach — media są konsumowane,
 * zanim istnieją jeszcze propsy paneli interakcji. Scalenie w jeden kontekst
 * wymagałoby przestawienia kolejności w tym pliku, co należy do rozbicia
 * preview.tsx, a nie do tego kroku.
 */
export function buildStationMediaContext(context: StationMediaContext) {
  return context;
}

export function buildStationInteractionContext(context: StationInteractionContext) {
  return context;
}

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
  /** Plansza/obraz w górnej części karty. Nie każdy typ coś tu rysuje. */
  renderMedia?: (context: StationMediaContext) => ReactNode;
  /** Część interaktywna pod mediami. Typy kodowe i QR mają własne ścieżki. */
  renderInteraction?: (context: StationInteractionContext) => ReactNode;
};

export const STATION_DEFINITIONS: Record<StationTestType, StationDefinition> = {
  quiz: {
    family: "quiz",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
    renderInteraction: (c) => <QuizAudioPanel {...c.quizAudioPanelSharedProps} isAudioQuizStation={false} />,
  },
  "audio-quiz": {
    family: "quiz",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
    renderInteraction: (c) => <QuizAudioPanel {...c.quizAudioPanelSharedProps} isAudioQuizStation />,
  },
  time: {
    family: "code",
    outcome: { success: "codeApproved", failure: "outcomeFailed" },
  },
  points: {
    family: "code",
    outcome: { success: "codeApproved", failure: "outcomeFailed" },
  },
  wordle: {
    family: "quiz",
    outcome: { success: "wordleSolvedPopup", failure: "wordleFailedPopup" },
    renderMedia: (c) => <WordleMediaBoard {...c.wordleMediaBoardProps} />,
    renderInteraction: (c) => <WordleInteractionPanel {...c.wordleInteractionPanelProps} />,
  },
  hangman: {
    family: "quiz",
    outcome: { success: "hangmanSolvedPopup", failure: "hangmanFailedPopup" },
    renderInteraction: (c) => <HangmanStationPanel {...c.hangmanStationPanelProps} />,
  },
  mastermind: {
    family: "quiz",
    outcome: { success: "mastermindSolvedPopup", failure: "mastermindFailedPopup" },
    renderMedia: (c) => <MastermindMediaSection {...c.mastermindMediaSectionProps} />,
    renderInteraction: (c) => <MastermindStationPanel {...c.mastermindStationPanelProps} />,
  },
  anagram: {
    family: "quiz",
    outcome: { success: "anagramSolvedPopup", failure: "anagramFailedPopup" },
    renderInteraction: (c) => <AnagramStationPanel {...c.anagramStationPanelProps} />,
  },
  "caesar-cipher": {
    family: "quiz",
    outcome: { success: "caesarSolvedPopup", failure: "caesarFailedPopup" },
    renderInteraction: (c) => <CaesarStationPanel {...c.caesarStationPanelProps} />,
  },
  memory: {
    family: "quiz",
    outcome: { success: "memorySolvedPopup", failure: "memoryFailedPopup" },
    renderMedia: (c) => <MemoryMediaSection {...c.memoryMediaSectionProps} />,
  },
  simon: {
    family: "quiz",
    outcome: { success: "simonSolvedPopup", failure: "simonFailedPopup" },
    renderMedia: (c) => (
      <View className="flex-1 px-2 py-2">
        <SimonStationPanel {...c.simonPanelProps} />
      </View>
    ),
  },
  rebus: {
    family: "quiz",
    outcome: { success: "rebusSolvedPopup", failure: "rebusFailedPopup" },
    renderInteraction: (c) => <RebusStationPanel {...c.rebusStationPanelProps} />,
  },
  boggle: {
    family: "quiz",
    outcome: { success: "boggleSolvedPopup", failure: "boggleFailedPopup" },
    renderMedia: (c) => <BoggleMediaSection {...c.boggleMediaSectionProps} />,
  },
  "mini-sudoku": {
    family: "quiz",
    outcome: { success: "miniSudokuSolvedPopup", failure: "miniSudokuFailedPopup" },
    renderMedia: (c) => <MiniSudokuMediaSection {...c.miniSudokuMediaSectionProps} />,
  },
  matching: {
    family: "quiz",
    outcome: { success: "matchingSolvedPopup", failure: "matchingFailedPopup" },
    renderMedia: (c) => <MatchingMediaSection {...c.matchingMediaSectionProps} />,
  },
  "strong-password": {
    family: "quiz",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
    renderInteraction: (c) => <StrongPasswordStationPanel {...c.strongPasswordStationPanelProps} />,
  },
  "photo-task": {
    family: "photo",
    outcome: { success: "quizSuccessPopup", failure: "photoTaskRejectedPopup" },
  },
  "qr-hunt": {
    family: "qr",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
  },
  "open-quiz": {
    family: "quiz",
    outcome: { success: "openQuizSolvedPopup", failure: "openQuizFailedPopup" },
    renderInteraction: (c) => <OpenQuizStationPanel {...c.openQuizStationPanelProps} />,
  },
  "reviewed-answer": {
    family: "quiz",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
    renderInteraction: (c) => <ReviewedAnswerStationPanel {...c.reviewedAnswerStationPanelProps} />,
  },
  "true-false": {
    family: "quiz",
    outcome: { success: "trueFalseSolvedPopup", failure: "trueFalseFailedPopup" },
    renderInteraction: (c) => <TrueFalseStationPanel {...c.trueFalseStationPanelProps} />,
  },
  "fill-blank": {
    family: "quiz",
    // Pytanie otwarte z luką narysowaną w treści: ten sam zapis, to samo
    // sprawdzanie, to samo słownictwo komunikatów.
    behavesAs: "open-quiz",
    outcome: { success: "openQuizSolvedPopup", failure: "openQuizFailedPopup" },
    renderInteraction: (c) => <OpenQuizStationPanel {...c.openQuizStationPanelProps} />,
  },
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
