import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { StationTestViewModel } from "../types";
import { resolveMemoryDeck, resolveMiniSudokuPuzzle, type MemoryCard } from "../puzzle-helpers";
import type { MastermindAttempt } from "./mastermind-station-panel";
import type { WordleAttempt } from "./wordle-station-panel";

type UseStationOverlayResetArgs = {
  displayedStation: StationTestViewModel | null;
  stationResetKey: string | null;
  clearTimeoutPopupCountdown: () => void;
  clearWordleRevealTimeouts: () => void;
  resetAudioPlaybackState: () => void;
  stopSimonPlayback: () => void;
  quizFeedbackAnimation: Animated.Value;
  timerPulseAnimation: Animated.Value;
  codeInputShakeAnimation: Animated.Value;
  codeInputResetTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  codeInputSuccessTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  timerPulseLoopRef: MutableRefObject<Animated.CompositeAnimation | null>;
  memoryHideTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setSelectedQuizOption: Dispatch<SetStateAction<number | null>>;
  setQuizResult: Dispatch<SetStateAction<string | null>>;
  setWordleInput: Dispatch<SetStateAction<string>>;
  setWordleAttempts: Dispatch<SetStateAction<WordleAttempt[]>>;
  setWordleResult: Dispatch<SetStateAction<string | null>>;
  setWordleRevealedCellCounts: Dispatch<SetStateAction<number[]>>;
  setIsWordleRevealAnimating: Dispatch<SetStateAction<boolean>>;
  setHangmanGuessedLetters: Dispatch<SetStateAction<string[]>>;
  setHangmanMisses: Dispatch<SetStateAction<string[]>>;
  setHangmanResult: Dispatch<SetStateAction<string | null>>;
  setMastermindInput: Dispatch<SetStateAction<string>>;
  setMastermindAttempts: Dispatch<SetStateAction<MastermindAttempt[]>>;
  setMastermindResult: Dispatch<SetStateAction<string | null>>;
  setAnagramInput: Dispatch<SetStateAction<string>>;
  setAnagramAttempts: Dispatch<SetStateAction<number>>;
  setAnagramResult: Dispatch<SetStateAction<string | null>>;
  setCaesarInput: Dispatch<SetStateAction<string>>;
  setCaesarAttempts: Dispatch<SetStateAction<number>>;
  setCaesarResult: Dispatch<SetStateAction<string | null>>;
  setMemoryDeck: Dispatch<SetStateAction<MemoryCard[]>>;
  setMemorySelection: Dispatch<SetStateAction<string[]>>;
  setMemoryResult: Dispatch<SetStateAction<string | null>>;
  setMemoryBusy: Dispatch<SetStateAction<boolean>>;
  setSimonInput: Dispatch<SetStateAction<string[]>>;
  setSimonTargetLength: Dispatch<SetStateAction<number>>;
  setSimonMistakes: Dispatch<SetStateAction<number>>;
  setSimonActivePlaybackButtonId: Dispatch<SetStateAction<string | null>>;
  setIsSimonPlaybackActive: Dispatch<SetStateAction<boolean>>;
  setSimonResult: Dispatch<SetStateAction<string | null>>;
  setRebusInput: Dispatch<SetStateAction<string>>;
  setRebusAttempts: Dispatch<SetStateAction<number>>;
  setRebusResult: Dispatch<SetStateAction<string | null>>;
  setBoggleInput: Dispatch<SetStateAction<string>>;
  setBoggleSelectedCellPath: Dispatch<SetStateAction<number[]>>;
  setBoggleAttempts: Dispatch<SetStateAction<number>>;
  setBoggleResult: Dispatch<SetStateAction<string | null>>;
  setMiniSudokuValues: Dispatch<SetStateAction<string[]>>;
  setMiniSudokuResult: Dispatch<SetStateAction<string | null>>;
  setMatchingConnections: Dispatch<SetStateAction<Record<string, string>>>;
  setMatchingAttempts: Dispatch<SetStateAction<number>>;
  setMatchingResult: Dispatch<SetStateAction<string | null>>;
  setVerificationCode: Dispatch<SetStateAction<string>>;
  setCodeResult: Dispatch<SetStateAction<string | null>>;
  setQuizSubmitError: Dispatch<SetStateAction<string | null>>;
  setImageLoadFailed: Dispatch<SetStateAction<boolean>>;
  setQuizIconLoadFailed: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingQuizAnswer: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingWordleGuess: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingHangmanGuess: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingMastermindGuess: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingAnagram: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingCaesar: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingMemory: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingSimon: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingRebus: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingBoggle: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingMiniSudoku: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingMatching: Dispatch<SetStateAction<boolean>>;
  setIsSubmittingCode: Dispatch<SetStateAction<boolean>>;
  setIsCodeInputInvalid: Dispatch<SetStateAction<boolean>>;
  setIsCodeInputSuccess: Dispatch<SetStateAction<boolean>>;
  setNowMs: Dispatch<SetStateAction<number>>;
};

