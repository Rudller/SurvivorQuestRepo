import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
  MASTERMIND_MAX_ATTEMPTS,
  MEMORY_MAX_MISTAKES,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  WORDLE_MAX_ATTEMPTS,
  buildMastermindFeedback,
  buildWordleEvaluation,
  canBuildWordFromLetters,
  canTraceWordOnBoggle,
  normalizePuzzleWord,
  type MatchingPair,
} from "../puzzle-helpers";
import type { MastermindAttempt } from "./mastermind-station-panel";
import type { WordleAttempt } from "./wordle-station-panel";

type CompleteTaskHandler = (
  stationId: string,
  completionCode: string,
  startedAt?: string,
) => Promise<string | null>;

type QuizOutcomeVariant = "success" | "failed";
type ShowQuizOutcomePopup = (variant: QuizOutcomeVariant, message: string) => void;
type SubmitErrorHandler = (error: string) => void;

type StringStateSetter = Dispatch<SetStateAction<string>>;
type NullableStringStateSetter = Dispatch<SetStateAction<string | null>>;

export function sanitizeMastermindInput(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-F]/g, "")
    .slice(0, 4);
}

type HandleMastermindInputChangeArgs = {
  value: string;
  setMastermindInput: StringStateSetter;
  setMastermindResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
};

export function handleMastermindInputChange({
  value,
  setMastermindInput,
  setMastermindResult,
  setQuizSubmitError,
}: HandleMastermindInputChangeArgs) {
  setMastermindInput(sanitizeMastermindInput(value));
  setMastermindResult(null);
  setQuizSubmitError(null);
}

type HandleMastermindAddSymbolArgs = {
  symbol: string;
  isInteractiveLocked: boolean;
  isSubmittingMastermindGuess: boolean;
  mastermindSolved: boolean;
  mastermindAttemptsLeft: number;
  setMastermindInput: StringStateSetter;
  setMastermindResult: NullableStringStateSetter;
};

export function handleMastermindAddSymbol({
  symbol,
  isInteractiveLocked,
  isSubmittingMastermindGuess,
  mastermindSolved,
  mastermindAttemptsLeft,
  setMastermindInput,
  setMastermindResult,
}: HandleMastermindAddSymbolArgs) {
  if (isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0) {
    return;
  }

  setMastermindInput((current) => `${sanitizeMastermindInput(current)}${symbol}`.slice(0, 4));
  setMastermindResult(null);
}

type SubmitWordleGuessControllerArgs = {
  isWordleStation: boolean;
  normalizedWordleInput: string;
  wordleLength: number;
  stationStatus: string;
  isSubmittingWordleGuess: boolean;
  isWordleRevealAnimating: boolean;
  hasTimedLimit: boolean;
  hasTimerStarted: boolean;
  isTimeExpired: boolean;
  wordleAttempts: WordleAttempt[];
  wordleSecret: string;
  wordleDisplayLength: number;
  stationId: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  showQuizOutcomePopup: ShowQuizOutcomePopup;
  runWordleRevealSequence: (attemptIndex: number, revealLength: number) => Promise<void>;
  setWordleAttempts: Dispatch<SetStateAction<WordleAttempt[]>>;
  setWordleRevealedCellCounts: Dispatch<SetStateAction<number[]>>;
  setWordleInput: StringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
  setWordleResult: NullableStringStateSetter;
  setIsSubmittingWordleGuess: Dispatch<SetStateAction<boolean>>;
  onSubmitError: SubmitErrorHandler;
  text: {
    wordleEnterGuess: string;
    wordleLengthExact: (length: number) => string;
    wordleAttemptsExhausted: string;
    wordleTryAgain: string;
    wordleNoAttempts: string;
    wordleFailedPopup: string;
    wordleSolved: string;
    wordleSolvedPopup: string;
  };
};

