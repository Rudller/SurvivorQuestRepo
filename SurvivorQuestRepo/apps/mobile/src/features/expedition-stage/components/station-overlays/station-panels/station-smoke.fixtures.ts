import type { StationTestViewModel } from "../types";

export function createStateSetter<T>(initial: T) {
  let state = initial;
  const setter = jest.fn((next: T | ((current: T) => T)) => {
    state = typeof next === "function" ? (next as (current: T) => T)(state) : next;
  });
  return {
    setter,
    getState: () => state,
  };
}

export async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

export const SMOKE_QUIZ_TEXT = {
  quizCorrect: "Poprawna odpowiedz",
  quizIncorrect: "Bledna odpowiedz",
  quizWrongPopup: "Nie zaliczono quizu",
  quizSuccessPopup: "Quiz zaliczony",
};

export const SMOKE_WORDLE_TEXT = {
  wordleEnterGuess: "Wpisz haslo.",
  wordleLengthExact: (length: number) => `Haslo musi miec ${length} liter.`,
  wordleAttemptsExhausted: "Brak prob.",
  wordleTryAgain: "Sprobuj ponownie.",
  wordleNoAttempts: "Koniec prob.",
  wordleFailedPopup: "Wordle niezaliczony.",
  wordleSolved: "Wordle zaliczony.",
  wordleSolvedPopup: "Wordle ukonczony.",
};

export const SMOKE_CODE_TEXT = {
  codeEnter: "Wpisz kod.",
  codeApproved: "Kod poprawny.",
};

export const SMOKE_TIMEOUT_TEXT = {
  timeoutWordle: "Koniec czasu wordle.",
  timeoutHangman: "Koniec czasu hangman.",
  timeoutMastermind: "Koniec czasu mastermind.",
  timeoutAnagram: "Koniec czasu anagram.",
  timeoutCaesar: "Koniec czasu szyfr.",
  timeoutMemory: "Koniec czasu memory.",
  timeoutSimon: "Koniec czasu simon.",
  timeoutRebus: "Koniec czasu rebus.",
  timeoutBoggle: "Koniec czasu boggle.",
  timeoutMiniSudoku: "Koniec czasu sudoku.",
  timeoutMatching: "Koniec czasu matching.",
  timeoutQuiz: "Koniec czasu quiz.",
  timeoutCodeTask: "Koniec czasu na kod.",
};

export function createStation(overrides: Partial<StationTestViewModel>): StationTestViewModel {
  return {
    stationId: "station-smoke",
    stationType: "quiz",
    completionCodeInputMode: "alphanumeric",
    completionCodeLength: 8,
    name: "Station smoke",
    typeLabel: "Quiz",
    description: "Smoke",
    imageUrl: "https://example.com/image.png",
    points: 100,
    timeLimitSeconds: 0,
    timeLimitLabel: "Bez limitu",
    quizQuestion: "Pytanie?",
    quizAnswers: ["A", "B", "C", "D"],
    quizCorrectAnswerIndex: 0,
    status: "in-progress",
    quizFailed: false,
    startedAt: null,
    ...overrides,
  };
}
