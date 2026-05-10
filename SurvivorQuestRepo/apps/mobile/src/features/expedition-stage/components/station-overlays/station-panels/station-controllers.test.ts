import { submitVerificationCodeController, submitWordleGuessController } from "./station-controllers";
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

describe("station-controllers", () => {
  it("does not submit Wordle when station timer already expired", async () => {
    const wordleAttemptsState = createStateSetter<WordleAttempt[]>([]);
    const wordleRevealedCellCountsState = createStateSetter<number[]>([]);
    const wordleInputState = createStateSetter("ABCDE");
    const quizSubmitErrorState = createStateSetter<string | null>(null);
    const wordleResultState = createStateSetter<string | null>(null);
    const submittingWordleState = createStateSetter(false);
    const onCompleteTask = jest.fn(async () => null);
    const onQuizFailed = jest.fn();
    const onQuizPassed = jest.fn();
    const showQuizOutcomePopup = jest.fn();
    const runWordleRevealSequence = jest.fn(async () => undefined);
    const onSubmitError = jest.fn();

    await submitWordleGuessController({
      isWordleStation: true,
      normalizedWordleInput: "ABCDE",
      wordleLength: 5,
      stationStatus: "in-progress",
      isSubmittingWordleGuess: false,
      isWordleRevealAnimating: false,
      hasTimedLimit: true,
      hasTimerStarted: true,
      isTimeExpired: true,
      wordleAttempts: [],
      wordleSecret: "APPLE",
      wordleDisplayLength: 5,
      stationId: "station-1",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed,
      onQuizPassed,
      showQuizOutcomePopup,
      runWordleRevealSequence,
      setWordleAttempts: wordleAttemptsState.setter,
      setWordleRevealedCellCounts: wordleRevealedCellCountsState.setter,
      setWordleInput: wordleInputState.setter,
      setQuizSubmitError: quizSubmitErrorState.setter,
      setWordleResult: wordleResultState.setter,
      setIsSubmittingWordleGuess: submittingWordleState.setter,
      onSubmitError,
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

    expect(runWordleRevealSequence).not.toHaveBeenCalled();
    expect(wordleAttemptsState.setter).not.toHaveBeenCalled();
    expect(onCompleteTask).not.toHaveBeenCalled();
    expect(onQuizFailed).not.toHaveBeenCalled();
    expect(onQuizPassed).not.toHaveBeenCalled();
    expect(showQuizOutcomePopup).not.toHaveBeenCalled();
    expect(onSubmitError).not.toHaveBeenCalled();
    expect(wordleResultState.setter).not.toHaveBeenCalled();
  });

  it("triggers invalid-code feedback for invalid completion code errors", async () => {
    const isSubmittingCodeState = createStateSetter(false);
    const isCodeInputInvalidState = createStateSetter(false);
    const isCodeInputSuccessState = createStateSetter(false);
    const codeResultState = createStateSetter<string | null>(null);
    const showQuizOutcomePopup = jest.fn();
    const triggerInvalidCodeFeedback = jest.fn();
    const onCompleteTask = jest.fn(async () => "HTTP 400");
    const onClose = jest.fn();

    await submitVerificationCodeController({
      verificationCode: "1234",
      stationId: "station-1",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      showQuizOutcomePopup,
      onClose,
      triggerInvalidCodeFeedback,
      setIsSubmittingCode: isSubmittingCodeState.setter,
      setIsCodeInputInvalid: isCodeInputInvalidState.setter,
      setIsCodeInputSuccess: isCodeInputSuccessState.setter,
      setCodeResult: codeResultState.setter,
      text: {
        codeEnter: "Wpisz kod.",
        codeApproved: "Kod poprawny.",
      },
    });

    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    expect(triggerInvalidCodeFeedback).toHaveBeenCalledTimes(1);
    expect(codeResultState.setter).toHaveBeenCalledWith(null);
    expect(showQuizOutcomePopup).not.toHaveBeenCalled();
    expect(isCodeInputSuccessState.setter).not.toHaveBeenCalledWith(true);
    expect(isSubmittingCodeState.setter).toHaveBeenNthCalledWith(1, true);
    expect(isSubmittingCodeState.setter).toHaveBeenNthCalledWith(2, false);
  });
});
