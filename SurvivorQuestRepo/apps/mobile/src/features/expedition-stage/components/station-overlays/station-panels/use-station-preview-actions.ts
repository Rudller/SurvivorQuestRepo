import { Alert, Animated } from "react-native";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { MemoryCard, MatchingPair } from "../puzzle-helpers";
import type { MastermindAttempt } from "./mastermind-station-panel";
import {
  appendCaesarCharacterController,
  backspaceBoggleInputController,
  backspaceCaesarInputController,
  backspaceMastermindInputController,
  handleAnagramInputChangeController,
  handleBoggleInputChange,
  handleCaesarInputChangeController,
  handleMemoryCardPressController,
  handleMastermindAddSymbol,
  handleMastermindInputChange,
  handleMiniSudokuChangeCellController,
  handleRebusInputChangeController,
  handleSimonPressController,
  selectBoggleBoardCellController,
  submitAnagramController,
  submitBoggleController,
  submitCaesarController,
  submitHangmanGuessController,
  submitMatchingPairController,
  submitMastermindGuessController,
  submitMiniSudokuController,
  submitQuizAnswerController,
  submitRebusController,
  submitVerificationCodeController,
  submitWordleGuessController,
  triggerInvalidCodeFeedbackController,
} from "./station-controllers";
import type { WordleAttempt } from "./wordle-station-panel";

type CompleteTaskHandler = (
  stationId: string,
  completionCode: string,
  startedAt?: string,
  challengeDifficulty?: string,
) => Promise<string | null>;