export async function submitWordleGuessController({
  isWordleStation,
  normalizedWordleInput,
  wordleLength,
  stationStatus,
  isSubmittingWordleGuess,
  isWordleRevealAnimating,
  hasTimedLimit,
  hasTimerStarted,
  isTimeExpired,
  wordleAttempts,
  wordleSecret,
  wordleDisplayLength,
  stationId,
  startedAt,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  showQuizOutcomePopup,
  runWordleRevealSequence,
  setWordleAttempts,
  setWordleRevealedCellCounts,
  setWordleInput,
  setQuizSubmitError,
  setWordleResult,
  setIsSubmittingWordleGuess,
  onSubmitError,
  text,
}: SubmitWordleGuessControllerArgs) {
  if (!isWordleStation) {
    return;
  }

  if (!normalizedWordleInput.trim()) {
    setWordleResult(text.wordleEnterGuess);
    return;
  }

  if (!wordleLength || normalizedWordleInput.length !== wordleLength) {
    setWordleResult(text.wordleLengthExact(wordleLength));
    return;
  }

  if (
    stationStatus === "done" ||
    stationStatus === "failed" ||
    isSubmittingWordleGuess ||
    isWordleRevealAnimating ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired
  ) {
    return;
  }

  if (wordleAttempts.length >= WORDLE_MAX_ATTEMPTS) {
    setWordleResult(text.wordleAttemptsExhausted);
    return;
  }

  const evaluation = buildWordleEvaluation(normalizedWordleInput, wordleSecret);
  const nextAttempts = [...wordleAttempts, { guess: normalizedWordleInput, evaluation }];
  setWordleAttempts(nextAttempts);
  setWordleRevealedCellCounts((current) => {
    const next = current.slice(0, nextAttempts.length);
    while (next.length < nextAttempts.length - 1) {
      next.push(wordleDisplayLength);
    }
    next[nextAttempts.length - 1] = 0;
    return next;
  });
  setWordleInput("");
  setQuizSubmitError(null);
  await runWordleRevealSequence(nextAttempts.length - 1, wordleLength);

  const solved = evaluation.every((item) => item === "correct");
  if (!solved) {
    const exhausted = nextAttempts.length >= WORDLE_MAX_ATTEMPTS;
    if (!exhausted) {
      setWordleResult(text.wordleTryAgain);
      return;
    }

    setWordleResult(text.wordleNoAttempts);
    onQuizFailed?.(stationId, "quiz_incorrect_answer");
    showQuizOutcomePopup("failed", text.wordleFailedPopup);
    return;
  }

  if (!onCompleteTask) {
    setWordleResult(text.wordleSolved);
    onQuizPassed?.(stationId);
    showQuizOutcomePopup("success", text.wordleSolvedPopup);
    return;
  }

  setIsSubmittingWordleGuess(true);
  const error = await onCompleteTask(stationId, "QUIZ", startedAt ?? undefined);
  setIsSubmittingWordleGuess(false);
  if (error) {
    setQuizSubmitError(error);
    onSubmitError(error);
    return;
  }

  setWordleResult(text.wordleSolved);
  onQuizPassed?.(stationId);
  showQuizOutcomePopup("success", text.wordleSolvedPopup);
}

type SubmitMastermindGuessControllerArgs = {
  isMastermindStation: boolean;
  normalizedMastermindInput: string;
  mastermindSecret: string;
  isInteractiveLocked: boolean;
  isSubmittingMastermindGuess: boolean;
  mastermindSolved: boolean;
  mastermindAttemptsLeft: number;
  mastermindAttempts: MastermindAttempt[];
  stationId: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  showQuizOutcomePopup: ShowQuizOutcomePopup;
  setMastermindAttempts: Dispatch<SetStateAction<MastermindAttempt[]>>;
  setMastermindInput: StringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
  setMastermindResult: NullableStringStateSetter;
  setIsSubmittingMastermindGuess: Dispatch<SetStateAction<boolean>>;
  onSubmitError: SubmitErrorHandler;
  text: {
    mastermindInvalidCode: (length: number) => string;
    mastermindNoAttempts: () => string;
    mastermindFailedPopup: string;
    mastermindFeedback: (exact: number, misplaced: number) => string;
    mastermindSolved: string;
    mastermindSolvedPopup: string;
  };
};