export function useStationOverlayReset({
  displayedStation,
  stationResetKey,
  clearTimeoutPopupCountdown,
  clearWordleRevealTimeouts,
  resetAudioPlaybackState,
  stopSimonPlayback,
  quizFeedbackAnimation,
  timerPulseAnimation,
  codeInputShakeAnimation,
  codeInputResetTimeoutRef,
  codeInputSuccessTimeoutRef,
  timerPulseLoopRef,
  memoryHideTimeoutRef,
  setSelectedQuizOption,
  setQuizResult,
  setWordleInput,
  setWordleAttempts,
  setWordleResult,
  setWordleRevealedCellCounts,
  setIsWordleRevealAnimating,
  setHangmanGuessedLetters,
  setHangmanMisses,
  setHangmanResult,
  setMastermindInput,
  setMastermindAttempts,
  setMastermindResult,
  setAnagramInput,
  setAnagramAttempts,
  setAnagramResult,
  setCaesarInput,
  setCaesarAttempts,
  setCaesarResult,
  setMemoryDeck,
  setMemorySelection,
  setMemoryResult,
  setMemoryBusy,
  setSimonInput,
  setSimonTargetLength,
  setSimonMistakes,
  setSimonActivePlaybackButtonId,
  setIsSimonPlaybackActive,
  setSimonResult,
  setRebusInput,
  setRebusAttempts,
  setRebusResult,
  setBoggleInput,
  setBoggleSelectedCellPath,
  setBoggleAttempts,
  setBoggleResult,
  setMiniSudokuValues,
  setMiniSudokuResult,
  setMatchingConnections,
  setMatchingAttempts,
  setMatchingResult,
  setVerificationCode,
  setCodeResult,
  setQuizSubmitError,
  setImageLoadFailed,
  setQuizIconLoadFailed,
  setIsSubmittingQuizAnswer,
  setIsSubmittingWordleGuess,
  setIsSubmittingHangmanGuess,
  setIsSubmittingMastermindGuess,
  setIsSubmittingAnagram,
  setIsSubmittingCaesar,
  setIsSubmittingMemory,
  setIsSubmittingSimon,
  setIsSubmittingRebus,
  setIsSubmittingBoggle,
  setIsSubmittingMiniSudoku,
  setIsSubmittingMatching,
  setIsSubmittingCode,
  setIsCodeInputInvalid,
  setIsCodeInputSuccess,
  setNowMs,
}: UseStationOverlayResetArgs) {
  const previousStationResetKeyRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (previousStationResetKeyRef.current === stationResetKey) {
      return;
    }
    previousStationResetKeyRef.current = stationResetKey;

    setSelectedQuizOption(null);
    setQuizResult(null);
    setWordleInput("");
    setWordleAttempts([]);
    setWordleResult(null);
    setWordleRevealedCellCounts([]);
    setIsWordleRevealAnimating(false);
    setHangmanGuessedLetters([]);
    setHangmanMisses([]);
    setHangmanResult(null);
    setMastermindInput("");
    setMastermindAttempts([]);
    setMastermindResult(null);
    setAnagramInput("");
    setAnagramAttempts(0);
    setAnagramResult(null);
    setCaesarInput("");
    setCaesarAttempts(0);
    setCaesarResult(null);
    setMemoryDeck(displayedStation ? resolveMemoryDeck(displayedStation) : []);
    setMemorySelection([]);
    setMemoryResult(null);
    setMemoryBusy(false);
    setSimonInput([]);
    setSimonTargetLength(3);
    setSimonMistakes(0);
    setSimonActivePlaybackButtonId(null);
    setIsSimonPlaybackActive(false);
    setSimonResult(null);
    setRebusInput("");
    setRebusAttempts(0);
    setRebusResult(null);
    setBoggleInput("");
    setBoggleSelectedCellPath([]);
    setBoggleAttempts(0);
    setBoggleResult(null);
    setMiniSudokuValues(
      displayedStation?.stationType === "mini-sudoku"
        ? Array.from({ length: resolveMiniSudokuPuzzle(displayedStation).given.length }, () => "")
        : Array.from({ length: 81 }, () => ""),
    );
    setMiniSudokuResult(null);
    setMatchingConnections({});
    setMatchingAttempts(0);
    setMatchingResult(null);
    setVerificationCode("");
    setCodeResult(null);
    setQuizSubmitError(null);
    resetAudioPlaybackState();
    setImageLoadFailed(false);
    setQuizIconLoadFailed(false);
    setIsSubmittingQuizAnswer(false);
    setIsSubmittingWordleGuess(false);
    setIsSubmittingHangmanGuess(false);
    setIsSubmittingMastermindGuess(false);
    setIsSubmittingAnagram(false);
    setIsSubmittingCaesar(false);
    setIsSubmittingMemory(false);
    setIsSubmittingSimon(false);
    setIsSubmittingRebus(false);
    setIsSubmittingBoggle(false);
    setIsSubmittingMiniSudoku(false);
    setIsSubmittingMatching(false);
    setIsSubmittingCode(false);
    setIsCodeInputInvalid(false);
    setIsCodeInputSuccess(false);
    stopSimonPlayback();
    clearTimeoutPopupCountdown();
    setNowMs(Date.now());
    quizFeedbackAnimation.setValue(0);
    timerPulseAnimation.setValue(0);
    codeInputShakeAnimation.setValue(0);
    if (codeInputResetTimeoutRef.current) {
      clearTimeout(codeInputResetTimeoutRef.current);
      codeInputResetTimeoutRef.current = null;
    }
    if (codeInputSuccessTimeoutRef.current) {
      clearTimeout(codeInputSuccessTimeoutRef.current);
      codeInputSuccessTimeoutRef.current = null;
    }
    timerPulseLoopRef.current?.stop();
    if (memoryHideTimeoutRef.current) {
      clearTimeout(memoryHideTimeoutRef.current);
      memoryHideTimeoutRef.current = null;
    }
    clearWordleRevealTimeouts();
  // Reset only when overlay target station changes (or closes), not on status updates of the same station.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stationResetKey,
    clearTimeoutPopupCountdown,
    clearWordleRevealTimeouts,
    codeInputShakeAnimation,
    quizFeedbackAnimation,
    resetAudioPlaybackState,
    stopSimonPlayback,
    timerPulseAnimation,
    timerPulseLoopRef,
  ]);
}