type UseStationPreviewActionsArgs = {
  stationId: string;
  stationStatus: string;
  startedAt: string | null;
  onCompleteTask?: CompleteTaskHandler;
  onQuizFailed?: (stationId: string, reason?: string) => void;
  onQuizPassed?: (stationId: string) => void;
  onClose: () => void;
  showQuizOutcomePopup: (
    variant: "success" | "failed" | "timeout",
    message: string,
    onDismiss?: () => void,
  ) => void;
  isClassicQuizStation: boolean;
  isAudioQuizStation: boolean;
  isWordleStation: boolean;
  isHangmanStation: boolean;
  isMastermindStation: boolean;
  isAnagramStation: boolean;
  isCaesarStation: boolean;
  isMemoryStation: boolean;
  isSimonStation: boolean;
  isRebusStation: boolean;
  isBoggleStation: boolean;
  isMiniSudokuStation: boolean;
  isMatchingStation: boolean;
  isInteractiveLocked: boolean;
  hasTimedLimit: boolean;
  hasTimerStarted: boolean;
  isTimeExpired: boolean;
  verificationCode: string;
  selectedQuizOption: number | null;
  isSubmittingQuizAnswer: boolean;
  quizCorrectAnswerIndex?: number;
  quizFeedbackAnimation: Animated.Value;
  wordleLength: number;
  wordleSecret: string;
  wordleDisplayLength: number;
  normalizedWordleInput: string;
  wordleAttempts: WordleAttempt[];
  isSubmittingWordleGuess: boolean;
  isWordleRevealAnimating: boolean;
  guessedHangmanSet: Set<string>;
  hangmanMisses: string[];
  hangmanGuessedLetters: string[];
  hangmanSecret: string;
  isSubmittingHangmanGuess: boolean;
  normalizedMastermindInput: string;
  mastermindSecret: string;
  mastermindDifficulty: "easy" | "medium" | "hard";
  mastermindCodeLength: number;
  mastermindMaxAttempts: number;
  mastermindSymbols: readonly string[];
  mastermindSolved: boolean;
  mastermindAttemptsLeft: number;
  mastermindAttempts: MastermindAttempt[];
  isSubmittingMastermindGuess: boolean;
  normalizedAnagramInput: string;
  anagramTarget: string;
  anagramAttemptsLeft: number;
  anagramAttempts: number;
  isSubmittingAnagram: boolean;
  normalizedCaesarInput: string;
  caesarDecoded: string;
  caesarAttemptsLeft: number;
  caesarAttempts: number;
  caesarMaxLength: number;
  isSubmittingCaesar: boolean;
  memoryBusy: boolean;
  memoryAllMatched: boolean;
  memoryDeck: MemoryCard[];
  memorySelection: string[];
  isSubmittingMemory: boolean;
  simonInput: string[];
  simonRoundLength: number;
  simonSequence: string[];
  simonMistakes: number;
  simonMaxMistakes: number;
  simonInputHighlightMs: number;
  isSubmittingSimon: boolean;
  isSimonPlaybackActive: boolean;
  normalizedRebusInput: string;
  rebusAnswer: string;
  rebusAttemptsLeft: number;
  rebusAttempts: number;
  isSubmittingRebus: boolean;
  normalizedBoggleInput: string;
  boggleInput: string;
  boggleMaxInputLength: number;
  boggleAttemptsLeft: number;
  boggleBoardLetters: string[];
  boggleTargetWord: string;
  boggleAttempts: number;
  boggleBoardSide: number;
  boggleSelectedCellPath: number[];
  isSubmittingBoggle: boolean;
  hasMiniSudokuPuzzle: boolean;
  miniSudokuGridMeta: { side: number; blockSide: number } | null;
  miniSudokuAttemptedValues: string[];
  miniSudokuHasConflicts: boolean;
  isSubmittingMiniSudoku: boolean;
  matchingAllMatched: boolean;
  matchingAttemptsLeft: number;
  matchingConnections: Record<string, string>;
  matchingMatchedRightSet: Set<string>;
  matchingPairs: MatchingPair[];
  matchingAttempts: number;
  isSubmittingMatching: boolean;
  codeInputShakeAnimation: Animated.Value;
  codeInputResetTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  memoryHideTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  simonInputHighlightTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  clearSimonInputHighlight: () => void;
  playSimonTone: (buttonId: string) => Promise<void>;
  playSimonSequence: (sequence: string[]) => Promise<void>;
  runWordleRevealSequence: (attemptIndex: number, revealLength: number) => Promise<void>;
  setIsCodeInputInvalid: Dispatch<SetStateAction<boolean>>;
  setIsCodeInputSuccess: Dispatch<SetStateAction<boolean>>;
  setCodeResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingCode: Dispatch<SetStateAction<boolean>>;
  setSelectedQuizOption: Dispatch<SetStateAction<number | null>>;
  setQuizResult: Dispatch<SetStateAction<string | null>>;
  setQuizSubmitError: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingQuizAnswer: Dispatch<SetStateAction<boolean>>;
  setWordleAttempts: Dispatch<SetStateAction<WordleAttempt[]>>;
  setWordleRevealedCellCounts: Dispatch<SetStateAction<number[]>>;
  setWordleInput: Dispatch<SetStateAction<string>>;
  setWordleResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingWordleGuess: Dispatch<SetStateAction<boolean>>;
  setHangmanResult: Dispatch<SetStateAction<string | null>>;
  setHangmanGuessedLetters: Dispatch<SetStateAction<string[]>>;
  setHangmanMisses: Dispatch<SetStateAction<string[]>>;
  setIsSubmittingHangmanGuess: Dispatch<SetStateAction<boolean>>;
  setMastermindAttempts: Dispatch<SetStateAction<MastermindAttempt[]>>;
  setMastermindInput: Dispatch<SetStateAction<string>>;
  setMastermindResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingMastermindGuess: Dispatch<SetStateAction<boolean>>;
  setAnagramInput: Dispatch<SetStateAction<string>>;
  setAnagramAttempts: Dispatch<SetStateAction<number>>;
  setAnagramResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingAnagram: Dispatch<SetStateAction<boolean>>;
  setCaesarInput: Dispatch<SetStateAction<string>>;
  setCaesarAttempts: Dispatch<SetStateAction<number>>;
  setCaesarResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingCaesar: Dispatch<SetStateAction<boolean>>;
  setMemoryDeck: Dispatch<SetStateAction<MemoryCard[]>>;
  setMemorySelection: Dispatch<SetStateAction<string[]>>;
  setMemoryResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingMemory: Dispatch<SetStateAction<boolean>>;
  setMemoryBusy: Dispatch<SetStateAction<boolean>>;
  setSimonInput: Dispatch<SetStateAction<string[]>>;
  setSimonMistakes: Dispatch<SetStateAction<number>>;
  setSimonResult: Dispatch<SetStateAction<string | null>>;
  setSimonTargetLength: Dispatch<SetStateAction<number>>;
  setIsSubmittingSimon: Dispatch<SetStateAction<boolean>>;
  setSimonActiveInputButtonId: Dispatch<SetStateAction<string | null>>;
  setRebusInput: Dispatch<SetStateAction<string>>;
  setRebusAttempts: Dispatch<SetStateAction<number>>;
  setRebusResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingRebus: Dispatch<SetStateAction<boolean>>;
  setBoggleInput: Dispatch<SetStateAction<string>>;
  setBoggleSelectedCellPath: Dispatch<SetStateAction<number[]>>;
  setBoggleAttempts: Dispatch<SetStateAction<number>>;
  setBoggleResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingBoggle: Dispatch<SetStateAction<boolean>>;
  setMiniSudokuResult: Dispatch<SetStateAction<string | null>>;
  setMiniSudokuValues: Dispatch<SetStateAction<string[]>>;
  setIsSubmittingMiniSudoku: Dispatch<SetStateAction<boolean>>;
  setMatchingConnections: Dispatch<SetStateAction<Record<string, string>>>;
  setMatchingResult: Dispatch<SetStateAction<string | null>>;
  setIsSubmittingMatching: Dispatch<SetStateAction<boolean>>;
  setMatchingAttempts: Dispatch<SetStateAction<number>>;
  text: {
    alertErrorTitle: string;
    codeEnter: string;
    codeApproved: string;
    wordleEnterGuess: string;
    wordleLengthExact: (length: number) => string;
    wordleAttemptsExhausted: string;
    wordleTryAgain: string;
    wordleNoAttempts: string;
    wordleFailedPopup: string;
    wordleSolved: string;
    wordleSolvedPopup: string;
    quizCorrect: string;
    quizIncorrect: string;
    quizWrongPopup: string;
    quizSuccessPopup: string;
    hangmanEnterLetter: string;
    hangmanLetterAlreadyChecked: string;
    hangmanNoAttempts: (secret: string) => string;
    hangmanFailedPopup: string;
    hangmanGoodLetter: string;
    hangmanMiss: string;
    hangmanSolved: string;
    hangmanSolvedPopup: string;
    mastermindInvalidCode: (length: number) => string;
    mastermindNoAttempts: () => string;
    mastermindFailedPopup: string;
    mastermindFeedback: (exact: number, misplaced: number) => string;
    mastermindSolved: string;
    mastermindSolvedPopup: string;
    anagramEnter: string;
    anagramNoAttempts: string;
    anagramFailedPopup: string;
    anagramIncorrect: string;
    anagramSolved: string;
    anagramSolvedPopup: string;
    caesarEnter: string;
    caesarNoAttempts: (decoded: string) => string;
    caesarFailedPopup: string;
    caesarIncorrect: string;
    caesarSolved: string;
    caesarSolvedPopup: string;
    memorySolved: string;
    memorySolvedPopup: string;
    memoryPairFound: string;
    memoryMiss: string;
    simonWrong: string;
    simonFailedPopup: string;
    simonProgress: (current: number, total: number) => string;
    simonSolved: string;
    simonSolvedPopup: string;
    rebusEnter: string;
    rebusNoAttempts: (answer: string) => string;
    rebusFailedPopup: string;
    rebusIncorrect: string;
    rebusSolved: string;
    rebusSolvedPopup: string;
    boggleEnterMin: string;
    boggleMaxLength: (max: number) => string;
    boggleNoAttempts: (target: string) => string;
    boggleFailedPopup: string;
    boggleIncorrect: string;
    boggleSolved: string;
    boggleSolvedPopup: string;
    boggleAdjacentOnly: string;
    miniSudokuIncorrect: string;
    miniSudokuFillAll: string;
    miniSudokuSolved: string;
    miniSudokuSolvedPopup: string;
    matchingPairGood: string;
    matchingSolved: string;
    matchingSolvedPopup: string;
    matchingNoAttempts: string;
    matchingFailedPopup: string;
    matchingWrongPair: string;
  };
};