export async function submitMastermindGuessController({
  isMastermindStation,
  normalizedMastermindInput,
  mastermindSecret,
  isInteractiveLocked,
  isSubmittingMastermindGuess,
  mastermindSolved,
  mastermindAttemptsLeft,
  mastermindAttempts,
  stationId,
  startedAt,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  showQuizOutcomePopup,
  setMastermindAttempts,
  setMastermindInput,
  setQuizSubmitError,
  setMastermindResult,
  setIsSubmittingMastermindGuess,
  onSubmitError,
  text,
}: SubmitMastermindGuessControllerArgs) {
  if (!isMastermindStation) {
    return;
  }

  if (normalizedMastermindInput.length !== mastermindSecret.length) {
    setMastermindResult(text.mastermindInvalidCode(mastermindSecret.length));
    return;
  }

  if (isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0) {
    return;
  }

  const feedback = buildMastermindFeedback(normalizedMastermindInput, mastermindSecret);
  const nextAttempts = [...mastermindAttempts, { guess: normalizedMastermindInput, ...feedback }];
  setMastermindAttempts(nextAttempts);
  setMastermindInput("");
  setQuizSubmitError(null);

  if (feedback.exact !== mastermindSecret.length) {
    if (nextAttempts.length >= MASTERMIND_MAX_ATTEMPTS) {
      setMastermindResult(text.mastermindNoAttempts());
      onQuizFailed?.(stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.mastermindFailedPopup);
      return;
    }
    setMastermindResult(text.mastermindFeedback(feedback.exact, feedback.misplaced));
    return;
  }

  if (!onCompleteTask) {
    setMastermindResult(text.mastermindSolved);
    onQuizPassed?.(stationId);
    showQuizOutcomePopup("success", text.mastermindSolvedPopup);
    return;
  }

  setIsSubmittingMastermindGuess(true);
  const error = await onCompleteTask(stationId, "QUIZ", startedAt ?? undefined);
  setIsSubmittingMastermindGuess(false);
  if (error) {
    setQuizSubmitError(error);
    onSubmitError(error);
    return;
  }

  setMastermindResult(text.mastermindSolved);
  onQuizPassed?.(stationId);
  showQuizOutcomePopup("success", text.mastermindSolvedPopup);
}

type HandleSimonPressControllerArgs = {
  buttonId: string;
  isSimonStation: boolean;
  isInteractiveLocked: boolean;
  isSubmittingSimon: boolean;
  isSimonPlaybackActive: boolean;
  simonInput: string[];
  simonRoundLength: number;
  simonSequence: string[];
  simonMistakes: number;
  simonMaxMistakes: number;
  simonInputHighlightMs: number;
  stationId: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  showQuizOutcomePopup: ShowQuizOutcomePopup;
  setSimonInput: Dispatch<SetStateAction<string[]>>;
  setSimonMistakes: Dispatch<SetStateAction<number>>;
  setSimonResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
  setSimonTargetLength: Dispatch<SetStateAction<number>>;
  setIsSubmittingSimon: Dispatch<SetStateAction<boolean>>;
  clearSimonInputHighlight: () => void;
  setSimonActiveInputButtonId: Dispatch<SetStateAction<string | null>>;
  simonInputHighlightTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  playSimonTone: (buttonId: string) => Promise<void>;
  playSimonSequence: (sequence: string[]) => Promise<void>;
  onSubmitError: SubmitErrorHandler;
  text: {
    simonWrong: string;
    simonFailedPopup: string;
    simonProgress: (current: number, total: number) => string;
    simonSolved: string;
    simonSolvedPopup: string;
  };
};

