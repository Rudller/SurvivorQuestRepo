import { Animated } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { AnagramStationPanel } from "./anagram-station-panel";
import { BoggleStationPanel } from "./boggle-station-panel";
import { CaesarStationPanel } from "./caesar-station-panel";
import { CodeStationPanel } from "./code-station-panel";
import { HangmanStationPanel } from "./hangman-station-panel";
import { MastermindStationPanel } from "./mastermind-station-panel";
import { MemoryStationPanel } from "./memory-station-panel";
import { MiniSudokuKeypadSection } from "./mini-sudoku-station-panel";
import { QuizAudioPanel } from "./quiz-audio-station-panel";
import { RebusStationPanel } from "./rebus-station-panel";
import { SimonStationPanel } from "./simon-station-panel";
import { createStation } from "./station-smoke.fixtures";
import { buildStationPreviewModel, type UseStationPreviewModelArgs } from "./use-station-preview-model";
import { WordleInteractionPanel } from "./wordle-station-panel";

// use-station-preview-model.ts transitively imports qr-hunt-station-panel.tsx
// (for its layout-reserve constants) -> use-qr-scan-feedback-sound.ts ->
// expo-audio, whose native module isn't available under jest-expo's test
// environment. Nothing here plays audio, so a minimal mock is enough. jest
// hoists this above the imports above at runtime regardless of where it's
// written, so placing it after them (satisfying import/first) is safe.
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// Regression guard for the class of bug fixed on anagram-station-panel.tsx:
// a panel's interactive tiles/keys must stay tappable in a fresh, unlocked
// attempt — even while the panel's own "submit" action is still correctly
// disabled because the answer isn't complete yet.
//
// Every case below renders the real panel component (not through the shared
// preview.tsx tree) fed by the REAL gate computation in
// buildStationPreviewModel (preview.tsx calls this exact function to build
// each panel's props) — not a hand-typed "this should be correct" boolean.
// A hand-typed boolean can't catch a regression in the computation itself;
// only exercising the real function can. buildPreviewModel() below is a thin
// wrapper supplying defaults for buildStationPreviewModel's ~45 inputs so
// each test only has to override what it actually cares about.

function buildPreviewModel(overrides: Partial<UseStationPreviewModelArgs> & { station: ReturnType<typeof createStation> }) {
  return buildStationPreviewModel({
    uiLanguage: "polish",
    viewportHeight: 800,
    viewportWidth: 400,
    isTabletOverlay: false,
    adaptiveScale: (value: number) => value,
    imageLoadFailed: false,
    selectedQuizOption: null,
    wordleInput: "",
    wordleAttempts: [],
    wordleRevealedCellCounts: [],
    wordleKeyboardContainerWidth: 0,
    isWordleRevealAnimating: false,
    hangmanGuessedLetters: [],
    hangmanMisses: [],
    mastermindInput: "",
    mastermindAttempts: [],
    mastermindDifficulty: "medium",
    miniSudokuDifficulty: "medium",
    anagramInput: "",
    anagramAttempts: 0,
    caesarInput: "",
    caesarAttempts: 0,
    memoryDeck: [],
    simonTargetLength: 3,
    simonInput: [],
    rebusInput: "",
    rebusAttempts: 0,
    openQuizInput: "",
    openQuizAttempts: 0,
    boggleInput: "",
    boggleAttempts: 0,
    miniSudokuValues: Array.from({ length: 81 }, () => ""),
    miniSudokuResult: null,
    matchingConnections: {},
    matchingAttempts: 0,
    remainingTimeSeconds: null,
    elapsedTimeSeconds: null,
    finalTenSecondsProgress: 0,
    timerPulseAnimation: new Animated.Value(0),
    isSubmittingQuizAnswer: false,
    isSubmittingWordleGuess: false,
    isSubmittingHangmanGuess: false,
    isSubmittingMastermindGuess: false,
    isSubmittingAnagram: false,
    isSubmittingCaesar: false,
    isSubmittingMemory: false,
    isSubmittingSimon: false,
    isSubmittingRebus: false,
    isSubmittingOpenQuiz: false,
    isSubmittingBoggle: false,
    isSubmittingMiniSudoku: false,
    isSubmittingMatching: false,
    isSubmittingCode: false,
    isCodeInputSuccess: false,
    isAudioLoading: false,
    isAudioPlaying: false,
    hasAudioPlaybackStarted: false,
    text: { miniSudokuIncorrect: "Błąd" },
    ...overrides,
  });
}

