import type { StationPreviewText } from "../station-preview-text";
import type { StationTestType } from "../types";
import { QR_HUNT_DESCRIPTION_RESERVE, QR_HUNT_PROGRESS_DOTS_RESERVE } from "./qr-hunt-station-panel";
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
  /**
   * Wysokość ramki mediów. Brak wpisu oznacza wartość domyślną
   * (DEFAULT_STATION_MEDIA_HEIGHT) — tak jest dla typów, których ramka flexuje
   * zamiast dostawać wysokość z góry: wordle i mini-sudoku kurczą się, gdy opis
   * stanowiska potrzebuje miejsca.
   *
   * Wcześniej była to drabina kilkunastu `if` w use-station-preview-model.ts,
   * gdzie kolejność gałęzi była nośnikiem informacji: warunek kodu numerycznego
   * musiał stać przed ogólnym warunkiem typów kodowych. Tutaj ta zależność
   * mieszka wewnątrz jednego wpisu i widać ją na miejscu.
   */
  mediaHeight?: (context: StationMediaHeightContext) => number;
};

export type StationMediaHeightContext = {
  viewportHeight: number;
  /** Wysokość po odjęciu chrome karty — patrz use-station-preview-model.ts. */
  availableMediaHeight: number;
  isTablet: boolean;
  /** Stanowisko kodowe z klawiaturą numeryczną zamiast alfanumerycznej. */
  isNumericCode: boolean;
};

/** Wysokość dla typów bez własnego wpisu. */
export function resolveDefaultStationMediaHeight({
  viewportHeight,
  isTablet,
}: StationMediaHeightContext) {
  return isTablet
    ? Math.max(190, Math.round(viewportHeight * 0.33))
    : Math.max(128, Math.round(viewportHeight * 0.22));
}

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
    mediaHeight: (c) =>
      c.isNumericCode
        ? c.isTablet
          ? Math.max(104, Math.round(c.viewportHeight * 0.14))
          : Math.max(72, Math.round(c.viewportHeight * 0.1))
        : c.isTablet
          ? Math.max(128, Math.round(c.viewportHeight * 0.2))
          : Math.max(92, Math.round(c.viewportHeight * 0.14)),
  },
  points: {
    family: "code",
    outcome: { success: "codeApproved", failure: "outcomeFailed" },
    mediaHeight: (c) =>
      c.isNumericCode
        ? c.isTablet
          ? Math.max(104, Math.round(c.viewportHeight * 0.14))
          : Math.max(72, Math.round(c.viewportHeight * 0.1))
        : c.isTablet
          ? Math.max(128, Math.round(c.viewportHeight * 0.2))
          : Math.max(92, Math.round(c.viewportHeight * 0.14)),
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
    mediaHeight: (c) =>
      c.isTablet
        ? Math.max(340, Math.round(c.availableMediaHeight * 0.56))
        : Math.max(180, Math.round(c.availableMediaHeight * 0.28)),
  },
  anagram: {
    family: "quiz",
    outcome: { success: "anagramSolvedPopup", failure: "anagramFailedPopup" },
    renderInteraction: (c) => <AnagramStationPanel {...c.anagramStationPanelProps} />,
    mediaHeight: (c) =>
      c.isTablet
        ? Math.max(210, Math.round(c.availableMediaHeight * 0.34))
        : Math.max(100, Math.round(c.availableMediaHeight * 0.16)),
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
    mediaHeight: (c) =>
      // Treść polecenia i licznik par renderują się dziś nad i pod ramką —
      // zostaje sama siatka kart.
      c.isTablet
        ? Math.max(460, Math.round(c.availableMediaHeight * 0.66))
        : Math.max(150, Math.round(c.availableMediaHeight * 0.22)),
  },
  simon: {
    family: "quiz",
    outcome: { success: "simonSolvedPopup", failure: "simonFailedPopup" },
    renderMedia: (c) => (
      <View className="flex-1 px-2 py-2">
        <SimonStationPanel {...c.simonPanelProps} />
      </View>
    ),
    mediaHeight: (c) =>
      // Kropki błędów, status i rząd postępu renderują się dziś pod ramką, nie
      // w niej — zostaje sama siatka 3x3, więc potrzeba mniej wysokości.
      c.isTablet
        ? Math.max(300, Math.round(c.availableMediaHeight * 0.65))
        : Math.max(220, Math.round(c.availableMediaHeight * 0.55)),
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
    mediaHeight: (c) =>
      c.isTablet
        ? Math.max(400, Math.round(c.availableMediaHeight * 0.64))
        : Math.max(160, Math.round(c.availableMediaHeight * 0.26)),
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
    mediaHeight: (c) =>
      c.isTablet
        ? Math.max(430, Math.round(c.availableMediaHeight * 0.7))
        : Math.max(160, Math.round(c.availableMediaHeight * 0.26)),
  },
  "strong-password": {
    family: "quiz",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
    renderInteraction: (c) => <StrongPasswordStationPanel {...c.strongPasswordStationPanelProps} />,
    mediaHeight: (c) =>
      c.isTablet
        ? Math.max(280, Math.round(c.viewportHeight * 0.42))
        : Math.max(180, Math.round(c.viewportHeight * 0.28)),
  },
  "photo-task": {
    family: "photo",
    outcome: { success: "quizSuccessPopup", failure: "photoTaskRejectedPopup" },
    mediaHeight: (c) =>
      c.isTablet
        ? Math.max(128, Math.round(c.viewportHeight * 0.2))
        : Math.max(92, Math.round(c.viewportHeight * 0.14)),
  },
  "qr-hunt": {
    family: "qr",
    outcome: { success: "quizSuccessPopup", failure: "outcomeFailed" },
    mediaHeight: (c) => {
      // Budżet liczony przez jawne odjęcie rodzeństwa: rzędu kropek postępu nad
      // skanerem i opisu pod nim. Wcześniej było to płaskie 0.75 dostępnej
      // wysokości i na realnych ekranach oba te elementy się przycinały.
      const siblingReserve = c.isTablet
        ? QR_HUNT_PROGRESS_DOTS_RESERVE.tablet + QR_HUNT_DESCRIPTION_RESERVE.tablet
        : QR_HUNT_PROGRESS_DOTS_RESERVE.phone + QR_HUNT_DESCRIPTION_RESERVE.phone;
      const scannerBudget = Math.max(0, c.availableMediaHeight - siblingReserve);

      // Kafelek skanera ma być na tyle wysoki, żeby wygodnie się w niego
      // celowało — nie musi wypełnić całego pozostałego budżetu.
      return c.isTablet
        ? Math.max(220, Math.round(scannerBudget * 0.65))
        : Math.max(170, Math.round(scannerBudget * 0.65));
    },
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