export async function handleSimonPressController({
  buttonId,
  isSimonStation,
  isInteractiveLocked,
  isSubmittingSimon,
  isSimonPlaybackActive,
  simonInput,
  simonRoundLength,
  simonSequence,
  simonMistakes,
  simonMaxMistakes,
  simonInputHighlightMs,
  stationId,
  startedAt,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  showQuizOutcomePopup,
  setSimonInput,
  setSimonMistakes,
  setSimonResult,
  setQuizSubmitError,
  setSimonTargetLength,
  setIsSubmittingSimon,
  clearSimonInputHighlight,
  setSimonActiveInputButtonId,
  simonInputHighlightTimeoutRef,
  playSimonTone,
  playSimonSequence,
  onSubmitError,
  text,
}: HandleSimonPressControllerArgs) {
  if (
    !isSimonStation ||
    isInteractiveLocked ||
    isSubmittingSimon ||
    isSimonPlaybackActive ||
    simonInput.length >= simonRoundLength
  ) {
    return;
  }

  clearSimonInputHighlight();
  setSimonActiveInputButtonId(buttonId);
  simonInputHighlightTimeoutRef.current = setTimeout(() => {
    setSimonActiveInputButtonId((current) => (current === buttonId ? null : current));
    simonInputHighlightTimeoutRef.current = null;
  }, simonInputHighlightMs);
  void playSimonTone(buttonId);
  const nextInput = [...simonInput, buttonId];
  setSimonInput(nextInput);
  setQuizSubmitError(null);

  const isPrefixValid = nextInput.every((entry, index) => entry === simonSequence[index]);
  if (!isPrefixValid) {
    const nextMistakes = simonMistakes + 1;
    setSimonMistakes(nextMistakes);
    setSimonInput([]);
    setSimonResult(text.simonWrong);

    if (nextMistakes >= simonMaxMistakes) {
      onQuizFailed?.(stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.simonFailedPopup);
      return;
    }

    void playSimonSequence(simonSequence.slice(0, simonRoundLength));
    return;
  }

  if (nextInput.length < simonRoundLength) {
    setSimonResult(text.simonProgress(nextInput.length, simonRoundLength));
    return;
  }

  if (simonRoundLength < simonSequence.length) {
    const nextRoundLength = Math.min(simonRoundLength + 1, simonSequence.length);
    setSimonInput([]);
    setSimonTargetLength(nextRoundLength);
    setSimonResult(text.simonProgress(simonRoundLength, nextRoundLength));
    void playSimonSequence(simonSequence.slice(0, nextRoundLength));
    return;
  }

  if (!onCompleteTask) {
    setSimonResult(text.simonSolved);
    onQuizPassed?.(stationId);
    showQuizOutcomePopup("success", text.simonSolvedPopup);
    return;
  }

  setIsSubmittingSimon(true);
  const error = await onCompleteTask(stationId, "QUIZ", startedAt ?? undefined);
  setIsSubmittingSimon(false);
  if (error) {
    setQuizSubmitError(error);
    onSubmitError(error);
    return;
  }

  setSimonResult(text.simonSolved);
  onQuizPassed?.(stationId);
  showQuizOutcomePopup("success", text.simonSolvedPopup);
}

type SubmitBoggleControllerArgs = {
  isBoggleStation: boolean;
  normalizedBoggleInput: string;
  boggleMaxInputLength: number;
  isInteractiveLocked: boolean;
  isSubmittingBoggle: boolean;
  boggleAttemptsLeft: number;
  boggleBoardLetters: string[];
  boggleTargetWord: string;
  boggleAttempts: number;
  stationId: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  showQuizOutcomePopup: ShowQuizOutcomePopup;
  setQuizSubmitError: NullableStringStateSetter;
  setBoggleAttempts: Dispatch<SetStateAction<number>>;
  setBoggleResult: NullableStringStateSetter;
  setIsSubmittingBoggle: Dispatch<SetStateAction<boolean>>;
  onSubmitError: SubmitErrorHandler;
  text: {
    boggleEnterMin: string;
    boggleMaxLength: (max: number) => string;
    boggleNoAttempts: (target: string) => string;
    boggleFailedPopup: string;
    boggleIncorrect: string;
    boggleSolved: string;
    boggleSolvedPopup: string;
  };
};

export async function submitBoggleController({
  isBoggleStation,
  normalizedBoggleInput,
  boggleMaxInputLength,
  isInteractiveLocked,
  isSubmittingBoggle,
  boggleAttemptsLeft,
  boggleBoardLetters,
  boggleTargetWord,
  boggleAttempts,
  stationId,
  startedAt,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  showQuizOutcomePopup,
  setQuizSubmitError,
  setBoggleAttempts,
  setBoggleResult,
  setIsSubmittingBoggle,
  onSubmitError,
  text,
}: SubmitBoggleControllerArgs) {
  if (!isBoggleStation) {
    return;
  }

  if (!normalizedBoggleInput || normalizedBoggleInput.length < 3) {
    setBoggleResult(text.boggleEnterMin);
    return;
  }
  if (normalizedBoggleInput.length > boggleMaxInputLength) {
    setBoggleResult(text.boggleMaxLength(boggleMaxInputLength));
    return;
  }

  if (isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0) {
    return;
  }

  setQuizSubmitError(null);
  const lettersAvailable = canBuildWordFromLetters(boggleBoardLetters, normalizedBoggleInput);
  const traceable = canTraceWordOnBoggle(boggleBoardLetters, normalizedBoggleInput);
  const isCorrect = normalizedBoggleInput === boggleTargetWord && lettersAvailable && traceable;
  if (!isCorrect) {
    const nextAttempts = boggleAttempts + 1;
    setBoggleAttempts(nextAttempts);
    if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
      setBoggleResult(text.boggleNoAttempts(boggleTargetWord));
      onQuizFailed?.(stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.boggleFailedPopup);
      return;
    }

    setBoggleResult(text.boggleIncorrect);
    return;
  }

  if (!onCompleteTask) {
    setBoggleResult(text.boggleSolved);
    onQuizPassed?.(stationId);
    showQuizOutcomePopup("success", text.boggleSolvedPopup);
    return;
  }

  setIsSubmittingBoggle(true);
  const error = await onCompleteTask(stationId, "QUIZ", startedAt ?? undefined);
  setIsSubmittingBoggle(false);
  if (error) {
    setQuizSubmitError(error);
    onSubmitError(error);
    return;
  }

  setBoggleResult(text.boggleSolved);
  onQuizPassed?.(stationId);
  showQuizOutcomePopup("success", text.boggleSolvedPopup);
}