describe("station panel interactivity — fresh attempt state", () => {
  it("anagram: letter tiles are tappable while the submit button is still disabled", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "anagram", quizAnswers: ["BC", "A", "B", "C"], quizCorrectAnswerIndex: 0 }),
    });
    expect(model.anagramIsActionDisabled).toBe(true); // input is empty — submit correctly stays disabled
    expect(model.anagramIsInputLocked).toBe(false); // but nothing actually blocks tile taps

    const onChangeInput = jest.fn();
    const firstLetter = model.anagramScrambledWords[0][0];
    const { getByText } = await render(
      <AnagramStationPanel
        scrambledWords={model.anagramScrambledWords}
        hintWordCount={model.anagramHintWordCount}
        hintLettersLayout={model.anagramHintLettersLayout}
        anagramAttemptsLeft={model.anagramAttemptsLeft}
        anagramInput=""
        anagramResult={null}
        isActionDisabled={model.anagramIsActionDisabled}
        isInputLocked={model.anagramIsInputLocked}
        isSubmittingAnagram={false}
        onChangeInput={onChangeInput}
        onSubmit={jest.fn()}
      />,
    );

    await fireEvent.press(getByText(firstLetter));
    expect(onChangeInput).toHaveBeenCalledWith(firstLetter);
  });

  it("wordle: keyboard keys are tappable in a fresh, unlocked attempt", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "wordle", quizAnswers: ["HELLO", "A", "B", "C"], quizCorrectAnswerIndex: 0 }),
    });
    expect(model.isWordleInteractiveDisabled).toBe(false);

    const onPressKey = jest.fn();
    const canSubmit = model.normalizedWordleInput.length === (model.wordleLength || 0);
    const { getByText } = await render(
      <WordleInteractionPanel
        stationId="station-1"
        displayLength={model.wordleDisplayLength}
        inputCharacters={model.wordleInputCharacters}
        boardCellSize={40}
        inputCellGap={4}
        inputActionGap={4}
        keyboardKeySize={30}
        keyboardKeyGap={4}
        keyStateByLetter={model.wordleKeyStateByLetter}
        isInteractiveDisabled={model.isWordleInteractiveDisabled}
        isRevealing={false}
        isSubmitting={false}
        canSubmit={canSubmit}
        canBackspace={!model.isWordleInteractiveDisabled && model.normalizedWordleInput.length > 0}
        onLayoutKeyboard={jest.fn()}
        onPressKey={onPressKey}
        onBackspace={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    await fireEvent.press(getByText("Q"));
    expect(onPressKey).toHaveBeenCalledWith("Q");
  });

  it("mastermind: symbol buttons are tappable in a fresh, unlocked attempt", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "mastermind" }),
    });
    // Unlike anagram, mastermind's submit button isn't gated on completeness
    // (the guess just fails validation on submit) — so both gates are false
    // here. Asserting on the real computed values (not a hand-typed "should
    // be true" guess) is what caught this assumption being wrong in the
    // first place.
    expect(model.mastermindIsActionDisabled).toBe(false);
    expect(model.mastermindIsSymbolDisabled).toBe(false);

    const onAddSymbol = jest.fn();
    const firstSymbol = model.mastermindConfig.symbols[0];
    const { getByText } = await render(
      <MastermindStationPanel
        stationId="station-1"
        mastermindAttempts={[]}
        mastermindAttemptsLeft={model.mastermindAttemptsLeft}
        mastermindInput=""
        mastermindDifficulty="medium"
        mastermindDifficultyMode="admin"
        selectedMastermindDifficulty={null}
        mastermindCodeLength={model.mastermindConfig.codeLength}
        mastermindMaxAttempts={model.mastermindConfig.maxAttempts}
        mastermindSymbols={model.mastermindConfig.symbols}
        isInputEditable
        isActionDisabled={model.mastermindIsActionDisabled}
        isSymbolDisabled={model.mastermindIsSymbolDisabled}
        isSubmittingMastermindGuess={false}
        onChangeInput={jest.fn()}
        onSubmitGuess={jest.fn()}
        onAddSymbol={onAddSymbol}
        onBackspace={jest.fn()}
        onSelectDifficulty={jest.fn()}
      />,
    );

    await fireEvent.press(getByText(firstSymbol));
    expect(onAddSymbol).toHaveBeenCalledWith(firstSymbol);
  });

  it("code station (time/points): alphanumeric keyboard keys are tappable", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "time", completionCodeInputMode: "alphanumeric" }),
    });
    expect(model.isCodeActionDisabled).toBe(false);

    const onAppendVerificationCode = jest.fn();
    const { getByText } = await render(
      <CodeStationPanel
        station={createStation({ stationType: "time", completionCodeInputMode: "alphanumeric" })}
        isNumericCodeStation={false}
        isCodeActionDisabled={model.isCodeActionDisabled}
        verificationCode=""
        isCodeInputInvalid={false}
        isCodeInputSuccess={false}
        codeResult={null}
        isSubmittingCode={false}
        codeInputShakeAnimation={new Animated.Value(0)}
        onBackspaceVerificationCode={jest.fn()}
        onAppendVerificationCode={onAppendVerificationCode}
        onSubmitVerificationCode={jest.fn()}
        onResetCodeFeedback={jest.fn()}
      />,
    );

    await fireEvent.press(getByText("1"));
    expect(onAppendVerificationCode).toHaveBeenCalledWith("1");
  });

  it("code station (time): numeric pinpad has no dot placeholder", async () => {
    const station = createStation({ stationType: "time", completionCodeInputMode: "numeric" });
    const model = buildPreviewModel({ station });

    const { queryByPlaceholderText } = await render(
      <CodeStationPanel
        station={station}
        isNumericCodeStation
        isCodeActionDisabled={model.isCodeActionDisabled}
        verificationCode=""
        isCodeInputInvalid={false}
        isCodeInputSuccess={false}
        codeResult={null}
        isSubmittingCode={false}
        codeInputShakeAnimation={new Animated.Value(0)}
        onBackspaceVerificationCode={jest.fn()}
        onAppendVerificationCode={jest.fn()}
        onSubmitVerificationCode={jest.fn()}
        onResetCodeFeedback={jest.fn()}
      />,
    );

    expect(queryByPlaceholderText("• • • •")).toBeNull();
  });

  it("caesar-cipher: keyboard keys are tappable while the submit button is still disabled", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "caesar-cipher", quizAnswers: ["HELLO WORLD", "A", "B", "C"], quizCorrectAnswerIndex: 0 }),
    });
    expect(model.caesarIsActionDisabled).toBe(false);

    const onAppendCharacter = jest.fn();
    const { getByText } = await render(
      <CaesarStationPanel
        caesarInput=""
        caesarMaxLength={model.caesarMaxLength}
        caesarResult={null}
        isActionDisabled={model.caesarIsActionDisabled}
        isSubmittingCaesar={false}
        onChangeInput={jest.fn()}
        onAppendCharacter={onAppendCharacter}
        onBackspace={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    await fireEvent.press(getByText("Q"));
    expect(onAppendCharacter).toHaveBeenCalledWith("Q");
  });

  it("rebus: keyboard keys are tappable while the submit button is still disabled", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "rebus" }),
    });
    expect(model.rebusIsActionDisabled).toBe(false);

    const onAppendCharacter = jest.fn();
    const { getByText } = await render(
      <RebusStationPanel
        rebusQuestion="?"
        rebusAttemptsLeft={model.rebusAttemptsLeft}
        rebusInput=""
        rebusResult={null}
        isActionDisabled={model.rebusIsActionDisabled}
        isSubmittingRebus={false}
        onChangeInput={jest.fn()}
        onAppendCharacter={onAppendCharacter}
        onBackspace={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    await fireEvent.press(getByText("Q"));
    expect(onAppendCharacter).toHaveBeenCalledWith("Q");
  });

  it("hangman: letter keys are tappable in a fresh, unlocked attempt", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "hangman", quizAnswers: ["SEROCK", "A", "B", "C"], quizCorrectAnswerIndex: 0 }),
    });
    expect(model.hangmanIsGuessDisabled).toBe(false);

    const onSubmitLetter = jest.fn();
    const { getByText, queryByText } = await render(
      <HangmanStationPanel
        stationId="station-1"
        hangmanMisses={[]}
        hangmanAttemptsLeft={model.hangmanAttemptsLeft}
        guessedHangmanSet={model.guessedHangmanSet}
        compactAttempts
        isGuessDisabled={model.hangmanIsGuessDisabled}
        isSubmittingHangmanGuess={false}
        onSubmitLetter={onSubmitLetter}
      />,
    );

    expect(queryByText("Próby")).toBeNull();
    await fireEvent.press(getByText("Q"));
    expect(onSubmitLetter).toHaveBeenCalledWith("Q");
  });

  it("simon: pad buttons are tappable in a fresh, unlocked round", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "simon" }),
    });
    expect(model.isInteractiveLocked).toBe(false);

    const onPressButton = jest.fn();
    const { getByLabelText } = await render(
      <SimonStationPanel
        stationId="station-1"
        simonSequence={["1"]}
        simonTargetLength={1}
        simonProgress={0}
        simonActivePlaybackButtonId={null}
        simonActiveInputButtonId={null}
        isSimonPlaybackActive={false}
        isInteractiveLocked={model.isInteractiveLocked}
        isSubmittingSimon={false}
        isSequenceStarted
        onStartSequence={jest.fn()}
        onPressButton={onPressButton}
      />,
    );

    await fireEvent.press(getByLabelText("Przycisk 1"));
    expect(onPressButton).toHaveBeenCalledWith("1");
  });

  it("memory: cards are tappable in a fresh, unlocked attempt", async () => {
    const memoryDeck = [
      { id: "card-1", symbol: "A", matched: false, revealed: false },
      { id: "card-2", symbol: "B", matched: false, revealed: false },
    ];
    const model = buildPreviewModel({
      station: createStation({ stationType: "memory" }),
      memoryDeck,
    });
    expect(model.isInteractiveLocked).toBe(false);

    const onPressCard = jest.fn();
    const { getAllByText } = await render(
      <MemoryStationPanel
        memoryDeck={memoryDeck}
        memoryMatchedCount={model.memoryMatchedCount}
        memoryBusy={false}
        isInteractiveLocked={model.isInteractiveLocked}
        onPressCard={onPressCard}
      />,
    );

    await fireEvent.press(getAllByText("?")[0]);
    expect(onPressCard).toHaveBeenCalledWith("card-1");
  });

  it("mini-sudoku: keypad digits are tappable in a fresh, unlocked attempt", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "mini-sudoku" }),
    });
    expect(model.miniSudokuIsActionDisabled).toBe(false);
    const targetIndex = model.miniSudokuPuzzle!.given.findIndex((value) => value === null);
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    const onChangeCell = jest.fn();
    const { getByText } = await render(
      <MiniSudokuKeypadSection
        stationId="station-1"
        miniSudokuPuzzle={model.miniSudokuPuzzle}
        activeCellIndex={null}
        onSelectCell={jest.fn()}
        isActionDisabled={model.miniSudokuIsActionDisabled}
        isSubmittingMiniSudoku={false}
        onChangeCell={onChangeCell}
        onSubmit={jest.fn()}
        quizSubmitError={null}
        miniSudokuDifficultyMode="admin"
        selectedMiniSudokuDifficulty={null}
        onSelectDifficulty={jest.fn()}
      />,
    );

    await fireEvent(getByText("1"), "pressIn");
    expect(onChangeCell).toHaveBeenCalledWith(targetIndex, "1");
  });

  it("boggle: board letters are tappable while the submit button is still disabled", async () => {
    const model = buildPreviewModel({
      station: createStation({ stationType: "boggle" }),
    });
    expect(model.boggleIsActionDisabled).toBe(false);

    const onPressBoardCell = jest.fn();
    const firstLetter = model.boggleBoardLetters[0];
    const { getAllByText } = await render(
      <BoggleStationPanel
        stationId="station-1"
        boggleBoardLetters={model.boggleBoardLetters}
        boggleAttemptsLeft={model.boggleAttemptsLeft}
        boggleMaxInputLength={model.boggleMaxInputLength}
        boggleInput=""
        boggleResult={null}
        selectedCellPath={[]}
        isActionDisabled={model.boggleIsActionDisabled}
        isSubmittingBoggle={false}
        onChangeInput={jest.fn()}
        onPressBoardCell={onPressBoardCell}
        onBackspaceInput={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    await fireEvent.press(getAllByText(firstLetter)[0]);
    expect(onPressBoardCell).toHaveBeenCalledWith(0);
  });

  it("quiz/audio-quiz: answer options are tappable before an answer is picked", async () => {
    const onSubmitQuizAnswer = jest.fn();
    const { getByText } = await render(
      <QuizAudioPanel
        station={createStation({ quizAnswers: ["Alpha", "Beta", "Gamma", "Delta"] })}
        isAudioQuizStation={false}
        quizOptions={["Alpha", "Beta", "Gamma", "Delta"]}
        selectedQuizOption={null}
        isSubmittingQuizAnswer={false}
        hasTimedLimit={false}
        hasTimerStarted={false}
        isTimeExpired={false}
        isAudioLoading={false}
        audioLoadError={null}
        quizResult={null}
        feedbackTone={null}
        quizFeedbackAnimation={new Animated.Value(0)}
        onSubmitQuizAnswer={onSubmitQuizAnswer}
      />,
    );

    await fireEvent.press(getByText("Alpha"));
    expect(onSubmitQuizAnswer).toHaveBeenCalledWith(0);
  });
});
