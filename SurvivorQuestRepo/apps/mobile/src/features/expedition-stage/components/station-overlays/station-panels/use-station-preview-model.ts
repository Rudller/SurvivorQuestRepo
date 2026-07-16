import { Animated } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { UiLanguage } from "../../../../i18n";
import type { StationTestType, StationTestViewModel } from "../types";
import {
  HANGMAN_MAX_MISSES,
  MEMORY_MAX_MISTAKES,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  WORDLE_MAX_ATTEMPTS,
  type ChallengeDifficulty,
  type MemoryCard,
  type WordleCellState,
  blendHexColors,
  formatRemainingTimeLabel,
  isGuessableHangmanCharacter,
  normalizePuzzleText,
  normalizePuzzleWord,
  normalizeWordleSecret,
  resolveBoggleBoard,
  resolveBoggleTarget,
  resolveCaesarSecret,
  resolveCaesarShift,
  resolveCorrectAnswerText,
  resolveMatchingPairs,
  resolveMastermindConfig,
  resolveMastermindSecret,
  resolveMiniSudokuPuzzle,
  resolvePuzzleSecret,
  resolveSimonSequence,
  scrambleWord,
  shuffleDeterministic,
} from "../puzzle-helpers";
import type { MastermindAttempt } from "./mastermind-station-panel";
import type { WordleAttempt } from "./wordle-station-panel";

type MiniSudokuPuzzle = ReturnType<typeof resolveMiniSudokuPuzzle>;

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

function resolveMiniSudokuGridMeta(solutionLength: number) {
  const side = Math.round(Math.sqrt(solutionLength));
  if (!Number.isInteger(side) || side < 2) {
    return null;
  }

  const blockSide = side === 4 ? 2 : Math.max(1, Math.round(Math.sqrt(side)));
  return { side, blockSide };
}

function resolveMiniSudokuAttemptedValues(puzzle: MiniSudokuPuzzle, values: string[]) {
  return puzzle.given.map((givenValue, index) => givenValue ?? values[index] ?? "");
}

function hasMiniSudokuConflictAtIndex(
  values: string[],
  side: number,
  blockSide: number,
  index: number,
) {
  const value = values[index] ?? "";
  if (!value) {
    return false;
  }

  const row = Math.floor(index / side);
  const col = index % side;

  for (let currentCol = 0; currentCol < side; currentCol += 1) {
    const candidateIndex = row * side + currentCol;
    if (candidateIndex !== index && values[candidateIndex] === value) {
      return true;
    }
  }

  for (let currentRow = 0; currentRow < side; currentRow += 1) {
    const candidateIndex = currentRow * side + col;
    if (candidateIndex !== index && values[candidateIndex] === value) {
      return true;
    }
  }

  const blockStartRow = Math.floor(row / blockSide) * blockSide;
  const blockStartCol = Math.floor(col / blockSide) * blockSide;
  for (let rowOffset = 0; rowOffset < blockSide; rowOffset += 1) {
    for (let colOffset = 0; colOffset < blockSide; colOffset += 1) {
      const candidateIndex = (blockStartRow + rowOffset) * side + blockStartCol + colOffset;
      if (candidateIndex !== index && values[candidateIndex] === value) {
        return true;
      }
    }
  }

  return false;
}

function collectMiniSudokuConflictIndexes(values: string[], side: number, blockSide: number) {
  return values
    .map((_, index) => (hasMiniSudokuConflictAtIndex(values, side, blockSide, index) ? index : -1))
    .filter((index) => index >= 0);
}