type SelectBoggleBoardCellControllerArgs = {
  cellIndex: number;
  isBoggleStation: boolean;
  isInteractiveLocked: boolean;
  isSubmittingBoggle: boolean;
  boggleAttemptsLeft: number;
  boggleBoardLetters: string[];
  boggleSelectedCellPath: number[];
  boggleMaxInputLength: number;
  boggleBoardSide: number;
  setBoggleSelectedCellPath: Dispatch<SetStateAction<number[]>>;
  setBoggleInput: StringStateSetter;
  setBoggleResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
  text: {
    boggleAdjacentOnly: string;
  };
};

export function selectBoggleBoardCellController({
  cellIndex,
  isBoggleStation,
  isInteractiveLocked,
  isSubmittingBoggle,
  boggleAttemptsLeft,
  boggleBoardLetters,
  boggleSelectedCellPath,
  boggleMaxInputLength,
  boggleBoardSide,
  setBoggleSelectedCellPath,
  setBoggleInput,
  setBoggleResult,
  setQuizSubmitError,
  text,
}: SelectBoggleBoardCellControllerArgs) {
  if (!isBoggleStation || isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0) {
    return;
  }

  const letter = boggleBoardLetters[cellIndex] ?? "";
  if (!letter) {
    return;
  }

  const existingPathIndex = boggleSelectedCellPath.indexOf(cellIndex);
  if (existingPathIndex >= 0) {
    const nextPath = boggleSelectedCellPath.slice(0, existingPathIndex);
    setBoggleSelectedCellPath(nextPath);
    setBoggleInput((current) => current.slice(0, nextPath.length));
    setBoggleResult(null);
    setQuizSubmitError(null);
    return;
  }

  if (boggleSelectedCellPath.length >= boggleMaxInputLength) {
    return;
  }

  if (boggleSelectedCellPath.length > 0 && Number.isInteger(boggleBoardSide)) {
    const previousCell = boggleSelectedCellPath[boggleSelectedCellPath.length - 1] ?? 0;
    const previousRow = Math.floor(previousCell / boggleBoardSide);
    const previousCol = previousCell % boggleBoardSide;
    const nextRow = Math.floor(cellIndex / boggleBoardSide);
    const nextCol = cellIndex % boggleBoardSide;
    if (Math.abs(previousRow - nextRow) > 1 || Math.abs(previousCol - nextCol) > 1) {
      setBoggleResult(text.boggleAdjacentOnly);
      return;
    }
  }

  setBoggleSelectedCellPath((current) => [...current, cellIndex]);
  setBoggleInput((current) => `${current}${letter}`.slice(0, boggleMaxInputLength));
  setBoggleResult(null);
  setQuizSubmitError(null);
}

type BackspaceBoggleInputControllerArgs = {
  isInteractiveLocked: boolean;
  isSubmittingBoggle: boolean;
  boggleAttemptsLeft: number;
  setBoggleSelectedCellPath: Dispatch<SetStateAction<number[]>>;
  setBoggleInput: StringStateSetter;
  setBoggleResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
};

export function backspaceBoggleInputController({
  isInteractiveLocked,
  isSubmittingBoggle,
  boggleAttemptsLeft,
  setBoggleSelectedCellPath,
  setBoggleInput,
  setBoggleResult,
  setQuizSubmitError,
}: BackspaceBoggleInputControllerArgs) {
  if (isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0) {
    return;
  }

  setBoggleSelectedCellPath((current) => {
    if (!current.length) {
      return current;
    }
    return current.slice(0, -1);
  });
  setBoggleInput((current) => {
    if (!current.length) {
      return current;
    }
    return current.slice(0, -1);
  });
  setBoggleResult(null);
  setQuizSubmitError(null);
}