export function createStationPreviewActions(args: UseStationPreviewActionsArgs) {
  const handleQuizSubmitError = (error: string) => {
    Alert.alert(args.text.alertErrorTitle, error);
  };

  const triggerInvalidCodeFeedback = () => {
    triggerInvalidCodeFeedbackController({
      codeInputShakeAnimation: args.codeInputShakeAnimation,
      codeInputResetTimeoutRef: args.codeInputResetTimeoutRef,
      setIsCodeInputInvalid: args.setIsCodeInputInvalid,
    });
  };

  const submitVerificationCode = async () => {
    await submitVerificationCodeController({
      verificationCode: args.verificationCode,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      onClose: args.onClose,
      triggerInvalidCodeFeedback,
      setIsSubmittingCode: args.setIsSubmittingCode,
      setIsCodeInputInvalid: args.setIsCodeInputInvalid,
      setIsCodeInputSuccess: args.setIsCodeInputSuccess,
      setCodeResult: args.setCodeResult,
      text: {
        codeEnter: args.text.codeEnter,
        codeApproved: args.text.codeApproved,
      },
    });
  };

  const submitWordleGuess = async () => {
    await submitWordleGuessController({
      isWordleStation: args.isWordleStation,
      normalizedWordleInput: args.normalizedWordleInput,
      wordleLength: args.wordleLength,
      stationStatus: args.stationStatus,
      isSubmittingWordleGuess: args.isSubmittingWordleGuess,
      isWordleRevealAnimating: args.isWordleRevealAnimating,
      hasTimedLimit: args.hasTimedLimit,
      hasTimerStarted: args.hasTimerStarted,
      isTimeExpired: args.isTimeExpired,
      wordleAttempts: args.wordleAttempts,
      wordleSecret: args.wordleSecret,
      wordleDisplayLength: args.wordleDisplayLength,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      runWordleRevealSequence: args.runWordleRevealSequence,
      setWordleAttempts: args.setWordleAttempts,
      setWordleRevealedCellCounts: args.setWordleRevealedCellCounts,
      setWordleInput: args.setWordleInput,
      setQuizSubmitError: args.setQuizSubmitError,
      setWordleResult: args.setWordleResult,
      setIsSubmittingWordleGuess: args.setIsSubmittingWordleGuess,
      onSubmitError: handleQuizSubmitError,
      text: {
        wordleEnterGuess: args.text.wordleEnterGuess,
        wordleLengthExact: args.text.wordleLengthExact,
        wordleAttemptsExhausted: args.text.wordleAttemptsExhausted,
        wordleTryAgain: args.text.wordleTryAgain,
        wordleNoAttempts: args.text.wordleNoAttempts,
        wordleFailedPopup: args.text.wordleFailedPopup,
        wordleSolved: args.text.wordleSolved,
        wordleSolvedPopup: args.text.wordleSolvedPopup,
      },
    });
  };

  const submitQuizAnswer = async (index: number) => {
    await submitQuizAnswerController({
      index,
      isClassicQuizStation: args.isClassicQuizStation,
      isAudioQuizStation: args.isAudioQuizStation,
      selectedQuizOption: args.selectedQuizOption,
      isSubmittingQuizAnswer: args.isSubmittingQuizAnswer,
      stationStatus: args.stationStatus,
      hasTimedLimit: args.hasTimedLimit,
      hasTimerStarted: args.hasTimerStarted,
      isTimeExpired: args.isTimeExpired,
      quizCorrectAnswerIndex: args.quizCorrectAnswerIndex,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      quizFeedbackAnimation: args.quizFeedbackAnimation,
      setSelectedQuizOption: args.setSelectedQuizOption,
      setQuizSubmitError: args.setQuizSubmitError,
      setQuizResult: args.setQuizResult,
      setIsSubmittingQuizAnswer: args.setIsSubmittingQuizAnswer,
      onSubmitError: handleQuizSubmitError,
      text: {
        quizCorrect: args.text.quizCorrect,
        quizIncorrect: args.text.quizIncorrect,
        quizWrongPopup: args.text.quizWrongPopup,
        quizSuccessPopup: args.text.quizSuccessPopup,
      },
    });
  };

  const submitHangmanGuess = async (letterCandidate: string) => {
    await submitHangmanGuessController({
      letterCandidate,
      isHangmanStation: args.isHangmanStation,
      stationStatus: args.stationStatus,
      isSubmittingHangmanGuess: args.isSubmittingHangmanGuess,
      hasTimedLimit: args.hasTimedLimit,
      hasTimerStarted: args.hasTimerStarted,
      isTimeExpired: args.isTimeExpired,
      guessedHangmanSet: args.guessedHangmanSet,
      hangmanMisses: args.hangmanMisses,
      hangmanGuessedLetters: args.hangmanGuessedLetters,
      hangmanSecret: args.hangmanSecret,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setHangmanResult: args.setHangmanResult,
      setQuizSubmitError: args.setQuizSubmitError,
      setHangmanGuessedLetters: args.setHangmanGuessedLetters,
      setHangmanMisses: args.setHangmanMisses,
      setIsSubmittingHangmanGuess: args.setIsSubmittingHangmanGuess,
      onSubmitError: handleQuizSubmitError,
      text: {
        hangmanEnterLetter: args.text.hangmanEnterLetter,
        hangmanLetterAlreadyChecked: args.text.hangmanLetterAlreadyChecked,
        hangmanNoAttempts: args.text.hangmanNoAttempts,
        hangmanFailedPopup: args.text.hangmanFailedPopup,
        hangmanGoodLetter: args.text.hangmanGoodLetter,
        hangmanMiss: args.text.hangmanMiss,
        hangmanSolved: args.text.hangmanSolved,
        hangmanSolvedPopup: args.text.hangmanSolvedPopup,
      },
    });
  };

  const submitMastermindGuess = async () => {
    await submitMastermindGuessController({
      isMastermindStation: args.isMastermindStation,
      normalizedMastermindInput: args.normalizedMastermindInput,
      mastermindSecret: args.mastermindSecret,
      mastermindDifficulty: args.mastermindDifficulty,
      mastermindMaxAttempts: args.mastermindMaxAttempts,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingMastermindGuess: args.isSubmittingMastermindGuess,
      mastermindSolved: args.mastermindSolved,
      mastermindAttemptsLeft: args.mastermindAttemptsLeft,
      mastermindAttempts: args.mastermindAttempts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setMastermindAttempts: args.setMastermindAttempts,
      setMastermindInput: args.setMastermindInput,
      setQuizSubmitError: args.setQuizSubmitError,
      setMastermindResult: args.setMastermindResult,
      setIsSubmittingMastermindGuess: args.setIsSubmittingMastermindGuess,
      onSubmitError: handleQuizSubmitError,
      text: {
        mastermindInvalidCode: args.text.mastermindInvalidCode,
        mastermindNoAttempts: args.text.mastermindNoAttempts,
        mastermindFailedPopup: args.text.mastermindFailedPopup,
        mastermindFeedback: args.text.mastermindFeedback,
        mastermindSolved: args.text.mastermindSolved,
        mastermindSolvedPopup: args.text.mastermindSolvedPopup,
      },
    });
  };

  const submitAnagram = async () => {
    await submitAnagramController({
      isAnagramStation: args.isAnagramStation,
      normalizedAnagramInput: args.normalizedAnagramInput,
      anagramTarget: args.anagramTarget,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingAnagram: args.isSubmittingAnagram,
      anagramAttemptsLeft: args.anagramAttemptsLeft,
      anagramAttempts: args.anagramAttempts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setQuizSubmitError: args.setQuizSubmitError,
      setAnagramAttempts: args.setAnagramAttempts,
      setAnagramResult: args.setAnagramResult,
      setIsSubmittingAnagram: args.setIsSubmittingAnagram,
      onSubmitError: handleQuizSubmitError,
      text: {
        anagramEnter: args.text.anagramEnter,
        anagramNoAttempts: args.text.anagramNoAttempts,
        anagramFailedPopup: args.text.anagramFailedPopup,
        anagramIncorrect: args.text.anagramIncorrect,
        anagramSolved: args.text.anagramSolved,
        anagramSolvedPopup: args.text.anagramSolvedPopup,
      },
    });
  };

  const submitCaesar = async () => {
    await submitCaesarController({
      isCaesarStation: args.isCaesarStation,
      normalizedCaesarInput: args.normalizedCaesarInput,
      caesarDecoded: args.caesarDecoded,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingCaesar: args.isSubmittingCaesar,
      caesarAttemptsLeft: args.caesarAttemptsLeft,
      caesarAttempts: args.caesarAttempts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setQuizSubmitError: args.setQuizSubmitError,
      setCaesarAttempts: args.setCaesarAttempts,
      setCaesarResult: args.setCaesarResult,
      setIsSubmittingCaesar: args.setIsSubmittingCaesar,
      onSubmitError: handleQuizSubmitError,
      text: {
        caesarEnter: args.text.caesarEnter,
        caesarNoAttempts: args.text.caesarNoAttempts,
        caesarFailedPopup: args.text.caesarFailedPopup,
        caesarIncorrect: args.text.caesarIncorrect,
        caesarSolved: args.text.caesarSolved,
        caesarSolvedPopup: args.text.caesarSolvedPopup,
      },
    });
  };

  const handleMemoryCardPress = async (cardId: string) => {
    await handleMemoryCardPressController({
      cardId,
      isMemoryStation: args.isMemoryStation,
      isInteractiveLocked: args.isInteractiveLocked,
      memoryBusy: args.memoryBusy,
      isSubmittingMemory: args.isSubmittingMemory,
      memoryAllMatched: args.memoryAllMatched,
      memoryDeck: args.memoryDeck,
      memorySelection: args.memorySelection,
      memoryHideTimeoutRef: args.memoryHideTimeoutRef,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setMemoryDeck: args.setMemoryDeck,
      setMemorySelection: args.setMemorySelection,
      setQuizSubmitError: args.setQuizSubmitError,
      setMemoryResult: args.setMemoryResult,
      setIsSubmittingMemory: args.setIsSubmittingMemory,
      setMemoryBusy: args.setMemoryBusy,
      onSubmitError: handleQuizSubmitError,
      text: {
        memorySolved: args.text.memorySolved,
        memorySolvedPopup: args.text.memorySolvedPopup,
        memoryPairFound: args.text.memoryPairFound,
        memoryMiss: args.text.memoryMiss,
      },
    });
  };

  const handleSimonPress = async (buttonId: string) => {
    await handleSimonPressController({
      buttonId,
      isSimonStation: args.isSimonStation,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingSimon: args.isSubmittingSimon,
      isSimonPlaybackActive: args.isSimonPlaybackActive,
      simonInput: args.simonInput,
      simonRoundLength: args.simonRoundLength,
      simonSequence: args.simonSequence,
      simonMistakes: args.simonMistakes,
      simonMaxMistakes: args.simonMaxMistakes,
      simonInputHighlightMs: args.simonInputHighlightMs,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setSimonInput: args.setSimonInput,
      setSimonMistakes: args.setSimonMistakes,
      setSimonResult: args.setSimonResult,
      setQuizSubmitError: args.setQuizSubmitError,
      setSimonTargetLength: args.setSimonTargetLength,
      setIsSubmittingSimon: args.setIsSubmittingSimon,
      clearSimonInputHighlight: args.clearSimonInputHighlight,
      setSimonActiveInputButtonId: args.setSimonActiveInputButtonId,
      simonInputHighlightTimeoutRef: args.simonInputHighlightTimeoutRef,
      playSimonTone: args.playSimonTone,
      playSimonSequence: args.playSimonSequence,
      onSubmitError: handleQuizSubmitError,
      text: {
        simonWrong: args.text.simonWrong,
        simonFailedPopup: args.text.simonFailedPopup,
        simonProgress: args.text.simonProgress,
        simonSolved: args.text.simonSolved,
        simonSolvedPopup: args.text.simonSolvedPopup,
      },
    });
  };

  const submitRebus = async () => {
    await submitRebusController({
      isRebusStation: args.isRebusStation,
      normalizedRebusInput: args.normalizedRebusInput,
      rebusAnswer: args.rebusAnswer,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingRebus: args.isSubmittingRebus,
      rebusAttemptsLeft: args.rebusAttemptsLeft,
      rebusAttempts: args.rebusAttempts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setQuizSubmitError: args.setQuizSubmitError,
      setRebusAttempts: args.setRebusAttempts,
      setRebusResult: args.setRebusResult,
      setIsSubmittingRebus: args.setIsSubmittingRebus,
      onSubmitError: handleQuizSubmitError,
      text: {
        rebusEnter: args.text.rebusEnter,
        rebusNoAttempts: args.text.rebusNoAttempts,
        rebusFailedPopup: args.text.rebusFailedPopup,
        rebusIncorrect: args.text.rebusIncorrect,
        rebusSolved: args.text.rebusSolved,
        rebusSolvedPopup: args.text.rebusSolvedPopup,
      },
    });
  };

  const submitBoggle = async () => {
    await submitBoggleController({
      isBoggleStation: args.isBoggleStation,
      normalizedBoggleInput: args.normalizedBoggleInput,
      boggleMaxInputLength: args.boggleMaxInputLength,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingBoggle: args.isSubmittingBoggle,
      boggleAttemptsLeft: args.boggleAttemptsLeft,
      boggleBoardLetters: args.boggleBoardLetters,
      boggleTargetWord: args.boggleTargetWord,
      boggleAttempts: args.boggleAttempts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setQuizSubmitError: args.setQuizSubmitError,
      setBoggleAttempts: args.setBoggleAttempts,
      setBoggleResult: args.setBoggleResult,
      setIsSubmittingBoggle: args.setIsSubmittingBoggle,
      onSubmitError: handleQuizSubmitError,
      text: {
        boggleEnterMin: args.text.boggleEnterMin,
        boggleMaxLength: args.text.boggleMaxLength,
        boggleNoAttempts: args.text.boggleNoAttempts,
        boggleFailedPopup: args.text.boggleFailedPopup,
        boggleIncorrect: args.text.boggleIncorrect,
        boggleSolved: args.text.boggleSolved,
        boggleSolvedPopup: args.text.boggleSolvedPopup,
      },
    });
  };

  const selectBoggleBoardCell = (cellIndex: number) => {
    selectBoggleBoardCellController({
      cellIndex,
      isBoggleStation: args.isBoggleStation,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingBoggle: args.isSubmittingBoggle,
      boggleAttemptsLeft: args.boggleAttemptsLeft,
      boggleBoardLetters: args.boggleBoardLetters,
      boggleSelectedCellPath: args.boggleSelectedCellPath,
      boggleMaxInputLength: args.boggleMaxInputLength,
      boggleBoardSide: args.boggleBoardSide,
      setBoggleSelectedCellPath: args.setBoggleSelectedCellPath,
      setBoggleInput: args.setBoggleInput,
      setBoggleResult: args.setBoggleResult,
      setQuizSubmitError: args.setQuizSubmitError,
      text: {
        boggleAdjacentOnly: args.text.boggleAdjacentOnly,
      },
    });
  };

  const backspaceBoggleInput = () => {
    backspaceBoggleInputController({
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingBoggle: args.isSubmittingBoggle,
      boggleAttemptsLeft: args.boggleAttemptsLeft,
      setBoggleSelectedCellPath: args.setBoggleSelectedCellPath,
      setBoggleInput: args.setBoggleInput,
      setBoggleResult: args.setBoggleResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const submitMiniSudoku = async () => {
    await submitMiniSudokuController({
      isMiniSudokuStation: args.isMiniSudokuStation,
      hasMiniSudokuPuzzle: args.hasMiniSudokuPuzzle,
      miniSudokuGridMeta: args.miniSudokuGridMeta,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingMiniSudoku: args.isSubmittingMiniSudoku,
      miniSudokuAttemptedValues: args.miniSudokuAttemptedValues,
      miniSudokuHasConflicts: args.miniSudokuHasConflicts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setMiniSudokuResult: args.setMiniSudokuResult,
      setQuizSubmitError: args.setQuizSubmitError,
      setIsSubmittingMiniSudoku: args.setIsSubmittingMiniSudoku,
      onSubmitError: handleQuizSubmitError,
      text: {
        miniSudokuIncorrect: args.text.miniSudokuIncorrect,
        miniSudokuFillAll: args.text.miniSudokuFillAll,
        miniSudokuSolved: args.text.miniSudokuSolved,
        miniSudokuSolvedPopup: args.text.miniSudokuSolvedPopup,
      },
    });
  };

  const handleMiniSudokuChangeCell = (index: number, nextValue: string) => {
    handleMiniSudokuChangeCellController({
      index,
      nextValue,
      setMiniSudokuValues: args.setMiniSudokuValues,
      setMiniSudokuResult: args.setMiniSudokuResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const handleMiniSudokuSubmit = () => {
    void submitMiniSudoku();
  };

  const submitMatchingPair = async (left: string, right: string) => {
    await submitMatchingPairController({
      left,
      right,
      isMatchingStation: args.isMatchingStation,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingMatching: args.isSubmittingMatching,
      matchingAllMatched: args.matchingAllMatched,
      matchingAttemptsLeft: args.matchingAttemptsLeft,
      matchingConnections: args.matchingConnections,
      matchingMatchedRightSet: args.matchingMatchedRightSet,
      matchingPairs: args.matchingPairs,
      matchingAttempts: args.matchingAttempts,
      stationId: args.stationId,
      startedAt: args.startedAt,
      onCompleteTask: args.onCompleteTask,
      onQuizFailed: args.onQuizFailed,
      onQuizPassed: args.onQuizPassed,
      showQuizOutcomePopup: args.showQuizOutcomePopup,
      setQuizSubmitError: args.setQuizSubmitError,
      setMatchingConnections: args.setMatchingConnections,
      setMatchingResult: args.setMatchingResult,
      setIsSubmittingMatching: args.setIsSubmittingMatching,
      setMatchingAttempts: args.setMatchingAttempts,
      onSubmitError: handleQuizSubmitError,
      text: {
        matchingPairGood: args.text.matchingPairGood,
        matchingSolved: args.text.matchingSolved,
        matchingSolvedPopup: args.text.matchingSolvedPopup,
        matchingNoAttempts: args.text.matchingNoAttempts,
        matchingFailedPopup: args.text.matchingFailedPopup,
        matchingWrongPair: args.text.matchingWrongPair,
      },
    });
  };

  const handleAnagramInputChange = (value: string) => {
    handleAnagramInputChangeController({
      value,
      setAnagramInput: args.setAnagramInput,
      setAnagramResult: args.setAnagramResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const handleCaesarInputChange = (value: string) => {
    handleCaesarInputChangeController({
      value,
      caesarMaxLength: args.caesarMaxLength,
      setCaesarInput: args.setCaesarInput,
      setCaesarResult: args.setCaesarResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const appendCaesarCharacter = (character: string) => {
    appendCaesarCharacterController({
      character,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingCaesar: args.isSubmittingCaesar,
      caesarAttemptsLeft: args.caesarAttemptsLeft,
      caesarMaxLength: args.caesarMaxLength,
      setCaesarInput: args.setCaesarInput,
      setCaesarResult: args.setCaesarResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const backspaceCaesarInput = () => {
    backspaceCaesarInputController({
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingCaesar: args.isSubmittingCaesar,
      caesarAttemptsLeft: args.caesarAttemptsLeft,
      setCaesarInput: args.setCaesarInput,
      setCaesarResult: args.setCaesarResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const handleRebusInputChange = (value: string) => {
    handleRebusInputChangeController({
      value,
      setRebusInput: args.setRebusInput,
      setRebusResult: args.setRebusResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const handleBoggleInput = (value: string) => {
    handleBoggleInputChange({
      value,
      boggleMaxInputLength: args.boggleMaxInputLength,
      setBoggleInput: args.setBoggleInput,
      setBoggleSelectedCellPath: args.setBoggleSelectedCellPath,
      setBoggleResult: args.setBoggleResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const handleMastermindInput = (value: string) => {
    handleMastermindInputChange({
      value,
      mastermindSymbols: args.mastermindSymbols,
      mastermindCodeLength: args.mastermindCodeLength,
      setMastermindInput: args.setMastermindInput,
      setMastermindResult: args.setMastermindResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const addMastermindSymbol = (symbol: string) => {
    handleMastermindAddSymbol({
      symbol,
      mastermindSymbols: args.mastermindSymbols,
      mastermindCodeLength: args.mastermindCodeLength,
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingMastermindGuess: args.isSubmittingMastermindGuess,
      mastermindSolved: args.mastermindSolved,
      mastermindAttemptsLeft: args.mastermindAttemptsLeft,
      setMastermindInput: args.setMastermindInput,
      setMastermindResult: args.setMastermindResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  const backspaceMastermindInput = () => {
    backspaceMastermindInputController({
      isInteractiveLocked: args.isInteractiveLocked,
      isSubmittingMastermindGuess: args.isSubmittingMastermindGuess,
      mastermindSolved: args.mastermindSolved,
      mastermindAttemptsLeft: args.mastermindAttemptsLeft,
      setMastermindInput: args.setMastermindInput,
      setMastermindResult: args.setMastermindResult,
      setQuizSubmitError: args.setQuizSubmitError,
    });
  };

  return {
    submitVerificationCode,
    submitWordleGuess,
    submitQuizAnswer,
    submitHangmanGuess,
    submitMastermindGuess,
    submitAnagram,
    submitCaesar,
    handleMemoryCardPress,
    handleSimonPress,
    submitRebus,
    submitBoggle,
    selectBoggleBoardCell,
    backspaceBoggleInput,
    submitMiniSudoku,
    handleMiniSudokuChangeCell,
    handleMiniSudokuSubmit,
    submitMatchingPair,
    handleAnagramInputChange,
    handleCaesarInputChange,
    appendCaesarCharacter,
    backspaceCaesarInput,
    handleRebusInputChange,
    handleBoggleInput,
    handleMastermindInput,
    addMastermindSymbol,
    backspaceMastermindInput,
  };
}
