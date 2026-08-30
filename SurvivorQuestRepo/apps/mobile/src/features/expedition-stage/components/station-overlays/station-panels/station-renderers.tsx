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
import type { StationTestType } from "../types";

export type StationRendererByType = Partial<Record<StationTestType, () => ReactNode>>;

type BuildStationMediaRendererByTypeArgs = {
  wordleMediaBoardProps: ComponentProps<typeof WordleMediaBoard>;
  simonPanelProps: ComponentProps<typeof SimonStationPanel>;
  mastermindMediaSectionProps: ComponentProps<typeof MastermindMediaSection>;
  memoryMediaSectionProps: ComponentProps<typeof MemoryMediaSection>;
  miniSudokuMediaSectionProps: ComponentProps<typeof MiniSudokuMediaSection>;
  matchingMediaSectionProps: ComponentProps<typeof MatchingMediaSection>;
  boggleMediaSectionProps: ComponentProps<typeof BoggleMediaSection>;
};

export function buildStationMediaRendererByType({
  wordleMediaBoardProps,
  simonPanelProps,
  mastermindMediaSectionProps,
  memoryMediaSectionProps,
  miniSudokuMediaSectionProps,
  matchingMediaSectionProps,
  boggleMediaSectionProps,
}: BuildStationMediaRendererByTypeArgs): StationRendererByType {
  return {
    wordle: () => <WordleMediaBoard {...wordleMediaBoardProps} />,
    simon: () => (
      <View className="flex-1 px-2 py-2">
        <SimonStationPanel {...simonPanelProps} />
      </View>
    ),
    mastermind: () => <MastermindMediaSection {...mastermindMediaSectionProps} />,
    memory: () => <MemoryMediaSection {...memoryMediaSectionProps} />,
    "mini-sudoku": () => <MiniSudokuMediaSection {...miniSudokuMediaSectionProps} />,
    matching: () => <MatchingMediaSection {...matchingMediaSectionProps} />,
    boggle: () => <BoggleMediaSection {...boggleMediaSectionProps} />,
  };
}

type BuildQuizStationRendererByTypeArgs = {
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

export function buildQuizStationRendererByType({
  quizAudioPanelSharedProps,
  wordleInteractionPanelProps,
  hangmanStationPanelProps,
  mastermindStationPanelProps,
  anagramStationPanelProps,
  caesarStationPanelProps,
  rebusStationPanelProps,
  strongPasswordStationPanelProps,
  openQuizStationPanelProps,
  reviewedAnswerStationPanelProps,
  trueFalseStationPanelProps,
}: BuildQuizStationRendererByTypeArgs): StationRendererByType {
  return {
    quiz: () => <QuizAudioPanel {...quizAudioPanelSharedProps} isAudioQuizStation={false} />,
    "audio-quiz": () => <QuizAudioPanel {...quizAudioPanelSharedProps} isAudioQuizStation />,
    wordle: () => <WordleInteractionPanel {...wordleInteractionPanelProps} />,
    hangman: () => <HangmanStationPanel {...hangmanStationPanelProps} />,
    mastermind: () => <MastermindStationPanel {...mastermindStationPanelProps} />,
    anagram: () => <AnagramStationPanel {...anagramStationPanelProps} />,
    "caesar-cipher": () => <CaesarStationPanel {...caesarStationPanelProps} />,
    rebus: () => <RebusStationPanel {...rebusStationPanelProps} />,
    "strong-password": () => <StrongPasswordStationPanel {...strongPasswordStationPanelProps} />,
    "open-quiz": () => <OpenQuizStationPanel {...openQuizStationPanelProps} />,
    "reviewed-answer": () => <ReviewedAnswerStationPanel {...reviewedAnswerStationPanelProps} />,
    // fill-blank is an open question whose prompt happens to contain a gap.
    "fill-blank": () => <OpenQuizStationPanel {...openQuizStationPanelProps} />,
    "true-false": () => <TrueFalseStationPanel {...trueFalseStationPanelProps} />,
  };
}