type UseStationPreviewModelArgs = {
  station: StationTestViewModel;
  uiLanguage: UiLanguage;
  viewportHeight: number;
  viewportWidth: number;
  isTabletOverlay: boolean;
  adaptiveScale: (value: number, min?: number, max?: number) => number;
  imageLoadFailed: boolean;
  selectedQuizOption: number | null;
  wordleInput: string;
  wordleAttempts: WordleAttempt[];
  wordleRevealedCellCounts: number[];
  wordleKeyboardContainerWidth: number;
  isWordleRevealAnimating: boolean;
  hangmanGuessedLetters: string[];
  hangmanMisses: string[];
  mastermindInput: string;
  mastermindAttempts: MastermindAttempt[];
  mastermindDifficulty: ChallengeDifficulty;
  anagramInput: string;
  anagramAttempts: number;
  caesarInput: string;
  caesarAttempts: number;
  memoryDeck: MemoryCard[];
  simonTargetLength: number;
  simonInput: string[];
  rebusInput: string;
  rebusAttempts: number;
  boggleInput: string;
  boggleAttempts: number;
  miniSudokuValues: string[];
  miniSudokuResult: string | null;
  matchingConnections: Record<string, string>;
  matchingAttempts: number;
  remainingTimeSeconds: number | null;
  elapsedTimeSeconds: number | null;
  finalTenSecondsProgress: number;
  timerPulseAnimation: Animated.Value;
  isSubmittingQuizAnswer: boolean;
  isSubmittingWordleGuess: boolean;
  isSubmittingHangmanGuess: boolean;
  isSubmittingMastermindGuess: boolean;
  isSubmittingAnagram: boolean;
  isSubmittingCaesar: boolean;
  isSubmittingMemory: boolean;
  isSubmittingSimon: boolean;
  isSubmittingRebus: boolean;
  isSubmittingBoggle: boolean;
  isSubmittingMiniSudoku: boolean;
  isSubmittingMatching: boolean;
  isSubmittingCode: boolean;
  isCodeInputSuccess: boolean;
  isAudioLoading: boolean;
  isAudioPlaying: boolean;
  hasAudioPlaybackStarted: boolean;
  text: {
    miniSudokuIncorrect: string;
  };
};