type HandleBoggleInputChangeArgs = {
  value: string;
  boggleMaxInputLength: number;
  setBoggleInput: StringStateSetter;
  setBoggleSelectedCellPath: Dispatch<SetStateAction<number[]>>;
  setBoggleResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
};

export function handleBoggleInputChange({
  value,
  boggleMaxInputLength,
  setBoggleInput,
  setBoggleSelectedCellPath,
  setBoggleResult,
  setQuizSubmitError,
}: HandleBoggleInputChangeArgs) {
  setBoggleInput(normalizePuzzleWord(value).slice(0, boggleMaxInputLength));
  setBoggleSelectedCellPath([]);
  setBoggleResult(null);
  setQuizSubmitError(null);
}

type SubmitMiniSudokuControllerArgs = {
  isMiniSudokuStation: boolean;
  hasMiniSudokuPuzzle: boolean;
  miniSudokuGridMeta: { side: number; blockSide: number } | null;
  isInteractiveLocked: boolean;
  isSubmittingMiniSudoku: boolean;
  miniSudokuAttemptsLeft: number;
  miniSudokuAttemptedValues: string[];
  miniSudokuHasConflicts: boolean;
  miniSudokuAttempts: number;
  stationId: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  showQuizOutcomePopup: ShowQuizOutcomePopup;
  setMiniSudokuAttempts: Dispatch<SetStateAction<number>>;
  setMiniSudokuResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
  setIsSubmittingMiniSudoku: Dispatch<SetStateAction<boolean>>;
  onSubmitError: SubmitErrorHandler;
  text: {
    miniSudokuIncorrect: string;
    miniSudokuFillAll: string;
    miniSudokuNoAttempts: () => string;
    miniSudokuFailedPopup: string;
    miniSudokuSolved: string;
    miniSudokuSolvedPopup: string;
  };
};

export async function submitMiniSudokuController({
  isMiniSudokuStation,
  hasMiniSudokuPuzzle,
  miniSudokuGridMeta,
  isInteractiveLocked,
  isSubmittingMiniSudoku,
  miniSudokuAttemptsLeft,
  miniSudokuAttemptedValues,
  miniSudokuHasConflicts,
  miniSudokuAttempts,
  stationId,
  startedAt,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  showQuizOutcomePopup,
  setMiniSudokuAttempts,
  setMiniSudokuResult,
  setQuizSubmitError,
  setIsSubmittingMiniSudoku,
  onSubmitError,
  text,
}: SubmitMiniSudokuControllerArgs) {
  if (!isMiniSudokuStation || !hasMiniSudokuPuzzle) {
    return;
  }

  if (isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0) {
    return;
  }

  if (!miniSudokuGridMeta) {
    return;
  }

  const allowedValues = new Set(
    Array.from({ length: miniSudokuGridMeta.side }, (_, index) => `${index + 1}`),
  );
  const hasMissingValues = miniSudokuAttemptedValues.some((value) => !allowedValues.has(value));

  if (hasMissingValues) {
    setMiniSudokuResult(miniSudokuHasConflicts ? text.miniSudokuIncorrect : text.miniSudokuFillAll);
    return;
  }
  setQuizSubmitError(null);

  if (miniSudokuHasConflicts) {
    const nextAttempts = miniSudokuAttempts + 1;
    setMiniSudokuAttempts(nextAttempts);
    if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
      setMiniSudokuResult(text.miniSudokuNoAttempts());
      onQuizFailed?.(stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.miniSudokuFailedPopup);
      return;
    }

    setMiniSudokuResult(text.miniSudokuIncorrect);
    return;
  }

  if (!onCompleteTask) {
    setMiniSudokuResult(text.miniSudokuSolved);
    onQuizPassed?.(stationId);
    showQuizOutcomePopup("success", text.miniSudokuSolvedPopup);
    return;
  }

  setIsSubmittingMiniSudoku(true);
  const error = await onCompleteTask(stationId, "QUIZ", startedAt ?? undefined);
  setIsSubmittingMiniSudoku(false);
  if (error) {
    setQuizSubmitError(error);
    onSubmitError(error);
    return;
  }

  setMiniSudokuResult(text.miniSudokuSolved);
  onQuizPassed?.(stationId);
  showQuizOutcomePopup("success", text.miniSudokuSolvedPopup);
}

