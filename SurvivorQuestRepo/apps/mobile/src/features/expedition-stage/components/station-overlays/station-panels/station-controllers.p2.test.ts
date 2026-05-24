import { Animated } from "react-native";
import {
  appendCaesarCharacterController,
  backspaceBoggleInputController,
  backspaceCaesarInputController,
  handleMemoryCardPressController,
  handleAnagramInputChangeController,
  handleBoggleInputChange,
  handleCaesarInputChangeController,
  handleMastermindAddSymbol,
  handleMastermindInputChange,
  handleMiniSudokuChangeCellController,
  handleRebusInputChangeController,
  handleSimonPressController,
  sanitizeMastermindInput,
  selectBoggleBoardCellController,
  submitAnagramController,
  submitBoggleController,
  submitCaesarController,
  submitHangmanGuessController,
  submitMastermindGuessController,
  submitMatchingPairController,
  submitMiniSudokuController,
  submitQuizAnswerController,
  submitRebusController,
  submitWordleGuessController,
} from "./station-controllers";
import type { MemoryCard } from "../puzzle-helpers";
import type { WordleAttempt } from "./wordle-station-panel";

function createStateSetter<T>(initial: T) {
  let state = initial;
  const setter = jest.fn((next: T | ((current: T) => T)) => {
    state = typeof next === "function" ? (next as (current: T) => T)(state) : next;
  });
  return {
    setter,
    getState: () => state,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("station-controllers puzzle validation coverage", () => {
  it("blocks Wordle submit when input is empty", async () => {
    const onCompleteTask = jest.fn(async () => null);
    const wordleAttemptsState = createStateSetter<WordleAttempt[]>([]);
    await submitWordleGuessController({
      isWordleStation: true,
      normalizedWordleInput: "",
      wordleLength: 5,
      stationStatus: "in-progress",
      isSubmittingWordleGuess: false,
      isWordleRevealAnimating: false,
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      wordleAttempts: [],
      wordleSecret: "APPLE",
      wordleDisplayLength: 5,
      stationId: "st-wordle",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      runWordleRevealSequence: jest.fn(async () => undefined),
      setWordleAttempts: wordleAttemptsState.setter,
      setWordleRevealedCellCounts: jest.fn(),
      setWordleInput: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setWordleResult: jest.fn(),
      setIsSubmittingWordleGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        wordleEnterGuess: "Wpisz hasło.",
        wordleLengthExact: (length: number) => `Hasło musi mieć ${length} liter.`,
        wordleAttemptsExhausted: "Brak prób.",
        wordleTryAgain: "Spróbuj ponownie.",
        wordleNoAttempts: "Koniec prób.",
        wordleFailedPopup: "Niepowodzenie.",
        wordleSolved: "Brawo!",
        wordleSolvedPopup: "Ukończono.",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
    expect(wordleAttemptsState.setter).not.toHaveBeenCalled();
  });

  it("blocks quiz submit when option was already selected", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitQuizAnswerController({
      index: 0,
      isClassicQuizStation: true,
      isAudioQuizStation: false,
      selectedQuizOption: 1,
      isSubmittingQuizAnswer: false,
      stationStatus: "in-progress",
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      quizCorrectAnswerIndex: 0,
      stationId: "st-quiz",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      quizFeedbackAnimation: new Animated.Value(0),
      setSelectedQuizOption: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setQuizResult: jest.fn(),
      setIsSubmittingQuizAnswer: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        quizCorrect: "OK",
        quizIncorrect: "NIE",
        quizWrongPopup: "Źle",
        quizSuccessPopup: "Dobrze",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Hangman submit when game is already done", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitHangmanGuessController({
      letterCandidate: "A",
      isHangmanStation: true,
      stationStatus: "done",
      isSubmittingHangmanGuess: false,
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      guessedHangmanSet: new Set<string>(),
      hangmanMisses: [],
      hangmanGuessedLetters: [],
      hangmanSecret: "A",
      stationId: "st-hangman",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setHangmanResult: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setHangmanGuessedLetters: jest.fn(),
      setHangmanMisses: jest.fn(),
      setIsSubmittingHangmanGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        hangmanEnterLetter: "Podaj literę",
        hangmanLetterAlreadyChecked: "Było",
        hangmanNoAttempts: (secret: string) => `Koniec ${secret}`,
        hangmanFailedPopup: "Przegrana",
        hangmanGoodLetter: "Trafiona",
        hangmanMiss: "Pudło",
        hangmanSolved: "Rozwiązane",
        hangmanSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Anagram submit when input is missing", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitAnagramController({
      isAnagramStation: true,
      normalizedAnagramInput: "",
      anagramTarget: "TEST",
      isInteractiveLocked: false,
      isSubmittingAnagram: false,
      anagramAttemptsLeft: 3,
      anagramAttempts: 0,
      stationId: "st-anagram",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setAnagramAttempts: jest.fn(),
      setAnagramResult: jest.fn(),
      setIsSubmittingAnagram: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        anagramEnter: "Wpisz",
        anagramNoAttempts: "Brak prób",
        anagramFailedPopup: "Przegrana",
        anagramIncorrect: "Źle",
        anagramSolved: "Dobrze",
        anagramSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Caesar submit when input is missing", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitCaesarController({
      isCaesarStation: true,
      normalizedCaesarInput: "",
      caesarDecoded: "TEST",
      isInteractiveLocked: false,
      isSubmittingCaesar: false,
      caesarAttemptsLeft: 3,
      caesarAttempts: 0,
      stationId: "st-caesar",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setCaesarAttempts: jest.fn(),
      setCaesarResult: jest.fn(),
      setIsSubmittingCaesar: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        caesarEnter: "Wpisz",
        caesarNoAttempts: (secret: string) => `Koniec ${secret}`,
        caesarFailedPopup: "Przegrana",
        caesarIncorrect: "Źle",
        caesarSolved: "Dobrze",
        caesarSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Rebus submit when input is missing", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitRebusController({
      isRebusStation: true,
      normalizedRebusInput: "",
      rebusAnswer: "HASLO",
      isInteractiveLocked: false,
      isSubmittingRebus: false,
      rebusAttemptsLeft: 3,
      rebusAttempts: 0,
      stationId: "st-rebus",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setRebusAttempts: jest.fn(),
      setRebusResult: jest.fn(),
      setIsSubmittingRebus: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        rebusEnter: "Wpisz",
        rebusNoAttempts: (answer: string) => `Koniec ${answer}`,
        rebusFailedPopup: "Przegrana",
        rebusIncorrect: "Źle",
        rebusSolved: "Dobrze",
        rebusSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Memory press when interaction is locked", async () => {
    const onCompleteTask = jest.fn(async () => null);
    const deck: MemoryCard[] = [
      { id: "c1", symbol: "A", revealed: true, matched: false },
      { id: "c2", symbol: "A", revealed: false, matched: false },
    ];
    await handleMemoryCardPressController({
      cardId: "c2",
      isMemoryStation: true,
      isInteractiveLocked: true,
      memoryBusy: false,
      isSubmittingMemory: false,
      memoryAllMatched: false,
      memoryDeck: deck,
      memorySelection: ["c1"],
      memoryHideTimeoutRef: { current: null },
      stationId: "st-memory",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setMemoryDeck: jest.fn(),
      setMemorySelection: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setMemoryResult: jest.fn(),
      setIsSubmittingMemory: jest.fn(),
      setMemoryBusy: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        memorySolved: "Rozwiązane",
        memorySolvedPopup: "Wygrana",
        memoryPairFound: "Para",
        memoryMiss: "Pudło",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Mastermind submit when code length is invalid", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitMastermindGuessController({
      isMastermindStation: true,
      normalizedMastermindInput: "AA",
      mastermindSecret: "ABCD",
      mastermindDifficulty: "medium",
      mastermindMaxAttempts: 8,
      isInteractiveLocked: false,
      isSubmittingMastermindGuess: false,
      mastermindSolved: false,
      mastermindAttemptsLeft: 10,
      mastermindAttempts: [],
      stationId: "st-mastermind",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setMastermindAttempts: jest.fn(),
      setMastermindInput: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setMastermindResult: jest.fn(),
      setIsSubmittingMastermindGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        mastermindInvalidCode: (length: number) => `Kod ${length}`,
        mastermindNoAttempts: () => "Brak prób",
        mastermindFailedPopup: "Przegrana",
        mastermindFeedback: (exact: number, misplaced: number) => `${exact}-${misplaced}`,
        mastermindSolved: "Dobrze",
        mastermindSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Simon press when playback is active", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await handleSimonPressController({
      buttonId: "1",
      isSimonStation: true,
      isInteractiveLocked: false,
      isSubmittingSimon: false,
      isSimonPlaybackActive: true,
      simonInput: [],
      simonRoundLength: 1,
      simonSequence: ["1"],
      simonMistakes: 0,
      simonMaxMistakes: 3,
      simonInputHighlightMs: 1,
      stationId: "st-simon",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setSimonInput: jest.fn(),
      setSimonMistakes: jest.fn(),
      setSimonResult: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setSimonTargetLength: jest.fn(),
      setIsSubmittingSimon: jest.fn(),
      clearSimonInputHighlight: jest.fn(),
      setSimonActiveInputButtonId: jest.fn(),
      simonInputHighlightTimeoutRef: { current: null },
      playSimonTone: jest.fn(async () => undefined),
      playSimonSequence: jest.fn(async () => undefined),
      onSubmitError: jest.fn(),
      text: {
        simonWrong: "Źle",
        simonFailedPopup: "Przegrana",
        simonProgress: (current: number, total: number) => `${current}/${total}`,
        simonSolved: "Dobrze",
        simonSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Boggle submit when word is too short", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitBoggleController({
      isBoggleStation: true,
      normalizedBoggleInput: "AB",
      boggleMaxInputLength: 8,
      isInteractiveLocked: false,
      isSubmittingBoggle: false,
      boggleAttemptsLeft: 3,
      boggleBoardLetters: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
      boggleTargetWord: "ABC",
      boggleAttempts: 0,
      stationId: "st-boggle",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setBoggleAttempts: jest.fn(),
      setBoggleResult: jest.fn(),
      setIsSubmittingBoggle: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        boggleEnterMin: "Za krótkie",
        boggleMaxLength: (max: number) => `Max ${max}`,
        boggleNoAttempts: (target: string) => `Koniec ${target}`,
        boggleFailedPopup: "Przegrana",
        boggleIncorrect: "Źle",
        boggleSolved: "Dobrze",
        boggleSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Mini Sudoku submit when there are missing values", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitMiniSudokuController({
      isMiniSudokuStation: true,
      hasMiniSudokuPuzzle: true,
      miniSudokuGridMeta: { side: 2, blockSide: 1 },
      isInteractiveLocked: false,
      isSubmittingMiniSudoku: false,
      miniSudokuAttemptedValues: ["1", "", "2", "1"],
      miniSudokuHasConflicts: false,
      stationId: "st-mini-sudoku",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setMiniSudokuResult: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setIsSubmittingMiniSudoku: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        miniSudokuIncorrect: "Błędne",
        miniSudokuFillAll: "Uzupełnij",
        miniSudokuSolved: "Dobrze",
        miniSudokuSolvedPopup: "Wygrana",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });

  it("blocks Matching submit when interaction is locked", async () => {
    const onCompleteTask = jest.fn(async () => null);
    await submitMatchingPairController({
      left: "A",
      right: "1",
      isMatchingStation: true,
      isInteractiveLocked: true,
      isSubmittingMatching: false,
      matchingAllMatched: false,
      matchingAttemptsLeft: 3,
      matchingConnections: {},
      matchingMatchedRightSet: new Set<string>(),
      matchingPairs: [{ left: "A", right: "1" }],
      matchingAttempts: 0,
      stationId: "st-matching",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setMatchingConnections: jest.fn(),
      setMatchingResult: jest.fn(),
      setIsSubmittingMatching: jest.fn(),
      setMatchingAttempts: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        matchingPairGood: "Para OK",
        matchingSolved: "Dobrze",
        matchingSolvedPopup: "Wygrana",
        matchingNoAttempts: "Brak prób",
        matchingFailedPopup: "Przegrana",
        matchingWrongPair: "Zła para",
      },
    });
    expect(onCompleteTask).not.toHaveBeenCalled();
  });
});

describe("station-controllers helper coverage", () => {
  it("sanitizes mastermind input", () => {
    expect(sanitizeMastermindInput("abxg1cdef")).toBe("ABCD");
  });

  it("updates mastermind input and clears transient messages", () => {
    const inputState = createStateSetter("");
    const resultState = createStateSetter<string | null>("old");
    const submitErrorState = createStateSetter<string | null>("err");
    handleMastermindInputChange({
      value: "ab#f9",
      mastermindSymbols: ["A", "B", "C", "D", "E", "F"],
      mastermindCodeLength: 4,
      setMastermindInput: inputState.setter,
      setMastermindResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("ABF");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("appends mastermind symbol when interactive and not solved", () => {
    const inputState = createStateSetter("A");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    handleMastermindAddSymbol({
      symbol: "b",
      mastermindSymbols: ["A", "B", "C", "D", "E", "F"],
      mastermindCodeLength: 4,
      isInteractiveLocked: false,
      isSubmittingMastermindGuess: false,
      mastermindSolved: false,
      mastermindAttemptsLeft: 2,
      setMastermindInput: inputState.setter,
      setMastermindResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("AB");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("updates anagram input and clears previous feedback", () => {
    const inputState = createStateSetter("");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    handleAnagramInputChangeController({
      value: "ANAGRAM",
      setAnagramInput: inputState.setter,
      setAnagramResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("ANAGRAM");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("limits caesar input length and clears feedback", () => {
    const inputState = createStateSetter("");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    handleCaesarInputChangeController({
      value: "ABCDEFG",
      caesarMaxLength: 4,
      setCaesarInput: inputState.setter,
      setCaesarResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("ABCD");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("appends caesar character and prevents double spaces", () => {
    const inputState = createStateSetter("AB ");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    appendCaesarCharacterController({
      character: " ",
      isInteractiveLocked: false,
      isSubmittingCaesar: false,
      caesarAttemptsLeft: 2,
      caesarMaxLength: 6,
      setCaesarInput: inputState.setter,
      setCaesarResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("AB ");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("backspaces caesar input and clears feedback", () => {
    const inputState = createStateSetter("ABC");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    backspaceCaesarInputController({
      isInteractiveLocked: false,
      isSubmittingCaesar: false,
      caesarAttemptsLeft: 2,
      setCaesarInput: inputState.setter,
      setCaesarResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("AB");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("updates rebus input and clears previous feedback", () => {
    const inputState = createStateSetter("");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    handleRebusInputChangeController({
      value: "HASLO",
      setRebusInput: inputState.setter,
      setRebusResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("HASLO");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("selects boggle cell and updates path/input", () => {
    const pathState = createStateSetter<number[]>([]);
    const inputState = createStateSetter("");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    selectBoggleBoardCellController({
      cellIndex: 0,
      isBoggleStation: true,
      isInteractiveLocked: false,
      isSubmittingBoggle: false,
      boggleAttemptsLeft: 3,
      boggleBoardLetters: ["A", "B", "C", "D"],
      boggleSelectedCellPath: [],
      boggleMaxInputLength: 5,
      boggleBoardSide: 2,
      setBoggleSelectedCellPath: pathState.setter,
      setBoggleInput: inputState.setter,
      setBoggleResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
      text: { boggleAdjacentOnly: "Sąsiad" },
    });
    expect(pathState.getState()).toEqual([0]);
    expect(inputState.getState()).toBe("A");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("backspaces boggle path/input and clears feedback", () => {
    const pathState = createStateSetter<number[]>([0, 1]);
    const inputState = createStateSetter("AB");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    backspaceBoggleInputController({
      isInteractiveLocked: false,
      isSubmittingBoggle: false,
      boggleAttemptsLeft: 3,
      setBoggleSelectedCellPath: pathState.setter,
      setBoggleInput: inputState.setter,
      setBoggleResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(pathState.getState()).toEqual([0]);
    expect(inputState.getState()).toBe("A");
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("normalizes typed boggle input and resets selected path", () => {
    const pathState = createStateSetter<number[]>([0, 1, 2]);
    const inputState = createStateSetter("");
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    handleBoggleInputChange({
      value: "a b-c",
      boggleMaxInputLength: 4,
      setBoggleInput: inputState.setter,
      setBoggleSelectedCellPath: pathState.setter,
      setBoggleResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(inputState.getState()).toBe("ABC");
    expect(pathState.getState()).toEqual([]);
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });

  it("sanitizes mini sudoku cell change and clears feedback", () => {
    const valuesState = createStateSetter(["1", "", "", ""]);
    const resultState = createStateSetter<string | null>("prev");
    const submitErrorState = createStateSetter<string | null>("err");
    handleMiniSudokuChangeCellController({
      index: 1,
      nextValue: "x7",
      setMiniSudokuValues: valuesState.setter,
      setMiniSudokuResult: resultState.setter,
      setQuizSubmitError: submitErrorState.setter,
    });
    expect(valuesState.getState()).toEqual(["1", "7", "", ""]);
    expect(resultState.getState()).toBeNull();
    expect(submitErrorState.getState()).toBeNull();
  });
});

describe("station-controllers puzzle double-submit guard", () => {
  it("guards Wordle from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitWordleGuessController>[0] = {
      isWordleStation: true,
      normalizedWordleInput: "APPLE",
      wordleLength: 5,
      stationStatus: "in-progress",
      isSubmittingWordleGuess: false,
      isWordleRevealAnimating: false,
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      wordleAttempts: [],
      wordleSecret: "APPLE",
      wordleDisplayLength: 5,
      stationId: "st-wordle",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      runWordleRevealSequence: jest.fn(async () => undefined),
      setWordleAttempts: jest.fn(),
      setWordleRevealedCellCounts: jest.fn(),
      setWordleInput: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setWordleResult: jest.fn(),
      setIsSubmittingWordleGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        wordleEnterGuess: "Wpisz hasło.",
        wordleLengthExact: (length: number) => `Hasło musi mieć ${length} liter.`,
        wordleAttemptsExhausted: "Brak prób.",
        wordleTryAgain: "Spróbuj ponownie.",
        wordleNoAttempts: "Koniec prób.",
        wordleFailedPopup: "Niepowodzenie.",
        wordleSolved: "Brawo!",
        wordleSolvedPopup: "Ukończono.",
      },
    };
    const first = submitWordleGuessController(args);
    await flushMicrotasks();
    const second = submitWordleGuessController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards quiz answer from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitQuizAnswerController>[0] = {
      index: 0,
      isClassicQuizStation: true,
      isAudioQuizStation: false,
      selectedQuizOption: null,
      isSubmittingQuizAnswer: false,
      stationStatus: "in-progress",
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      quizCorrectAnswerIndex: 0,
      stationId: "st-quiz",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      quizFeedbackAnimation: new Animated.Value(0),
      setSelectedQuizOption: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setQuizResult: jest.fn(),
      setIsSubmittingQuizAnswer: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        quizCorrect: "OK",
        quizIncorrect: "NIE",
        quizWrongPopup: "Źle",
        quizSuccessPopup: "Dobrze",
      },
    };
    const first = submitQuizAnswerController(args);
    await flushMicrotasks();
    const second = submitQuizAnswerController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Hangman from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitHangmanGuessController>[0] = {
      letterCandidate: "A",
      isHangmanStation: true,
      stationStatus: "in-progress",
      isSubmittingHangmanGuess: false,
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      guessedHangmanSet: new Set<string>(),
      hangmanMisses: [],
      hangmanGuessedLetters: [],
      hangmanSecret: "A",
      stationId: "st-hangman",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setHangmanResult: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setHangmanGuessedLetters: jest.fn(),
      setHangmanMisses: jest.fn(),
      setIsSubmittingHangmanGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        hangmanEnterLetter: "Podaj literę",
        hangmanLetterAlreadyChecked: "Było",
        hangmanNoAttempts: (secret: string) => `Koniec ${secret}`,
        hangmanFailedPopup: "Przegrana",
        hangmanGoodLetter: "Trafiona",
        hangmanMiss: "Pudło",
        hangmanSolved: "Rozwiązane",
        hangmanSolvedPopup: "Wygrana",
      },
    };
    const first = submitHangmanGuessController(args);
    await flushMicrotasks();
    const second = submitHangmanGuessController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Anagram from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitAnagramController>[0] = {
      isAnagramStation: true,
      normalizedAnagramInput: "TEST",
      anagramTarget: "TEST",
      isInteractiveLocked: false,
      isSubmittingAnagram: false,
      anagramAttemptsLeft: 3,
      anagramAttempts: 0,
      stationId: "st-anagram",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setAnagramAttempts: jest.fn(),
      setAnagramResult: jest.fn(),
      setIsSubmittingAnagram: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        anagramEnter: "Wpisz",
        anagramNoAttempts: "Brak prób",
        anagramFailedPopup: "Przegrana",
        anagramIncorrect: "Źle",
        anagramSolved: "Dobrze",
        anagramSolvedPopup: "Wygrana",
      },
    };
    const first = submitAnagramController(args);
    await flushMicrotasks();
    const second = submitAnagramController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Caesar from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitCaesarController>[0] = {
      isCaesarStation: true,
      normalizedCaesarInput: "TEST",
      caesarDecoded: "TEST",
      isInteractiveLocked: false,
      isSubmittingCaesar: false,
      caesarAttemptsLeft: 3,
      caesarAttempts: 0,
      stationId: "st-caesar",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setCaesarAttempts: jest.fn(),
      setCaesarResult: jest.fn(),
      setIsSubmittingCaesar: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        caesarEnter: "Wpisz",
        caesarNoAttempts: (secret: string) => `Koniec ${secret}`,
        caesarFailedPopup: "Przegrana",
        caesarIncorrect: "Źle",
        caesarSolved: "Dobrze",
        caesarSolvedPopup: "Wygrana",
      },
    };
    const first = submitCaesarController(args);
    await flushMicrotasks();
    const second = submitCaesarController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Rebus from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitRebusController>[0] = {
      isRebusStation: true,
      normalizedRebusInput: "HASLO",
      rebusAnswer: "HASLO",
      isInteractiveLocked: false,
      isSubmittingRebus: false,
      rebusAttemptsLeft: 3,
      rebusAttempts: 0,
      stationId: "st-rebus",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setRebusAttempts: jest.fn(),
      setRebusResult: jest.fn(),
      setIsSubmittingRebus: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        rebusEnter: "Wpisz",
        rebusNoAttempts: (answer: string) => `Koniec ${answer}`,
        rebusFailedPopup: "Przegrana",
        rebusIncorrect: "Źle",
        rebusSolved: "Dobrze",
        rebusSolvedPopup: "Wygrana",
      },
    };
    const first = submitRebusController(args);
    await flushMicrotasks();
    const second = submitRebusController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Memory from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const deck: MemoryCard[] = [
      { id: "c1", symbol: "A", revealed: true, matched: false },
      { id: "c2", symbol: "A", revealed: false, matched: false },
    ];
    const args: Parameters<typeof handleMemoryCardPressController>[0] = {
      cardId: "c2",
      isMemoryStation: true,
      isInteractiveLocked: false,
      memoryBusy: false,
      isSubmittingMemory: false,
      memoryAllMatched: false,
      memoryDeck: deck,
      memorySelection: ["c1"],
      memoryHideTimeoutRef: { current: null },
      stationId: "st-memory",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setMemoryDeck: jest.fn(),
      setMemorySelection: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setMemoryResult: jest.fn(),
      setIsSubmittingMemory: jest.fn(),
      setMemoryBusy: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        memorySolved: "Rozwiązane",
        memorySolvedPopup: "Wygrana",
        memoryPairFound: "Para",
        memoryMiss: "Pudło",
      },
    };
    const first = handleMemoryCardPressController(args);
    await flushMicrotasks();
    const second = handleMemoryCardPressController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Mastermind from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitMastermindGuessController>[0] = {
      isMastermindStation: true,
      normalizedMastermindInput: "ABCD",
      mastermindSecret: "ABCD",
      mastermindDifficulty: "medium",
      mastermindMaxAttempts: 8,
      isInteractiveLocked: false,
      isSubmittingMastermindGuess: false,
      mastermindSolved: false,
      mastermindAttemptsLeft: 10,
      mastermindAttempts: [],
      stationId: "st-mastermind",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setMastermindAttempts: jest.fn(),
      setMastermindInput: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setMastermindResult: jest.fn(),
      setIsSubmittingMastermindGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        mastermindInvalidCode: (length: number) => `Kod ${length}`,
        mastermindNoAttempts: () => "Brak prób",
        mastermindFailedPopup: "Przegrana",
        mastermindFeedback: (exact: number, misplaced: number) => `${exact}-${misplaced}`,
        mastermindSolved: "Dobrze",
        mastermindSolvedPopup: "Wygrana",
      },
    };
    const first = submitMastermindGuessController(args);
    await flushMicrotasks();
    const second = submitMastermindGuessController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Simon from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const highlightRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    const args: Parameters<typeof handleSimonPressController>[0] = {
      buttonId: "1",
      isSimonStation: true,
      isInteractiveLocked: false,
      isSubmittingSimon: false,
      isSimonPlaybackActive: false,
      simonInput: [],
      simonRoundLength: 1,
      simonSequence: ["1"],
      simonMistakes: 0,
      simonMaxMistakes: 3,
      simonInputHighlightMs: 1,
      stationId: "st-simon",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setSimonInput: jest.fn(),
      setSimonMistakes: jest.fn(),
      setSimonResult: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setSimonTargetLength: jest.fn(),
      setIsSubmittingSimon: jest.fn(),
      clearSimonInputHighlight: jest.fn(),
      setSimonActiveInputButtonId: jest.fn(),
      simonInputHighlightTimeoutRef: highlightRef,
      playSimonTone: jest.fn(async () => undefined),
      playSimonSequence: jest.fn(async () => undefined),
      onSubmitError: jest.fn(),
      text: {
        simonWrong: "Źle",
        simonFailedPopup: "Przegrana",
        simonProgress: (current: number, total: number) => `${current}/${total}`,
        simonSolved: "Dobrze",
        simonSolvedPopup: "Wygrana",
      },
    };
    const first = handleSimonPressController(args);
    await flushMicrotasks();
    const second = handleSimonPressController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
    if (highlightRef.current) {
      clearTimeout(highlightRef.current);
    }
  });

  it("guards Boggle from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitBoggleController>[0] = {
      isBoggleStation: true,
      normalizedBoggleInput: "ABC",
      boggleMaxInputLength: 8,
      isInteractiveLocked: false,
      isSubmittingBoggle: false,
      boggleAttemptsLeft: 3,
      boggleBoardLetters: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
      boggleTargetWord: "ABC",
      boggleAttempts: 0,
      stationId: "st-boggle",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setBoggleAttempts: jest.fn(),
      setBoggleResult: jest.fn(),
      setIsSubmittingBoggle: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        boggleEnterMin: "Za krótkie",
        boggleMaxLength: (max: number) => `Max ${max}`,
        boggleNoAttempts: (target: string) => `Koniec ${target}`,
        boggleFailedPopup: "Przegrana",
        boggleIncorrect: "Źle",
        boggleSolved: "Dobrze",
        boggleSolvedPopup: "Wygrana",
      },
    };
    const first = submitBoggleController(args);
    await flushMicrotasks();
    const second = submitBoggleController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Mini Sudoku from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitMiniSudokuController>[0] = {
      isMiniSudokuStation: true,
      hasMiniSudokuPuzzle: true,
      miniSudokuGridMeta: { side: 2, blockSide: 1 },
      isInteractiveLocked: false,
      isSubmittingMiniSudoku: false,
      miniSudokuAttemptedValues: ["1", "2", "2", "1"],
      miniSudokuHasConflicts: false,
      stationId: "st-mini-sudoku",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setMiniSudokuResult: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setIsSubmittingMiniSudoku: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        miniSudokuIncorrect: "Błędne",
        miniSudokuFillAll: "Uzupełnij",
        miniSudokuSolved: "Dobrze",
        miniSudokuSolvedPopup: "Wygrana",
      },
    };
    const first = submitMiniSudokuController(args);
    await flushMicrotasks();
    const second = submitMiniSudokuController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("guards Matching from double submit", async () => {
    const deferred = createDeferred<string | null>();
    const onCompleteTask = jest.fn(() => deferred.promise);
    const args: Parameters<typeof submitMatchingPairController>[0] = {
      left: "A",
      right: "1",
      isMatchingStation: true,
      isInteractiveLocked: false,
      isSubmittingMatching: false,
      matchingAllMatched: false,
      matchingAttemptsLeft: 3,
      matchingConnections: {},
      matchingMatchedRightSet: new Set<string>(),
      matchingPairs: [{ left: "A", right: "1" }],
      matchingAttempts: 0,
      stationId: "st-matching",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setMatchingConnections: jest.fn(),
      setMatchingResult: jest.fn(),
      setIsSubmittingMatching: jest.fn(),
      setMatchingAttempts: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        matchingPairGood: "Para OK",
        matchingSolved: "Dobrze",
        matchingSolvedPopup: "Wygrana",
        matchingNoAttempts: "Brak prób",
        matchingFailedPopup: "Przegrana",
        matchingWrongPair: "Zła para",
      },
    };
    const first = submitMatchingPairController(args);
    await flushMicrotasks();
    const second = submitMatchingPairController(args);
    await flushMicrotasks();
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    deferred.resolve(null);
    await first;
    await second;
  });

  it("releases Wordle lock after error and allows retry", async () => {
    const onCompleteTask = jest
      .fn<Promise<string | null>, [string, string, string?]>()
      .mockResolvedValueOnce("ERR_FIRST")
      .mockResolvedValueOnce(null);
    const args: Parameters<typeof submitWordleGuessController>[0] = {
      isWordleStation: true,
      normalizedWordleInput: "APPLE",
      wordleLength: 5,
      stationStatus: "in-progress",
      isSubmittingWordleGuess: false,
      isWordleRevealAnimating: false,
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      wordleAttempts: [],
      wordleSecret: "APPLE",
      wordleDisplayLength: 5,
      stationId: "st-wordle-retry",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed: jest.fn(),
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup: jest.fn(),
      runWordleRevealSequence: jest.fn(async () => undefined),
      setWordleAttempts: jest.fn(),
      setWordleRevealedCellCounts: jest.fn(),
      setWordleInput: jest.fn(),
      setQuizSubmitError: jest.fn(),
      setWordleResult: jest.fn(),
      setIsSubmittingWordleGuess: jest.fn(),
      onSubmitError: jest.fn(),
      text: {
        wordleEnterGuess: "Wpisz hasło.",
        wordleLengthExact: (length: number) => `Hasło musi mieć ${length} liter.`,
        wordleAttemptsExhausted: "Brak prób.",
        wordleTryAgain: "Spróbuj ponownie.",
        wordleNoAttempts: "Koniec prób.",
        wordleFailedPopup: "Niepowodzenie.",
        wordleSolved: "Brawo!",
        wordleSolvedPopup: "Ukończono.",
      },
    };

    await submitWordleGuessController(args);
    await submitWordleGuessController(args);
    expect(onCompleteTask).toHaveBeenCalledTimes(2);
  });
});