export function buildStationPreviewModel({
  station,
  uiLanguage,
  viewportHeight,
  viewportWidth,
  isTabletOverlay,
  adaptiveScale,
  imageLoadFailed,
  selectedQuizOption,
  wordleInput,
  wordleAttempts,
  wordleRevealedCellCounts,
  wordleKeyboardContainerWidth,
  isWordleRevealAnimating,
  hangmanGuessedLetters,
  hangmanMisses,
  mastermindInput,
  mastermindAttempts,
  mastermindDifficulty,
  anagramInput,
  anagramAttempts,
  caesarInput,
  caesarAttempts,
  memoryDeck,
  simonTargetLength,
  simonInput,
  rebusInput,
  rebusAttempts,
  boggleInput,
  boggleAttempts,
  miniSudokuValues,
  miniSudokuResult,
  matchingConnections,
  matchingAttempts,
  remainingTimeSeconds,
  elapsedTimeSeconds,
  finalTenSecondsProgress,
  timerPulseAnimation,
  isSubmittingQuizAnswer,
  isSubmittingWordleGuess,
  isSubmittingHangmanGuess,
  isSubmittingMastermindGuess,
  isSubmittingAnagram,
  isSubmittingCaesar,
  isSubmittingMemory,
  isSubmittingSimon,
  isSubmittingRebus,
  isSubmittingBoggle,
  isSubmittingMiniSudoku,
  isSubmittingMatching,
  isSubmittingCode,
  isCodeInputSuccess,
  isAudioLoading,
  isAudioPlaying,
  hasAudioPlaybackStarted,
  text,
}: UseStationPreviewModelArgs) {
  const isClassicQuizStation = station.stationType === "quiz";
  const isAudioQuizStation = station.stationType === "audio-quiz";
  const isWordleStation = station.stationType === "wordle";
  const isHangmanStation = station.stationType === "hangman";
  const isMastermindStation = station.stationType === "mastermind";
  const isAnagramStation = station.stationType === "anagram";
  const isCaesarStation = station.stationType === "caesar-cipher";
  const isMemoryStation = station.stationType === "memory";
  const isSimonStation = station.stationType === "simon";
  const isRebusStation = station.stationType === "rebus";
  const isBoggleStation = station.stationType === "boggle";
  const isMiniSudokuStation = station.stationType === "mini-sudoku";
  const isMatchingStation = station.stationType === "matching";
  const isStrongPasswordStation = station.stationType === "strong-password";
  const isQuizStation = isQuizStationType(station.stationType);
  const requiresCode = station.stationType === "time" || station.stationType === "points";
  const requiresPhotoUpload = station.stationType === "photo-task";
  const isNumericCodeStation = requiresCode && station.completionCodeInputMode === "numeric";
  const normalizedImageUrl = station.imageUrl?.trim() || "";
  const isDicebearFallback = normalizedImageUrl.includes("api.dicebear.com/9.x/shapes/svg");
  const shouldShowQuizFallbackGraphic =
    isQuizStation && (imageLoadFailed || !normalizedImageUrl || isDicebearFallback);
  const stationImageUri = shouldShowQuizFallbackGraphic ? undefined : normalizedImageUrl || undefined;
  const stationDescription = station.description.trim();
  const stationMediaHeight = (() => {
    if (isNumericCodeStation) {
      return isTabletOverlay
        ? Math.max(104, Math.round(viewportHeight * 0.14))
        : Math.max(72, Math.round(viewportHeight * 0.1));
    }
    if (requiresCode || requiresPhotoUpload) {
      return isTabletOverlay
        ? Math.max(128, Math.round(viewportHeight * 0.2))
        : Math.max(92, Math.round(viewportHeight * 0.14));
    }
    if (isWordleStation) {
      return isTabletOverlay
        ? Math.max(230, Math.round(viewportHeight * 0.4))
        : Math.max(290, Math.round(viewportHeight * 0.38));
    }
    if (isAnagramStation) {
      return isTabletOverlay
        ? Math.max(210, Math.round(viewportHeight * 0.34))
        : Math.max(100, Math.round(viewportHeight * 0.16));
    }
    if (isSimonStation) {
      return isTabletOverlay
        ? Math.max(540, Math.round(viewportHeight * 0.72))
        : Math.max(420, Math.round(viewportHeight * 0.56));
    }
    if (isMemoryStation) {
      return isTabletOverlay
        ? Math.max(560, Math.round(viewportHeight * 0.8))
        : Math.max(180, Math.round(viewportHeight * 0.28));
    }
    if (isMiniSudokuStation) {
      return isTabletOverlay
        ? Math.max(560, Math.round(viewportHeight * 0.74))
        : Math.max(300, Math.round(viewportHeight * 0.45));
    }
    if (isMastermindStation) {
      return isTabletOverlay
        ? Math.max(340, Math.round(viewportHeight * 0.56))
        : Math.max(180, Math.round(viewportHeight * 0.28));
    }
    if (isMatchingStation) {
      return isTabletOverlay
        ? Math.max(430, Math.round(viewportHeight * 0.7))
        : Math.max(160, Math.round(viewportHeight * 0.26));
    }
    if (isBoggleStation) {
      return isTabletOverlay
        ? Math.max(400, Math.round(viewportHeight * 0.64))
        : Math.max(160, Math.round(viewportHeight * 0.26));
    }
    if (isStrongPasswordStation) {
      return isTabletOverlay
        ? Math.max(280, Math.round(viewportHeight * 0.42))
        : Math.max(180, Math.round(viewportHeight * 0.28));
    }
    return isTabletOverlay
      ? Math.max(190, Math.round(viewportHeight * 0.33))
      : Math.max(128, Math.round(viewportHeight * 0.22));
  })();
  const hasTimerStarted = Boolean(station.startedAt);
  const hasQuizAnswer = selectedQuizOption !== null;
  const wordleSecret = isWordleStation ? resolvePuzzleSecret(station, "wordle") : "";
  const wordleLength = Array.from(wordleSecret).length;
  const wordleDisplayLength = Math.max(1, wordleLength || 5);
  const normalizedWordleInput = normalizeWordleSecret(wordleInput).slice(0, wordleLength || 32);
  const wordleInputCharacters = Array.from(normalizedWordleInput);
  const normalizedWordleAttemptsCount = wordleAttempts.length;
  const wordleSolved = wordleAttempts.some((attempt) => attempt.evaluation.every((cell) => cell === "correct"));
  const wordleAttemptsLeft = Math.max(0, WORDLE_MAX_ATTEMPTS - normalizedWordleAttemptsCount);
  const wordleKeyStateByLetter = (() => {
    const statePriority: Record<WordleCellState, number> = {
      absent: 1,
      present: 2,
      correct: 3,
    };
    const map = new Map<string, WordleCellState>();

    wordleAttempts.forEach((attempt, attemptIndex) => {
      const revealedCellCount = Math.max(
        0,
        Math.min(wordleDisplayLength, wordleRevealedCellCounts[attemptIndex] ?? wordleDisplayLength),
      );
      const guessCharacters = Array.from(attempt.guess);
      attempt.evaluation.forEach((state, index) => {
        if (index >= revealedCellCount) {
          return;
        }
        const letter = (guessCharacters[index] ?? "").toUpperCase();
        if (!letter) {
          return;
        }
        const current = map.get(letter);
        if (!current || statePriority[state] > statePriority[current]) {
          map.set(letter, state);
        }
      });
    });

    return map;
  })();
  const wordleKeyboardKeyGap = 2;
  const wordleLayoutWidth =
    wordleKeyboardContainerWidth > 0 ? wordleKeyboardContainerWidth : Math.max(260, viewportWidth - 72);
  const wordleInputCellGap = wordleDisplayLength >= 12 ? 2 : wordleDisplayLength >= 8 ? 4 : 6;
  const wordleInputActionGap = wordleDisplayLength >= 12 ? 4 : 6;
  const wordleBoardCellSize = (() => {
    const fitForMedia = Math.floor(
      (wordleLayoutWidth - wordleInputCellGap * (wordleDisplayLength - 1)) / wordleDisplayLength,
    );
    const fitForInput = Math.floor(
      (wordleLayoutWidth - wordleInputCellGap * wordleDisplayLength - wordleInputActionGap) /
        (wordleDisplayLength + 1),
    );
    const minCellSize = adaptiveScale(isTabletOverlay ? 10 : 8, 8, 13);
    const maxCellSize = adaptiveScale(isTabletOverlay ? 52 : 38, 36, 62);
    const computed = Math.min(fitForMedia, fitForInput);
    return Math.max(minCellSize, Math.min(maxCellSize, computed));
  })();
  const wordleKeyboardKeyWidth = Math.max(24, Math.floor((wordleLayoutWidth - 9 * wordleKeyboardKeyGap) / 10));
  const guessedHangmanSet = new Set(hangmanGuessedLetters);
  const hangmanSecret = isHangmanStation ? resolvePuzzleSecret(station, "hangman") : "";
  const hangmanHasWon = isHangmanStation
    ? Array.from(hangmanSecret).every(
        (character) => !isGuessableHangmanCharacter(character) || guessedHangmanSet.has(character),
      )
    : false;
  const hangmanAttemptsLeft = Math.max(0, HANGMAN_MAX_MISSES - hangmanMisses.length);
  const puzzleSourceAnswer = resolveCorrectAnswerText(station);
  const mastermindConfig = resolveMastermindConfig(mastermindDifficulty);
  const mastermindSecret = isMastermindStation ? resolveMastermindSecret(station, mastermindDifficulty) : "";
  const normalizedMastermindInput = sanitizeMastermindInput(
    mastermindInput,
    mastermindConfig.symbols,
    mastermindConfig.codeLength,
  );
  const mastermindSolved = mastermindAttempts.some((attempt) => attempt.exact === mastermindConfig.codeLength);
  const mastermindAttemptsLeft = Math.max(0, mastermindConfig.maxAttempts - mastermindAttempts.length);
  const anagramTarget = isAnagramStation ? normalizePuzzleWord(puzzleSourceAnswer || station.name) : "";
  const anagramHintSource = isAnagramStation
    ? normalizePuzzleText(puzzleSourceAnswer || station.name || "")
    : "";
  const anagramSourceWords = isAnagramStation
    ? anagramHintSource
        .split(" ")
        .map((part) => normalizeWordleSecret(part))
        .filter((part) => part.length > 0)
    : [];
  const anagramHintWordLengths = anagramSourceWords.map((part) => Array.from(part).length);
  const anagramHintWordCount =
    anagramHintWordLengths.length > 0 ? anagramHintWordLengths.length : anagramTarget.length > 0 ? 1 : 0;
  const anagramHintLettersLayout =
    anagramHintWordLengths.length > 0 ? anagramHintWordLengths.join("+") : `${Array.from(anagramTarget).length}`;
  const anagramScrambledWords =
    anagramSourceWords.length > 0
      ? anagramSourceWords.map((word, index) => scrambleWord(word, `${station.stationId}-anagram-word-${index}`))
      : [scrambleWord(anagramTarget || "SURVIVOR", `${station.stationId}-anagram-word-0`)];
  const normalizedAnagramInput = normalizePuzzleWord(anagramInput);
  const anagramAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - anagramAttempts);
  const caesarShiftValue = isCaesarStation ? resolveCaesarShift(station) : 0;
  const caesarDecoded = isCaesarStation ? resolveCaesarSecret(station) : "";
  const caesarMaxLength = Math.max(1, Array.from(caesarDecoded).length || 32);
  const normalizedCaesarInput = normalizePuzzleText(caesarInput);
  const caesarAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - caesarAttempts);
  const memoryMatchedCount = memoryDeck.filter((card) => card.matched).length;
  const memoryAllMatched = isMemoryStation && memoryDeck.length > 0 && memoryMatchedCount === memoryDeck.length;
  const simonSequence = isSimonStation ? resolveSimonSequence(station) : [];
  const simonRoundLength = isSimonStation
    ? Math.max(1, Math.min(simonTargetLength, simonSequence.length))
    : 0;
  const simonProgress = simonInput.length;
  const rebusAnswer = isRebusStation ? normalizePuzzleText(puzzleSourceAnswer || station.name || "SURVIVOR") : "";
  const normalizedRebusInput = normalizePuzzleText(rebusInput);
  const rebusAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - rebusAttempts);
  const boggleTargetWord = isBoggleStation ? resolveBoggleTarget(station) : "";
  const boggleBoardLetters = isBoggleStation ? resolveBoggleBoard(station, boggleTargetWord || "TEAM") : [];
  const boggleMaxInputLength = Math.max(3, Array.from(boggleTargetWord || "TEAM").length);
  const boggleBoardSide = Math.sqrt(boggleBoardLetters.length);
  const normalizedBoggleInput = normalizePuzzleWord(boggleInput);
  const boggleAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - boggleAttempts);
  const miniSudokuPuzzle = isMiniSudokuStation ? resolveMiniSudokuPuzzle(station) : null;
  const normalizedMiniSudokuValues = miniSudokuValues;
  const miniSudokuGridMeta = miniSudokuPuzzle ? resolveMiniSudokuGridMeta(miniSudokuPuzzle.solution.length) : null;
  const miniSudokuAttemptedValues =
    miniSudokuPuzzle && miniSudokuGridMeta
      ? resolveMiniSudokuAttemptedValues(miniSudokuPuzzle, normalizedMiniSudokuValues)
      : [];
  const miniSudokuConflictIndexes =
    miniSudokuGridMeta && miniSudokuAttemptedValues.length > 0
      ? collectMiniSudokuConflictIndexes(
          miniSudokuAttemptedValues,
          miniSudokuGridMeta.side,
          miniSudokuGridMeta.blockSide,
        )
      : [];
  const miniSudokuHasConflicts = miniSudokuConflictIndexes.length > 0;
  const miniSudokuDisplayResult = miniSudokuHasConflicts ? text.miniSudokuIncorrect : miniSudokuResult;
  const matchingPairs = isMatchingStation ? resolveMatchingPairs(station, uiLanguage) : [];
  const matchingAllRightOptions = isMatchingStation
    ? shuffleDeterministic(
        matchingPairs.map((pair) => pair.right),
        `${station.stationId}-matching-right`,
      )
    : [];
  const matchingMatchedCount = Object.keys(matchingConnections).length;
  const matchingAllMatched =
    isMatchingStation && matchingMatchedCount === matchingPairs.length && matchingPairs.length > 0;
  const matchingAttemptsLeft = Math.max(0, MEMORY_MAX_MISTAKES - matchingAttempts);
  const matchingMatchedRightSet = new Set(
    Object.values(matchingConnections).filter((value) => value.length > 0),
  );
  const matchingLeftOptions = matchingPairs.map((pair) => pair.left);
  const matchingRightOptions = matchingAllRightOptions;
  const feedbackTone: "success" | "error" | null =
    hasQuizAnswer && station.quizCorrectAnswerIndex === selectedQuizOption
      ? "success"
      : hasQuizAnswer
        ? "error"
        : null;
  const remainingTimeLabel =
    remainingTimeSeconds !== null ? formatRemainingTimeLabel(remainingTimeSeconds) : null;
  const stopwatchElapsedLabel =
    elapsedTimeSeconds !== null ? formatRemainingTimeLabel(elapsedTimeSeconds) : null;
  const timerScalePeak = 1.04 + finalTenSecondsProgress * 0.14;
  const timerMinOpacity = 0.94 - finalTenSecondsProgress * 0.18;
  const timerTextColor =
    hasTimerStarted && station.timeLimitSeconds > 0
      ? blendHexColors(EXPEDITION_THEME.textPrimary, EXPEDITION_THEME.danger, finalTenSecondsProgress)
      : EXPEDITION_THEME.textPrimary;
  const timerPulseStyle =
    hasTimerStarted && station.timeLimitSeconds > 0 && remainingTimeSeconds !== null
      ? ({
          opacity: timerPulseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [timerMinOpacity, 1],
          }),
          transform: [
            {
              scale: timerPulseAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, timerScalePeak],
              }),
            },
          ],
        } as const)
      : undefined;
  const executionTimeLabel = remainingTimeLabel ?? stopwatchElapsedLabel ?? station.timeLimitLabel;
  const shouldShowExecutionTimer = executionTimeLabel.trim().length > 0;
  const isCompletionStopwatchActive = remainingTimeLabel === null && stopwatchElapsedLabel !== null;
  const hasTimedLimit = station.timeLimitSeconds > 0;
  const isTimeExpired = hasTimedLimit && hasTimerStarted && remainingTimeSeconds !== null && remainingTimeSeconds <= 0;
  const isWordleInteractiveDisabled =
    station.status === "done" ||
    station.status === "failed" ||
    isSubmittingWordleGuess ||
    isWordleRevealAnimating ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired ||
    wordleAttemptsLeft <= 0 ||
    wordleSolved;
  const hasAudioSource = Boolean(station.quizAudioUrl?.trim());
  const isAudioOverlayControlDisabled =
    station.status === "done" ||
    station.status === "failed" ||
    isSubmittingQuizAnswer ||
    isAudioLoading ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired ||
    !hasAudioSource;
  const isAudioStopDisabled =
    isAudioOverlayControlDisabled || !hasAudioPlaybackStarted;
  const isCodeActionDisabled =
    station.status === "done" ||
    station.status === "failed" ||
    isSubmittingCode ||
    isCodeInputSuccess ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired;
  const isInteractiveLocked =
    station.status === "done" ||
    station.status === "failed" ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired;

  return {
    isClassicQuizStation,
    isAudioQuizStation,
    isWordleStation,
    isHangmanStation,
    isMastermindStation,
    isAnagramStation,
    isCaesarStation,
    isMemoryStation,
    isSimonStation,
    isRebusStation,
    isBoggleStation,
    isMiniSudokuStation,
    isMatchingStation,
    isQuizStation,
    requiresCode,
    requiresPhotoUpload,
    isNumericCodeStation,
    shouldShowQuizFallbackGraphic,
    stationImageUri,
    stationDescription,
    stationMediaHeight,
    hasTimerStarted,
    hasQuizAnswer,
    wordleSecret,
    wordleLength,
    wordleDisplayLength,
    normalizedWordleInput,
    wordleInputCharacters,
    wordleSolved,
    wordleAttemptsLeft,
    wordleKeyStateByLetter,
    wordleKeyboardKeyGap,
    wordleInputCellGap,
    wordleInputActionGap,
    wordleBoardCellSize,
    wordleKeyboardKeyWidth,
    guessedHangmanSet,
    hangmanSecret,
    hangmanHasWon,
    hangmanAttemptsLeft,
    puzzleSourceAnswer,
    mastermindSecret,
    mastermindConfig,
    normalizedMastermindInput,
    mastermindSolved,
    mastermindAttemptsLeft,
    anagramTarget,
    anagramHintWordCount,
    anagramHintLettersLayout,
    anagramScrambledWords,
    normalizedAnagramInput,
    anagramAttemptsLeft,
    caesarShiftValue,
    caesarDecoded,
    caesarMaxLength,
    normalizedCaesarInput,
    caesarAttemptsLeft,
    memoryMatchedCount,
    memoryAllMatched,
    simonSequence,
    simonRoundLength,
    simonProgress,
    rebusAnswer,
    normalizedRebusInput,
    rebusAttemptsLeft,
    boggleTargetWord,
    boggleBoardLetters,
    boggleMaxInputLength,
    boggleBoardSide,
    normalizedBoggleInput,
    boggleAttemptsLeft,
    miniSudokuPuzzle,
    normalizedMiniSudokuValues,
    miniSudokuGridMeta,
    miniSudokuAttemptedValues,
    miniSudokuConflictIndexes,
    miniSudokuHasConflicts,
    miniSudokuDisplayResult,
    matchingPairs,
    matchingMatchedCount,
    matchingAllMatched,
    matchingAttemptsLeft,
    matchingMatchedRightSet,
    matchingLeftOptions,
    matchingRightOptions,
    feedbackTone,
    executionTimeLabel,
    shouldShowExecutionTimer,
    isCompletionStopwatchActive,
    hasTimedLimit,
    isTimeExpired,
    isWordleInteractiveDisabled,
    isAudioOverlayControlDisabled,
    isAudioStopDisabled,
    isCodeActionDisabled,
    isInteractiveLocked,
    timerTextColor,
    timerPulseStyle,
  };
}

function sanitizeMastermindInput(value: string, allowedSymbols: readonly string[], codeLength: number) {
  const allowedPattern = new RegExp(`[^${allowedSymbols.join("")}]`, "g");
  return value
    .toUpperCase()
    .replace(allowedPattern, "")
    .slice(0, codeLength);
}