type HandleMiniSudokuChangeCellArgs = {
  index: number;
  nextValue: string;
  setMiniSudokuValues: Dispatch<SetStateAction<string[]>>;
  setMiniSudokuResult: NullableStringStateSetter;
  setQuizSubmitError: NullableStringStateSetter;
};

export function handleMiniSudokuChangeCellController({
  index,
  nextValue,
  setMiniSudokuValues,
  setMiniSudokuResult,
  setQuizSubmitError,
}: HandleMiniSudokuChangeCellArgs) {
  const sanitizedValue = nextValue.replace(/[^1-9]/g, "").slice(0, 1);
  setMiniSudokuValues((current) => {
    if (current[index] === sanitizedValue) {
      return current;
    }
    const next = [...current];
    next[index] = sanitizedValue;
    return next;
  });
  setMiniSudokuResult(null);
  setQuizSubmitError(null);
}

type SubmitMatchingPairControllerArgs = {
  left: string;
  right: string;
  isMatchingStation: boolean;
  isInteractiveLocked: boolean;
  isSubmittingMatching: boolean;
  matchingAllMatched: boolean;
  matchingAttemptsLeft: number;
  matchingConnections: Record<string, string>;
  matchingMatchedRightSet: Set<string>;
  matchingPairs: MatchingPair[];
  matchingAttempts: number;
  stationId: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  showQuizOutcomePopup: ShowQuizOutcomePopup;
  setQuizSubmitError: NullableStringStateSetter;
  setMatchingConnections: Dispatch<SetStateAction<Record<string, string>>>;
  setMatchingResult: NullableStringStateSetter;
  setIsSubmittingMatching: Dispatch<SetStateAction<boolean>>;
  setMatchingAttempts: Dispatch<SetStateAction<number>>;
  onSubmitError: SubmitErrorHandler;
  text: {
    matchingPairGood: string;
    matchingSolved: string;
    matchingSolvedPopup: string;
    matchingNoAttempts: string;
    matchingFailedPopup: string;
    matchingWrongPair: string;
  };
};

export async function submitMatchingPairController({
  left,
  right,
  isMatchingStation,
  isInteractiveLocked,
  isSubmittingMatching,
  matchingAllMatched,
  matchingAttemptsLeft,
  matchingConnections,
  matchingMatchedRightSet,
  matchingPairs,
  matchingAttempts,
  stationId,
  startedAt,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  showQuizOutcomePopup,
  setQuizSubmitError,
  setMatchingConnections,
  setMatchingResult,
  setIsSubmittingMatching,
  setMatchingAttempts,
  onSubmitError,
  text,
}: SubmitMatchingPairControllerArgs) {
  if (!isMatchingStation || isInteractiveLocked || isSubmittingMatching || matchingAllMatched || matchingAttemptsLeft <= 0) {
    return;
  }

  if (matchingConnections[left] || matchingMatchedRightSet.has(right)) {
    return;
  }

  const selectedPair = matchingPairs.find((pair) => pair.left === left);
  if (!selectedPair) {
    return;
  }

  setQuizSubmitError(null);
  if (selectedPair.right === right) {
    const nextConnections = {
      ...matchingConnections,
      [left]: right,
    };
    setMatchingConnections(nextConnections);
    if (Object.keys(nextConnections).length < matchingPairs.length) {
      setMatchingResult(text.matchingPairGood);
      return;
    }

    if (!onCompleteTask) {
      setMatchingResult(text.matchingSolved);
      onQuizPassed?.(stationId);
      showQuizOutcomePopup("success", text.matchingSolvedPopup);
      return;
    }

    setIsSubmittingMatching(true);
    const error = await onCompleteTask(stationId, "QUIZ", startedAt ?? undefined);
    setIsSubmittingMatching(false);
    if (error) {
      setQuizSubmitError(error);
      onSubmitError(error);
      return;
    }

    setMatchingResult(text.matchingSolved);
    onQuizPassed?.(stationId);
    showQuizOutcomePopup("success", text.matchingSolvedPopup);
    return;
  }

  const nextAttempts = matchingAttempts + 1;
  setMatchingAttempts(nextAttempts);
  if (nextAttempts >= MEMORY_MAX_MISTAKES) {
    setMatchingResult(text.matchingNoAttempts);
    onQuizFailed?.(stationId, "quiz_incorrect_answer");
    showQuizOutcomePopup("failed", text.matchingFailedPopup);
    return;
  }

  setMatchingResult(text.matchingWrongPair);
}
