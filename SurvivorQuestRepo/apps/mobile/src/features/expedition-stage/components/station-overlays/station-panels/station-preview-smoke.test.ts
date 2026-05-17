import { Animated } from "react-native";

import {
  submitQuizAnswerController,
  submitVerificationCodeController,
  submitWordleGuessController,
} from "./station-controllers";
import {
  createStateSetter,
  SMOKE_CODE_TEXT,
  SMOKE_QUIZ_TEXT,
  SMOKE_WORDLE_TEXT,
} from "./station-smoke.fixtures";
import type { WordleAttempt } from "./wordle-station-panel";

describe("station preview smoke flows", () => {
  it("completes classic quiz submit flow", async () => {
    const selectedQuizOption = createStateSetter<number | null>(null);
    const quizResult = createStateSetter<string | null>(null);
    const quizSubmitError = createStateSetter<string | null>("old");
    const isSubmitting = createStateSetter(false);
    const onCompleteTask = jest.fn(async () => null);
    const onQuizPassed = jest.fn();
    const onQuizFailed = jest.fn();
    const showQuizOutcomePopup = jest.fn();

    await submitQuizAnswerController({
      index: 2,
      isClassicQuizStation: true,
      isAudioQuizStation: false,
      selectedQuizOption: null,
      isSubmittingQuizAnswer: false,
      stationStatus: "in-progress",
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      quizCorrectAnswerIndex: 2,
      stationId: "st-quiz",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed,
      onQuizPassed,
      showQuizOutcomePopup,
      quizFeedbackAnimation: new Animated.Value(0),
      setSelectedQuizOption: selectedQuizOption.setter,
      setQuizSubmitError: quizSubmitError.setter,
      setQuizResult: quizResult.setter,
      setIsSubmittingQuizAnswer: isSubmitting.setter,
      onSubmitError: jest.fn(),
      text: SMOKE_QUIZ_TEXT,
    });

    expect(selectedQuizOption.getState()).toBe(2);
    expect(quizResult.getState()).toBe(SMOKE_QUIZ_TEXT.quizCorrect);
    expect(quizSubmitError.getState()).toBeNull();
    expect(onCompleteTask).toHaveBeenCalledWith("st-quiz", "QUIZ", "2026-05-10T00:00:00.000Z");
    expect(onQuizPassed).toHaveBeenCalledWith("st-quiz");
    expect(onQuizFailed).not.toHaveBeenCalled();
    expect(showQuizOutcomePopup).toHaveBeenCalledWith("success", SMOKE_QUIZ_TEXT.quizSuccessPopup);
    expect(isSubmitting.setter).toHaveBeenNthCalledWith(1, true);
    expect(isSubmitting.setter).toHaveBeenNthCalledWith(2, false);
  });

  it("handles incorrect audio-quiz answer without submit", async () => {
    const selectedQuizOption = createStateSetter<number | null>(null);
    const quizResult = createStateSetter<string | null>(null);
    const onCompleteTask = jest.fn(async () => null);
    const onQuizFailed = jest.fn();
    const showQuizOutcomePopup = jest.fn();

    await submitQuizAnswerController({
      index: 0,
      isClassicQuizStation: false,
      isAudioQuizStation: true,
      selectedQuizOption: null,
      isSubmittingQuizAnswer: false,
      stationStatus: "in-progress",
      hasTimedLimit: false,
      hasTimerStarted: true,
      isTimeExpired: false,
      quizCorrectAnswerIndex: 1,
      stationId: "st-audio",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      onQuizFailed,
      onQuizPassed: jest.fn(),
      showQuizOutcomePopup,
      quizFeedbackAnimation: new Animated.Value(0),
      setSelectedQuizOption: selectedQuizOption.setter,
      setQuizSubmitError: jest.fn(),
      setQuizResult: quizResult.setter,
      setIsSubmittingQuizAnswer: jest.fn(),
      onSubmitError: jest.fn(),
      text: SMOKE_QUIZ_TEXT,
    });

    expect(selectedQuizOption.getState()).toBe(0);
    expect(quizResult.getState()).toBe(SMOKE_QUIZ_TEXT.quizIncorrect);
    expect(onCompleteTask).not.toHaveBeenCalled();
    expect(onQuizFailed).toHaveBeenCalledWith("st-audio", "quiz_incorrect_answer");
    expect(showQuizOutcomePopup).toHaveBeenCalledWith("failed", SMOKE_QUIZ_TEXT.quizWrongPopup);
  });

  it("completes wordle submit flow with backend completion", async () => {
    const wordleAttempts = createStateSetter<WordleAttempt[]>([]);
    const wordleRevealedCellCounts = createStateSetter<number[]>([]);
    const wordleInput = createStateSetter("APPLE");
    const quizSubmitError = createStateSetter<string | null>("err");
    const wordleResult = createStateSetter<string | null>(null);
    const isSubmitting = createStateSetter(false);
    const runWordleRevealSequence = jest.fn(async () => undefined);
    const onCompleteTask = jest.fn(async () => null);
    const onQuizPassed = jest.fn();
    const showQuizOutcomePopup = jest.fn();

    await submitWordleGuessController({
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
      onQuizPassed,
      showQuizOutcomePopup,
      runWordleRevealSequence,
      setWordleAttempts: wordleAttempts.setter,
      setWordleRevealedCellCounts: wordleRevealedCellCounts.setter,
      setWordleInput: wordleInput.setter,
      setQuizSubmitError: quizSubmitError.setter,
      setWordleResult: wordleResult.setter,
      setIsSubmittingWordleGuess: isSubmitting.setter,
      onSubmitError: jest.fn(),
      text: SMOKE_WORDLE_TEXT,
    });

    expect(wordleAttempts.getState()).toHaveLength(1);
    expect(wordleInput.getState()).toBe("");
    expect(quizSubmitError.getState()).toBeNull();
    expect(runWordleRevealSequence).toHaveBeenCalledWith(0, 5);
    expect(onCompleteTask).toHaveBeenCalledWith("st-wordle", "QUIZ", "2026-05-10T00:00:00.000Z");
    expect(onQuizPassed).toHaveBeenCalledWith("st-wordle");
    expect(showQuizOutcomePopup).toHaveBeenCalledWith("success", SMOKE_WORDLE_TEXT.wordleSolvedPopup);
    expect(wordleResult.getState()).toBe(SMOKE_WORDLE_TEXT.wordleSolved);
    expect(isSubmitting.setter).toHaveBeenNthCalledWith(1, true);
    expect(isSubmitting.setter).toHaveBeenNthCalledWith(2, false);
  });

  it("completes time station code submit flow", async () => {
    const isSubmittingCode = createStateSetter(false);
    const isCodeInputInvalid = createStateSetter(false);
    const isCodeInputSuccess = createStateSetter(false);
    const codeResult = createStateSetter<string | null>(null);
    const onClose = jest.fn();
    const triggerInvalidCodeFeedback = jest.fn();
    const onCompleteTask = jest.fn(async () => null);
    const showQuizOutcomePopup = jest.fn();

    await submitVerificationCodeController({
      verificationCode: "1234",
      stationId: "st-time",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      showQuizOutcomePopup,
      onClose,
      triggerInvalidCodeFeedback,
      setIsSubmittingCode: isSubmittingCode.setter,
      setIsCodeInputInvalid: isCodeInputInvalid.setter,
      setIsCodeInputSuccess: isCodeInputSuccess.setter,
      setCodeResult: codeResult.setter,
      text: SMOKE_CODE_TEXT,
    });

    expect(onCompleteTask).toHaveBeenCalledWith("st-time", "1234", "2026-05-10T00:00:00.000Z");
    expect(triggerInvalidCodeFeedback).not.toHaveBeenCalled();
    expect(isCodeInputInvalid.getState()).toBe(false);
    expect(isCodeInputSuccess.getState()).toBe(true);
    expect(codeResult.getState()).toBe(SMOKE_CODE_TEXT.codeApproved);
    expect(showQuizOutcomePopup).toHaveBeenCalledWith("success", SMOKE_CODE_TEXT.codeApproved, onClose);
    expect(isSubmittingCode.setter).toHaveBeenNthCalledWith(1, true);
    expect(isSubmittingCode.setter).toHaveBeenNthCalledWith(2, false);
  });

  it("blocks time station submit when completion code is empty", async () => {
    const codeResult = createStateSetter<string | null>(null);
    const onCompleteTask = jest.fn(async () => null);

    await submitVerificationCodeController({
      verificationCode: "   ",
      stationId: "st-time-empty",
      startedAt: "2026-05-10T00:00:00.000Z",
      onCompleteTask,
      showQuizOutcomePopup: jest.fn(),
      onClose: jest.fn(),
      triggerInvalidCodeFeedback: jest.fn(),
      setIsSubmittingCode: jest.fn(),
      setIsCodeInputInvalid: jest.fn(),
      setIsCodeInputSuccess: jest.fn(),
      setCodeResult: codeResult.setter,
      text: SMOKE_CODE_TEXT,
    });

    expect(onCompleteTask).not.toHaveBeenCalled();
    expect(codeResult.getState()).toBe(SMOKE_CODE_TEXT.codeEnter);
  });
});
