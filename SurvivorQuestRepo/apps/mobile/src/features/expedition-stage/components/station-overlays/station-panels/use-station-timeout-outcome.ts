import { useEffect, useRef } from "react";

import type { StationTestType, StationTestViewModel } from "../types";

function isQuizStationType(stationType: StationTestType) {
  return (
    stationType === "quiz" ||
    stationType === "audio-quiz" ||
    stationType === "wordle" ||
    stationType === "hangman" ||
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching" ||
    stationType === "strong-password"
  );
}

type UseStationTimeoutOutcomeArgs = {
  station: StationTestViewModel | null;
  remainingTimeSeconds: number | null;
  isSubmittingCode: boolean;
  pendingByType: {
    quiz: boolean;
    wordle: boolean;
    hangman: boolean;
    mastermind: boolean;
    anagram: boolean;
    caesar: boolean;
    memory: boolean;
    simon: boolean;
    rebus: boolean;
    boggle: boolean;
    miniSudoku: boolean;
    matching: boolean;
    strongPassword?: boolean;
  };
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onTimeExpired?: (stationId: string) => void;
  showQuizOutcomePopup: (variant: "timeout" | "failed" | "success", message: string, onDismiss?: () => void) => void;
  text: {
    timeoutWordle: string;
    timeoutHangman: string;
    timeoutMastermind: string;
    timeoutAnagram: string;
    timeoutCaesar: string;
    timeoutMemory: string;
    timeoutSimon: string;
    timeoutRebus: string;
    timeoutBoggle: string;
    timeoutMiniSudoku: string;
    timeoutMatching: string;
    timeoutQuiz: string;
    timeoutCodeTask: string;
  };
};

function resolveQuizTimeoutMessage(stationType: StationTestType, text: UseStationTimeoutOutcomeArgs["text"]) {
  if (stationType === "wordle") {
    return text.timeoutWordle;
  }
  if (stationType === "hangman") {
    return text.timeoutHangman;
  }
  if (stationType === "mastermind") {
    return text.timeoutMastermind;
  }
  if (stationType === "anagram") {
    return text.timeoutAnagram;
  }
  if (stationType === "caesar-cipher") {
    return text.timeoutCaesar;
  }
  if (stationType === "memory") {
    return text.timeoutMemory;
  }
  if (stationType === "simon") {
    return text.timeoutSimon;
  }
  if (stationType === "rebus") {
    return text.timeoutRebus;
  }
  if (stationType === "boggle") {
    return text.timeoutBoggle;
  }
  if (stationType === "mini-sudoku") {
    return text.timeoutMiniSudoku;
  }
  if (stationType === "matching") {
    return text.timeoutMatching;
  }
  return text.timeoutQuiz;
}

export function useStationTimeoutOutcome({
  station,
  remainingTimeSeconds,
  isSubmittingCode,
  pendingByType,
  onQuizFailed,
  onTimeExpired,
  showQuizOutcomePopup,
  text,
}: UseStationTimeoutOutcomeArgs) {
  const timeoutPopupShownRef = useRef(false);

  useEffect(() => {
    timeoutPopupShownRef.current = false;
  }, [station?.stationId, station?.startedAt, station?.status, station?.stationType]);

  useEffect(() => {
    if (!station || !isQuizStationType(station.stationType)) {
      return;
    }

    if (
      !station.startedAt ||
      station.timeLimitSeconds <= 0 ||
      station.status === "done" ||
      station.status === "failed"
    ) {
      return;
    }

    if (remainingTimeSeconds === null || remainingTimeSeconds > 0) {
      return;
    }

    const isQuizAnswerPending =
      (station.stationType === "quiz" || station.stationType === "audio-quiz") &&
      pendingByType.quiz;
    const isWordlePending = station.stationType === "wordle" && pendingByType.wordle;
    const isHangmanPending = station.stationType === "hangman" && pendingByType.hangman;
    const isMastermindPending = station.stationType === "mastermind" && pendingByType.mastermind;
    const isAnagramPending = station.stationType === "anagram" && pendingByType.anagram;
    const isCaesarPending = station.stationType === "caesar-cipher" && pendingByType.caesar;
    const isMemoryPending = station.stationType === "memory" && pendingByType.memory;
    const isSimonPending = station.stationType === "simon" && pendingByType.simon;
    const isRebusPending = station.stationType === "rebus" && pendingByType.rebus;
    const isBogglePending = station.stationType === "boggle" && pendingByType.boggle;
    const isMiniSudokuPending = station.stationType === "mini-sudoku" && pendingByType.miniSudoku;
    const isMatchingPending = station.stationType === "matching" && pendingByType.matching;
    const isStrongPasswordPending = station.stationType === "strong-password" && pendingByType.strongPassword;
    if (
      isQuizAnswerPending ||
      isWordlePending ||
      isHangmanPending ||
      isMastermindPending ||
      isAnagramPending ||
      isCaesarPending ||
      isMemoryPending ||
      isSimonPending ||
      isRebusPending ||
      isBogglePending ||
      isMiniSudokuPending ||
      isMatchingPending ||
      isStrongPasswordPending ||
      timeoutPopupShownRef.current
    ) {
      return;
    }

    timeoutPopupShownRef.current = true;
    onQuizFailed?.(station.stationId, "time_limit_expired");
    showQuizOutcomePopup("timeout", resolveQuizTimeoutMessage(station.stationType, text));
  }, [onQuizFailed, pendingByType, remainingTimeSeconds, showQuizOutcomePopup, station, text]);

  useEffect(() => {
    if (!station || isQuizStationType(station.stationType)) {
      return;
    }

    if (
      !station.startedAt ||
      station.timeLimitSeconds <= 0 ||
      station.status === "done" ||
      station.status === "failed"
    ) {
      return;
    }

    if (remainingTimeSeconds === null || remainingTimeSeconds > 0) {
      return;
    }

    if (isSubmittingCode || timeoutPopupShownRef.current) {
      return;
    }

    timeoutPopupShownRef.current = true;
    onTimeExpired?.(station.stationId);
    showQuizOutcomePopup("timeout", text.timeoutCodeTask);
  }, [isSubmittingCode, onTimeExpired, remainingTimeSeconds, showQuizOutcomePopup, station, text.timeoutCodeTask]);
}
