import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { Alert, Animated, Image, Keyboard, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import { AnagramMediaPanel, AnagramStationPanel } from "./station-panels/anagram-station-panel";
import { BoggleStationPanel } from "./station-panels/boggle-station-panel";
import { CaesarStationPanel } from "./station-panels/caesar-station-panel";
import { CodeStationPanel } from "./station-panels/code-station-panel";
import { HangmanStationPanel } from "./station-panels/hangman-station-panel";
import { MatchingStationPanel } from "./station-panels/matching-station-panel";
import { MastermindStationPanel, type MastermindAttempt } from "./station-panels/mastermind-station-panel";
import { MemoryStationPanel } from "./station-panels/memory-station-panel";
import { MiniSudokuStationPanel } from "./station-panels/mini-sudoku-station-panel";
import { QuizAudioPanel, resolveStationQuizPrompt } from "./station-panels/quiz-audio-station-panel";
import { RebusStationPanel } from "./station-panels/rebus-station-panel";
import { AttemptsIndicator } from "./station-panels/shared-ui";
import { SimonStationPanel } from "./station-panels/simon-station-panel";
import { WordleInteractionPanel, WordleMediaBoard, type WordleAttempt } from "./station-panels/wordle-station-panel";
import type {
  StationPreviewOverlayProps,
  StationTestType,
  StationTestViewModel,
} from "./types";

import {
  HANGMAN_MAX_MISSES,
  MASTERMIND_MAX_ATTEMPTS,
  MEMORY_MAX_MISTAKES,
  QUIZ_BRAIN_ICON_URI,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  WORDLE_MAX_ATTEMPTS,
  type MemoryCard,
  type WordleCellState,
  blendHexColors,
  buildMastermindFeedback,
  buildWordleEvaluation,
  canBuildWordFromLetters,
  canTraceWordOnBoggle,
  caesarShift,
  clamp01,
  formatRemainingTimeLabel,
  isGuessableHangmanCharacter,
  isInvalidCompletionCodeErrorMessage,
  normalizeHangmanSecret,
  normalizePuzzleText,
  normalizePuzzleWord,
  normalizeWordleSecret,
  resolveBoggleBoard,
  resolveBoggleTarget,
  resolveCaesarSecret,
  resolveCaesarShift,
  resolveCorrectAnswerText,
  resolveMatchingPairs,
  resolveMastermindSecret,
  resolveMemoryDeck,
  resolveMiniSudokuPuzzle,
  resolvePuzzleSecret,
  resolveSimonSequence,
  scrambleWord,
  shuffleDeterministic,
} from "./puzzle-helpers";

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
    stationType === "matching"
  );
}

function normalizeCarouselIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  const normalized = index % length;
  return normalized >= 0 ? normalized : normalized + length;
}

const WORDLE_REVEAL_CELL_DELAY_MS = 340;
const WORDLE_REVEAL_FINISH_BUFFER_MS = 110;
const TIMEOUT_POPUP_AUTO_CLOSE_SECONDS = 10;

type QuizOutcomePopup = {
  variant: "success" | "failed" | "timeout";
  message: string;
};

type StationPreviewText = {
  fallbackQuizOptions: string[];
  audioSourceMissing: string;
  audioLoadFailed: string;
  audioPlayFailed: string;
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
  codeEnter: string;
  codeApprovedTestMode: string;
  codeApproved: string;
  wordleEnterGuess: string;
  wordleLengthExact: (length: number) => string;
  wordleAttemptsExhausted: string;
  wordleTryAgain: string;
  wordleNoAttempts: string;
  wordleFailedPopup: string;
  wordleSolved: string;
  wordleSolvedPopup: string;
  alertErrorTitle: string;
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
  mastermindNoAttempts: (secret: string) => string;
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
  caesarShiftHint: (shift: number) => string;
  caesarAttemptsLeftLabel: string;
  memorySolved: string;
  memorySolvedPopup: string;
  memoryPairFound: string;
  memoryMiss: string;
  memoryFailedPopup: string;
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
  miniSudokuFillAll: string;
  miniSudokuNoAttempts: (solution: string) => string;
  miniSudokuFailedPopup: string;
  miniSudokuIncorrect: string;
  miniSudokuSolved: string;
  miniSudokuSolvedPopup: string;
  matchingSetLine: string;
  matchingPairGood: string;
  matchingSolved: string;
  matchingSolvedPopup: string;
  matchingNoAttempts: string;
  matchingFailedPopup: string;
  matchingWrongPair: string;
  outcomePassed: string;
  outcomeTimedOut: string;
  outcomeFailed: string;
  matchingChecking: string;
  matchingCheck: string;
  matchingAttempts: string;
  matchingMatched: string;
  taskDescriptionMissing: string;
  anagramDisplayHint: string;
  executionTimerLabel: string;
  points: string;
  backToMapNow: string;
  backToMap: string;
};

const STATION_PREVIEW_TEXT_ENGLISH: StationPreviewText = {
  fallbackQuizOptions: [
    "I verify team communication and plan.",
    "I act without consulting the team.",
    "I ignore safety rules.",
    "I split the team and lose contact.",
  ],
  audioSourceMissing: "No audio source for this station.",
  audioLoadFailed: "Failed to load audio recording.",
  audioPlayFailed: "Failed to play audio recording.",
  timeoutWordle: "Time for Wordle has expired. Task was not passed.",
  timeoutHangman: "Time for Hangman has expired. Task was not passed.",
  timeoutMastermind: "Time for Mastermind has expired. Task was not passed.",
  timeoutAnagram: "Time for anagram has expired. Task was not passed.",
  timeoutCaesar: "Time for Caesar cipher has expired. Task was not passed.",
  timeoutMemory: "Time for Memory has expired. Task was not passed.",
  timeoutSimon: "Time for Simon has expired. Task was not passed.",
  timeoutRebus: "Time for rebus has expired. Task was not passed.",
  timeoutBoggle: "Time for Boggle has expired. Task was not passed.",
  timeoutMiniSudoku: "Time for mini Sudoku has expired. Task was not passed.",
  timeoutMatching: "Time for matching pairs has expired. Task was not passed.",
  timeoutQuiz: "Time for quiz has expired. Task was not passed.",
  timeoutCodeTask: "Time to complete the task has expired. Task was not passed.",
  codeEnter: "Enter code to validate this station.",
  codeApprovedTestMode: "Code approved (test mode).",
  codeApproved: "Code approved.",
  wordleEnterGuess: "Enter a guess to check the word.",
  wordleLengthExact: (length: number) => `The word must be exactly ${length} characters long.`,
  wordleAttemptsExhausted: "All attempts have been used.",
  wordleTryAgain: "Not correct — try again.",
  wordleNoAttempts: "No attempts left. Task not passed.",
  wordleFailedPopup: "All Wordle attempts were used.",
  wordleSolved: "Great! Correct word.",
  wordleSolvedPopup: "Correct word. Task passed.",
  alertErrorTitle: "Error",
  quizCorrect: "Correct answer",
  quizIncorrect: "Wrong answer",
  quizWrongPopup: "Incorrect answer was selected.",
  quizSuccessPopup: "Correct answer. Task passed.",
  hangmanEnterLetter: "Enter one letter.",
  hangmanLetterAlreadyChecked: "This letter has already been checked.",
  hangmanNoAttempts: (secret: string) => `No attempts left. Phrase: ${secret}`,
  hangmanFailedPopup: "All Hangman attempts were used.",
  hangmanGoodLetter: "Good letter!",
  hangmanMiss: "Miss.",
  hangmanSolved: "Great! Full phrase revealed.",
  hangmanSolvedPopup: "Phrase guessed. Task passed.",
  mastermindInvalidCode: (length: number) => `Code must have ${length} symbols and use letters A-F.`,
  mastermindNoAttempts: (secret: string) => `No attempts left. Correct code: ${secret}`,
  mastermindFailedPopup: "Mastermind attempts were exhausted.",
  mastermindFeedback: (exact: number, misplaced: number) =>
    `Exact: ${exact}, misplaced: ${misplaced}.`,
  mastermindSolved: "Great! Code guessed.",
  mastermindSolvedPopup: "Code guessed. Task passed.",
  anagramEnter: "Enter the anagram solution.",
  anagramNoAttempts: "No attempts left. Task not passed.",
  anagramFailedPopup: "Failed to solve the anagram.",
  anagramIncorrect: "Incorrect. Try again.",
  anagramSolved: "Great! Anagram solved.",
  anagramSolvedPopup: "Anagram solved correctly.",
  caesarEnter: "Enter decrypted phrase.",
  caesarNoAttempts: (decoded: string) => `No attempts left. Correct phrase: ${decoded}`,
  caesarFailedPopup: "Failed to decrypt the phrase.",
  caesarIncorrect: "Incorrect. Check the shift and try again.",
  caesarSolved: "Great! Phrase decrypted.",
  caesarSolvedPopup: "Caesar cipher solved correctly.",
  caesarShiftHint: (shift: number) => `Hint: shift +${shift}`,
  caesarAttemptsLeftLabel: "Attempts left",
  memorySolved: "Great! All pairs found.",
  memorySolvedPopup: "Memory game completed.",
  memoryPairFound: "Good! Pair found.",
  memoryMiss: "Miss. Try to memorize positions.",
  memoryFailedPopup: "Too many wrong attempts in Memory.",
  simonWrong: "Wrong sequence.",
  simonFailedPopup: "Simon sequence was interrupted.",
  simonProgress: (current: number, total: number) => `Good! Progress: ${current}/${total}`,
  simonSolved: "Great! Correct sequence.",
  simonSolvedPopup: "Simon sequence reproduced correctly.",
  rebusEnter: "Enter rebus solution.",
  rebusNoAttempts: (answer: string) => `No attempts left. Correct answer: ${answer}`,
  rebusFailedPopup: "Failed to solve the rebus.",
  rebusIncorrect: "Incorrect. Try again.",
  rebusSolved: "Great! Rebus solved.",
  rebusSolvedPopup: "Rebus solved correctly.",
  boggleEnterMin: "Enter a word (minimum 3 letters).",
  boggleMaxLength: (max: number) => `The word can have up to ${max} letters.`,
  boggleNoAttempts: (target: string) => `No attempts left. Target word: ${target}`,
  boggleFailedPopup: "No correct word found in Boggle.",
  boggleIncorrect: "This is not the target word. Try again.",
  boggleSolved: "Great! Word found.",
  boggleSolvedPopup: "Boggle solved correctly.",
  boggleAdjacentOnly: "Choose adjacent cells only (including diagonals).",
  miniSudokuFillAll: "Fill all fields with values 1 or 2.",
  miniSudokuNoAttempts: (solution: string) => `No attempts left. Correct layout: ${solution}`,
  miniSudokuFailedPopup: "Failed to solve mini Sudoku.",
  miniSudokuIncorrect: "Layout is incorrect. Check rows and columns.",
  miniSudokuSolved: "Great! Mini Sudoku solved.",
  miniSudokuSolvedPopup: "Mini Sudoku solved correctly.",
  matchingSetLine: "Set items on both sides on the center line.",
  matchingPairGood: "Good! Pair matched.",
  matchingSolved: "Great! All pairs matched.",
  matchingSolvedPopup: "Matching task completed.",
  matchingNoAttempts: "No attempts left.",
  matchingFailedPopup: "Too many incorrect matches.",
  matchingWrongPair: "This is not a correct pair.",
  outcomePassed: "Passed",
  outcomeTimedOut: "Time expired",
  outcomeFailed: "Failed",
  matchingChecking: "Checking...",
  matchingCheck: "Check",
  matchingAttempts: "Attempts",
  matchingMatched: "Matched",
  taskDescriptionMissing: "Task description has not been added yet.",
  anagramDisplayHint: "Jumbled text is displayed word by word, each in a separate row.",
  executionTimerLabel: "Time left to complete task",
  points: "Points",
  backToMapNow: "Back to map now",
  backToMap: "Back to map",
};

const STATION_PREVIEW_TEXT_UKRAINIAN: StationPreviewText = {
  fallbackQuizOptions: [
    "Я перевіряю комунікацію та план команди.",
    "Я дію без консультації з командою.",
    "Я ігнорую правила безпеки.",
    "Я розділяю команду і втрачаю контакт.",
  ],
  audioSourceMissing: "Для цієї станції немає джерела аудіо.",
  audioLoadFailed: "Не вдалося завантажити аудіозапис.",
  audioPlayFailed: "Не вдалося відтворити аудіозапис.",
  timeoutWordle: "Час для Wordle вичерпано. Завдання не зараховано.",
  timeoutHangman: "Час для Шибениці вичерпано. Завдання не зараховано.",
  timeoutMastermind: "Час для Mastermind вичерпано. Завдання не зараховано.",
  timeoutAnagram: "Час для анаграми вичерпано. Завдання не зараховано.",
  timeoutCaesar: "Час для шифру Цезаря вичерпано. Завдання не зараховано.",
  timeoutMemory: "Час для Memory вичерпано. Завдання не зараховано.",
  timeoutSimon: "Час для Simon вичерпано. Завдання не зараховано.",
  timeoutRebus: "Час для ребуса вичерпано. Завдання не зараховано.",
  timeoutBoggle: "Час для Boggle вичерпано. Завдання не зараховано.",
  timeoutMiniSudoku: "Час для міні Sudoku вичерпано. Завдання не зараховано.",
  timeoutMatching: "Час для поєднання пар вичерпано. Завдання не зараховано.",
  timeoutQuiz: "Час для вікторини вичерпано. Завдання не зараховано.",
  timeoutCodeTask: "Час на виконання завдання вичерпано. Завдання не зараховано.",
  codeEnter: "Введіть код, щоб підтвердити цю станцію.",
  codeApprovedTestMode: "Код підтверджено (тестовий режим).",
  codeApproved: "Код підтверджено.",
  wordleEnterGuess: "Введіть спробу, щоб перевірити слово.",
  wordleLengthExact: (length: number) => `Слово має містити рівно ${length} символів.`,
  wordleAttemptsExhausted: "Усі спроби використано.",
  wordleTryAgain: "Неправильно — спробуйте ще раз.",
  wordleNoAttempts: "Спроб не залишилося. Завдання не зараховано.",
  wordleFailedPopup: "Усі спроби Wordle використано.",
  wordleSolved: "Чудово! Правильне слово.",
  wordleSolvedPopup: "Правильне слово. Завдання зараховано.",
  alertErrorTitle: "Помилка",
  quizCorrect: "Правильна відповідь",
  quizIncorrect: "Неправильна відповідь",
  quizWrongPopup: "Вибрано неправильну відповідь.",
  quizSuccessPopup: "Правильна відповідь. Завдання зараховано.",
  hangmanEnterLetter: "Введіть одну літеру.",
  hangmanLetterAlreadyChecked: "Цю літеру вже перевіряли.",
  hangmanNoAttempts: (secret: string) => `Спроб не залишилося. Фраза: ${secret}`,
  hangmanFailedPopup: "Усі спроби у Шибениці використано.",
  hangmanGoodLetter: "Добра літера!",
  hangmanMiss: "Промах.",
  hangmanSolved: "Чудово! Усю фразу відкрито.",
  hangmanSolvedPopup: "Фразу вгадано. Завдання зараховано.",
  mastermindInvalidCode: (length: number) =>
    `Код має містити ${length} символів і використовувати літери A-F.`,
  mastermindNoAttempts: (secret: string) => `Спроб не залишилося. Правильний код: ${secret}`,
  mastermindFailedPopup: "Спроби в Mastermind вичерпано.",
  mastermindFeedback: (exact: number, misplaced: number) =>
    `Точних: ${exact}, не на місці: ${misplaced}.`,
  mastermindSolved: "Чудово! Код вгадано.",
  mastermindSolvedPopup: "Код вгадано. Завдання зараховано.",
  anagramEnter: "Введіть розв'язок анаграми.",
  anagramNoAttempts: "Спроб не залишилося. Завдання не зараховано.",
  anagramFailedPopup: "Не вдалося розв'язати анаграму.",
  anagramIncorrect: "Неправильно. Спробуйте ще раз.",
  anagramSolved: "Чудово! Анаграму розв'язано.",
  anagramSolvedPopup: "Анаграму розв'язано правильно.",
  caesarEnter: "Введіть розшифровану фразу.",
  caesarNoAttempts: (decoded: string) => `Спроб не залишилося. Правильна фраза: ${decoded}`,
  caesarFailedPopup: "Не вдалося розшифрувати фразу.",
  caesarIncorrect: "Неправильно. Перевірте зсув і спробуйте ще раз.",
  caesarSolved: "Чудово! Фразу розшифровано.",
  caesarSolvedPopup: "Шифр Цезаря розв'язано правильно.",
  caesarShiftHint: (shift: number) => `Підказка: зсув +${shift}`,
  caesarAttemptsLeftLabel: "Залишилось спроб",
  memorySolved: "Чудово! Усі пари знайдено.",
  memorySolvedPopup: "Гру Memory завершено.",
  memoryPairFound: "Добре! Пару знайдено.",
  memoryMiss: "Промах. Спробуйте запам'ятати позиції.",
  memoryFailedPopup: "Забагато помилкових спроб у Memory.",
  simonWrong: "Неправильна послідовність.",
  simonFailedPopup: "Послідовність Simon перервано.",
  simonProgress: (current: number, total: number) => `Добре! Прогрес: ${current}/${total}`,
  simonSolved: "Чудово! Правильна послідовність.",
  simonSolvedPopup: "Послідовність Simon відтворено правильно.",
  rebusEnter: "Введіть розв'язок ребуса.",
  rebusNoAttempts: (answer: string) => `Спроб не залишилося. Правильна відповідь: ${answer}`,
  rebusFailedPopup: "Не вдалося розв'язати ребус.",
  rebusIncorrect: "Неправильно. Спробуйте ще раз.",
  rebusSolved: "Чудово! Ребус розв'язано.",
  rebusSolvedPopup: "Ребус розв'язано правильно.",
  boggleEnterMin: "Введіть слово (мінімум 3 літери).",
  boggleMaxLength: (max: number) => `Слово може містити максимум ${max} літер.`,
  boggleNoAttempts: (target: string) => `Спроб не залишилося. Цільове слово: ${target}`,
  boggleFailedPopup: "У Boggle не знайдено правильного слова.",
  boggleIncorrect: "Це не цільове слово. Спробуйте ще раз.",
  boggleSolved: "Чудово! Слово знайдено.",
  boggleSolvedPopup: "Boggle розв'язано правильно.",
  boggleAdjacentOnly: "Обирайте лише сусідні клітинки (включно з діагоналями).",
  miniSudokuFillAll: "Заповніть усі поля значеннями 1 або 2.",
  miniSudokuNoAttempts: (solution: string) => `Спроб не залишилося. Правильний розклад: ${solution}`,
  miniSudokuFailedPopup: "Не вдалося розв'язати міні Sudoku.",
  miniSudokuIncorrect: "Розклад неправильний. Перевірте рядки та стовпці.",
  miniSudokuSolved: "Чудово! Міні Sudoku розв'язано.",
  miniSudokuSolvedPopup: "Міні Sudoku розв'язано правильно.",
  matchingSetLine: "Розташуйте елементи з обох боків на центральній лінії.",
  matchingPairGood: "Добре! Пару поєднано.",
  matchingSolved: "Чудово! Усі пари поєднано.",
  matchingSolvedPopup: "Завдання на поєднання пар виконано.",
  matchingNoAttempts: "Спроб не залишилося.",
  matchingFailedPopup: "Забагато неправильних поєднань.",
  matchingWrongPair: "Це неправильна пара.",
  outcomePassed: "Зараховано",
  outcomeTimedOut: "Час вичерпано",
  outcomeFailed: "Не зараховано",
  matchingChecking: "Перевірка...",
  matchingCheck: "Перевірити",
  matchingAttempts: "Спроби",
  matchingMatched: "Поєднано",
  taskDescriptionMissing: "Опис завдання ще не додано.",
  anagramDisplayHint:
    "Перемішаний текст відображається слово за словом, кожне в окремому рядку.",
  executionTimerLabel: "Час до завершення завдання",
  points: "Бали",
  backToMapNow: "Повернутися до мапи зараз",
  backToMap: "Повернутися до мапи",
};

const STATION_PREVIEW_TEXT_RUSSIAN: StationPreviewText = {
  fallbackQuizOptions: [
    "Я проверяю коммуникацию и план команды.",
    "Я действую без консультации с командой.",
    "Я игнорирую правила безопасности.",
    "Я разделяю команду и теряю контакт.",
  ],
  audioSourceMissing: "Для этой станции нет источника аудио.",
  audioLoadFailed: "Не удалось загрузить аудиозапись.",
  audioPlayFailed: "Не удалось воспроизвести аудиозапись.",
  timeoutWordle: "Время для Wordle истекло. Задание не зачтено.",
  timeoutHangman: "Время для Виселицы истекло. Задание не зачтено.",
  timeoutMastermind: "Время для Mastermind истекло. Задание не зачтено.",
  timeoutAnagram: "Время для анаграммы истекло. Задание не зачтено.",
  timeoutCaesar: "Время для шифра Цезаря истекло. Задание не зачтено.",
  timeoutMemory: "Время для Memory истекло. Задание не зачтено.",
  timeoutSimon: "Время для Simon истекло. Задание не зачтено.",
  timeoutRebus: "Время для ребуса истекло. Задание не зачтено.",
  timeoutBoggle: "Время для Boggle истекло. Задание не зачтено.",
  timeoutMiniSudoku: "Время для мини Sudoku истекло. Задание не зачтено.",
  timeoutMatching: "Время для сопоставления пар истекло. Задание не зачтено.",
  timeoutQuiz: "Время для викторины истекло. Задание не зачтено.",
  timeoutCodeTask: "Время на выполнение задания истекло. Задание не зачтено.",
  codeEnter: "Введите код, чтобы подтвердить эту станцию.",
  codeApprovedTestMode: "Код подтвержден (тестовый режим).",
  codeApproved: "Код подтвержден.",
  wordleEnterGuess: "Введите попытку, чтобы проверить слово.",
  wordleLengthExact: (length: number) => `Слово должно содержать ровно ${length} символов.`,
  wordleAttemptsExhausted: "Все попытки использованы.",
  wordleTryAgain: "Неверно — попробуйте ещё раз.",
  wordleNoAttempts: "Попыток не осталось. Задание не зачтено.",
  wordleFailedPopup: "Все попытки Wordle использованы.",
  wordleSolved: "Отлично! Правильное слово.",
  wordleSolvedPopup: "Правильное слово. Задание зачтено.",
  alertErrorTitle: "Ошибка",
  quizCorrect: "Правильный ответ",
  quizIncorrect: "Неправильный ответ",
  quizWrongPopup: "Выбран неправильный ответ.",
  quizSuccessPopup: "Правильный ответ. Задание зачтено.",
  hangmanEnterLetter: "Введите одну букву.",
  hangmanLetterAlreadyChecked: "Эта буква уже проверялась.",
  hangmanNoAttempts: (secret: string) => `Попыток не осталось. Фраза: ${secret}`,
  hangmanFailedPopup: "Все попытки в Виселице использованы.",
  hangmanGoodLetter: "Хорошая буква!",
  hangmanMiss: "Промах.",
  hangmanSolved: "Отлично! Вся фраза открыта.",
  hangmanSolvedPopup: "Фраза угадана. Задание зачтено.",
  mastermindInvalidCode: (length: number) =>
    `Код должен содержать ${length} символов и использовать буквы A-F.`,
  mastermindNoAttempts: (secret: string) => `Попыток не осталось. Правильный код: ${secret}`,
  mastermindFailedPopup: "Попытки в Mastermind исчерпаны.",
  mastermindFeedback: (exact: number, misplaced: number) =>
    `Точных: ${exact}, не на месте: ${misplaced}.`,
  mastermindSolved: "Отлично! Код угадан.",
  mastermindSolvedPopup: "Код угадан. Задание зачтено.",
  anagramEnter: "Введите решение анаграммы.",
  anagramNoAttempts: "Попыток не осталось. Задание не зачтено.",
  anagramFailedPopup: "Не удалось решить анаграмму.",
  anagramIncorrect: "Неправильно. Попробуйте ещё раз.",
  anagramSolved: "Отлично! Анаграмма решена.",
  anagramSolvedPopup: "Анаграмма решена правильно.",
  caesarEnter: "Введите расшифрованную фразу.",
  caesarNoAttempts: (decoded: string) => `Попыток не осталось. Правильная фраза: ${decoded}`,
  caesarFailedPopup: "Не удалось расшифровать фразу.",
  caesarIncorrect: "Неправильно. Проверьте сдвиг и попробуйте ещё раз.",
  caesarSolved: "Отлично! Фраза расшифрована.",
  caesarSolvedPopup: "Шифр Цезаря решен правильно.",
  caesarShiftHint: (shift: number) => `Подсказка: сдвиг +${shift}`,
  caesarAttemptsLeftLabel: "Осталось попыток",
  memorySolved: "Отлично! Все пары найдены.",
  memorySolvedPopup: "Игра Memory завершена.",
  memoryPairFound: "Хорошо! Пара найдена.",
  memoryMiss: "Промах. Постарайтесь запомнить позиции.",
  memoryFailedPopup: "Слишком много неверных попыток в Memory.",
  simonWrong: "Неверная последовательность.",
  simonFailedPopup: "Последовательность Simon прервана.",
  simonProgress: (current: number, total: number) => `Хорошо! Прогресс: ${current}/${total}`,
  simonSolved: "Отлично! Правильная последовательность.",
  simonSolvedPopup: "Последовательность Simon воспроизведена правильно.",
  rebusEnter: "Введите решение ребуса.",
  rebusNoAttempts: (answer: string) => `Попыток не осталось. Правильный ответ: ${answer}`,
  rebusFailedPopup: "Не удалось решить ребус.",
  rebusIncorrect: "Неправильно. Попробуйте ещё раз.",
  rebusSolved: "Отлично! Ребус решен.",
  rebusSolvedPopup: "Ребус решен правильно.",
  boggleEnterMin: "Введите слово (минимум 3 буквы).",
  boggleMaxLength: (max: number) => `Слово может содержать максимум ${max} букв.`,
  boggleNoAttempts: (target: string) => `Попыток не осталось. Целевое слово: ${target}`,
  boggleFailedPopup: "В Boggle не найдено правильное слово.",
  boggleIncorrect: "Это не целевое слово. Попробуйте ещё раз.",
  boggleSolved: "Отлично! Слово найдено.",
  boggleSolvedPopup: "Boggle решен правильно.",
  boggleAdjacentOnly: "Выбирайте только соседние клетки (включая диагонали).",
  miniSudokuFillAll: "Заполните все поля значениями 1 или 2.",
  miniSudokuNoAttempts: (solution: string) => `Попыток не осталось. Правильная раскладка: ${solution}`,
  miniSudokuFailedPopup: "Не удалось решить мини Sudoku.",
  miniSudokuIncorrect: "Раскладка неверна. Проверьте строки и столбцы.",
  miniSudokuSolved: "Отлично! Мини Sudoku решен.",
  miniSudokuSolvedPopup: "Мини Sudoku решен правильно.",
  matchingSetLine: "Расположите элементы с обеих сторон на центральной линии.",
  matchingPairGood: "Хорошо! Пара совпала.",
  matchingSolved: "Отлично! Все пары сопоставлены.",
  matchingSolvedPopup: "Задание на сопоставление пар завершено.",
  matchingNoAttempts: "Попыток не осталось.",
  matchingFailedPopup: "Слишком много неправильных сопоставлений.",
  matchingWrongPair: "Это неправильная пара.",
  outcomePassed: "Зачтено",
  outcomeTimedOut: "Время истекло",
  outcomeFailed: "Не зачтено",
  matchingChecking: "Проверка...",
  matchingCheck: "Проверить",
  matchingAttempts: "Попытки",
  matchingMatched: "Сопоставлено",
  taskDescriptionMissing: "Описание задания ещё не добавлено.",
  anagramDisplayHint:
    "Перемешанный текст отображается слово за словом, каждое в отдельной строке.",
  executionTimerLabel: "Время до завершения задания",
  points: "Баллы",
  backToMapNow: "Вернуться к карте сейчас",
  backToMap: "Вернуться к карте",
};

const STATION_PREVIEW_TEXT: Record<UiLanguage, StationPreviewText> = {
  polish: {
    fallbackQuizOptions: [
      "Sprawdzam komunikację i plan zespołu.",
      "Działam bez konsultacji z drużyną.",
      "Ignoruję zasady bezpieczeństwa.",
      "Rozdzielam zespół i tracę kontakt.",
    ],
    audioSourceMissing: "Brak źródła audio dla tego stanowiska.",
    audioLoadFailed: "Nie udało się załadować nagrania audio.",
    audioPlayFailed: "Nie udało się odtworzyć nagrania audio.",
    timeoutWordle: "Czas na Wordle minął. Zadanie nie zostało zaliczone.",
    timeoutHangman: "Czas na Wisielca minął. Zadanie nie zostało zaliczone.",
    timeoutMastermind: "Czas na Mastermind minął. Zadanie nie zostało zaliczone.",
    timeoutAnagram: "Czas na anagram minął. Zadanie nie zostało zaliczone.",
    timeoutCaesar: "Czas na szyfr Cezara minął. Zadanie nie zostało zaliczone.",
    timeoutMemory: "Czas na grę Memory minął. Zadanie nie zostało zaliczone.",
    timeoutSimon: "Czas na grę Simon minął. Zadanie nie zostało zaliczone.",
    timeoutRebus: "Czas na rebus minął. Zadanie nie zostało zaliczone.",
    timeoutBoggle: "Czas na Boggle minął. Zadanie nie zostało zaliczone.",
    timeoutMiniSudoku: "Czas na mini Sudoku minął. Zadanie nie zostało zaliczone.",
    timeoutMatching: "Czas na łączenie par minął. Zadanie nie zostało zaliczone.",
    timeoutQuiz: "Czas na quiz minął. Zadanie nie zostało zaliczone.",
    timeoutCodeTask: "Czas na ukończenie zadania się skończył. Zadanie nie zostało zaliczone.",
    codeEnter: "Wpisz kod, aby zatwierdzić stanowisko.",
    codeApprovedTestMode: "Kod zatwierdzony (tryb testowy).",
    codeApproved: "Kod zatwierdzony.",
    wordleEnterGuess: "Wpisz próbę, aby sprawdzić słowo.",
    wordleLengthExact: (length: number) => `Słowo musi mieć dokładnie ${length} znaków.`,
    wordleAttemptsExhausted: "Wykorzystano wszystkie próby.",
    wordleTryAgain: "Nietrafione — spróbuj ponownie.",
    wordleNoAttempts: "Brak prób. Zadanie niezaliczone.",
    wordleFailedPopup: "Wykorzystano wszystkie próby Wordle.",
    wordleSolved: "Brawo! Poprawne słowo.",
    wordleSolvedPopup: "Poprawne słowo. Zadanie zaliczone.",
    alertErrorTitle: "Błąd",
    quizCorrect: "Dobra odpowiedź",
    quizIncorrect: "Zła odpowiedź",
    quizWrongPopup: "Wybrano nieprawidłową odpowiedź.",
    quizSuccessPopup: "Poprawna odpowiedź. Zadanie zaliczone.",
    hangmanEnterLetter: "Wpisz jedną literę.",
    hangmanLetterAlreadyChecked: "Ta litera była już sprawdzana.",
    hangmanNoAttempts: (secret: string) => `Brak prób. Hasło: ${secret}`,
    hangmanFailedPopup: "Wykorzystano wszystkie próby w Wisielcu.",
    hangmanGoodLetter: "Dobra litera!",
    hangmanMiss: "Pudło.",
    hangmanSolved: "Brawo! Odkryto całe hasło.",
    hangmanSolvedPopup: "Hasło odgadnięte. Zadanie zaliczone.",
    mastermindInvalidCode: (length: number) =>
      `Kod musi mieć ${length} znaki i używać liter A-F.`,
    mastermindNoAttempts: (secret: string) => `Brak prób. Poprawny kod: ${secret}`,
    mastermindFailedPopup: "Wyczerpano próby w Mastermind.",
    mastermindFeedback: (exact: number, misplaced: number) =>
      `Trafione: ${exact}, na złej pozycji: ${misplaced}.`,
    mastermindSolved: "Brawo! Kod odgadnięty.",
    mastermindSolvedPopup: "Kod odgadnięty. Zadanie zaliczone.",
    anagramEnter: "Wpisz rozwiązanie anagramu.",
    anagramNoAttempts: "Brak prób. Zadanie niezaliczone.",
    anagramFailedPopup: "Nie udało się rozwiązać anagramu.",
    anagramIncorrect: "Niepoprawnie. Spróbuj ponownie.",
    anagramSolved: "Brawo! Anagram rozwiązany.",
    anagramSolvedPopup: "Anagram rozwiązany poprawnie.",
    caesarEnter: "Wpisz odszyfrowaną frazę.",
    caesarNoAttempts: (decoded: string) => `Brak prób. Poprawna fraza: ${decoded}`,
    caesarFailedPopup: "Nie udało się odszyfrować frazy.",
    caesarIncorrect: "Niepoprawnie. Sprawdź przesunięcie i spróbuj ponownie.",
    caesarSolved: "Brawo! Fraza odszyfrowana.",
    caesarSolvedPopup: "Szyfr Cezara rozwiązany poprawnie.",
    caesarShiftHint: (shift: number) => `Wskazówka: przesunięcie +${shift}`,
    caesarAttemptsLeftLabel: "Pozostało prób",
    memorySolved: "Brawo! Wszystkie pary znalezione.",
    memorySolvedPopup: "Gra Memory ukończona.",
    memoryPairFound: "Dobrze! Para znaleziona.",
    memoryMiss: "Pudło. Spróbuj zapamiętać pozycje.",
    memoryFailedPopup: "Za dużo błędnych prób w Memory.",
    simonWrong: "Błędna sekwencja.",
    simonFailedPopup: "Sekwencja Simona została przerwana.",
    simonProgress: (current: number, total: number) => `Dobrze! Postęp: ${current}/${total}`,
    simonSolved: "Brawo! Sekwencja poprawna.",
    simonSolvedPopup: "Sekwencja Simona odtworzona poprawnie.",
    rebusEnter: "Wpisz rozwiązanie rebusu.",
    rebusNoAttempts: (answer: string) => `Brak prób. Poprawna odpowiedź: ${answer}`,
    rebusFailedPopup: "Nie udało się rozwiązać rebusu.",
    rebusIncorrect: "Niepoprawnie. Spróbuj ponownie.",
    rebusSolved: "Brawo! Rebus rozwiązany.",
    rebusSolvedPopup: "Rebus rozwiązany poprawnie.",
    boggleEnterMin: "Wpisz słowo (minimum 3 litery).",
    boggleMaxLength: (max: number) => `Słowo może mieć maksymalnie ${max} liter.`,
    boggleNoAttempts: (target: string) => `Brak prób. Szukane słowo: ${target}`,
    boggleFailedPopup: "Nie znaleziono poprawnego słowa w Boggle.",
    boggleIncorrect: "To nie jest docelowe słowo. Spróbuj ponownie.",
    boggleSolved: "Brawo! Słowo odnalezione.",
    boggleSolvedPopup: "Boggle rozwiązane poprawnie.",
    boggleAdjacentOnly: "Wybieraj sąsiadujące pola (także po skosie).",
    miniSudokuFillAll: "Uzupełnij wszystkie pola wartościami 1 lub 2.",
    miniSudokuNoAttempts: (solution: string) => `Brak prób. Poprawny układ: ${solution}`,
    miniSudokuFailedPopup: "Nie udało się rozwiązać mini Sudoku.",
    miniSudokuIncorrect: "Układ niepoprawny. Sprawdź wiersze i kolumny.",
    miniSudokuSolved: "Brawo! Mini Sudoku rozwiązane.",
    miniSudokuSolvedPopup: "Mini Sudoku rozwiązane poprawnie.",
    matchingSetLine: "Ustaw elementy po obu stronach w linii środka.",
    matchingPairGood: "Dobrze! Para połączona.",
    matchingSolved: "Brawo! Wszystkie pary połączone.",
    matchingSolvedPopup: "Zadanie łączenia par ukończone.",
    matchingNoAttempts: "Brak prób.",
    matchingFailedPopup: "Za dużo błędnych połączeń.",
    matchingWrongPair: "To nie jest poprawna para.",
    outcomePassed: "Zaliczono",
    outcomeTimedOut: "Czas minął",
    outcomeFailed: "Nie zaliczono",
    matchingChecking: "Sprawdzanie...",
    matchingCheck: "Sprawdź",
    matchingAttempts: "Próby",
    matchingMatched: "Dopasowano",
    taskDescriptionMissing: "Opis zadania nie został jeszcze dodany.",
    anagramDisplayHint:
      "Rozsypanka jest wyświetlana wyraz po wyrazie, a każdy wyraz znajduje się w osobnym wierszu.",
    executionTimerLabel: "Czas do ukończenia zadania",
    points: "Punkty",
    backToMapNow: "Wróć do mapy teraz",
    backToMap: "Wróć do mapy",
  },
  english: STATION_PREVIEW_TEXT_ENGLISH,
  ukrainian: STATION_PREVIEW_TEXT_UKRAINIAN,
  russian: STATION_PREVIEW_TEXT_RUSSIAN,
};


export function StationPreviewOverlay({
  station: stationProp,
  onClose,
  onRequestClose,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  onTimeExpired,
  debugOutcomePreview,
  onDebugOutcomePreviewConsumed,
}: StationPreviewOverlayProps) {
  const uiLanguage = useUiLanguage();
  const text = STATION_PREVIEW_TEXT[uiLanguage];
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const shortestEdge = Math.min(viewportHeight, viewportWidth);
  const isTabletOverlay = viewportWidth >= 900 || shortestEdge >= 700;
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [wordleInput, setWordleInput] = useState("");
  const [wordleAttempts, setWordleAttempts] = useState<WordleAttempt[]>([]);
  const [wordleResult, setWordleResult] = useState<string | null>(null);
  const [wordleRevealedCellCounts, setWordleRevealedCellCounts] = useState<number[]>([]);
  const [isWordleRevealAnimating, setIsWordleRevealAnimating] = useState(false);
  const [hangmanInput, setHangmanInput] = useState("");
  const [hangmanGuessedLetters, setHangmanGuessedLetters] = useState<string[]>([]);
  const [hangmanMisses, setHangmanMisses] = useState<string[]>([]);
  const [hangmanResult, setHangmanResult] = useState<string | null>(null);
  const [mastermindInput, setMastermindInput] = useState("");
  const [mastermindAttempts, setMastermindAttempts] = useState<MastermindAttempt[]>([]);
  const [mastermindResult, setMastermindResult] = useState<string | null>(null);
  const [anagramInput, setAnagramInput] = useState("");
  const [anagramAttempts, setAnagramAttempts] = useState(0);
  const [anagramResult, setAnagramResult] = useState<string | null>(null);
  const [caesarInput, setCaesarInput] = useState("");
  const [caesarAttempts, setCaesarAttempts] = useState(0);
  const [caesarResult, setCaesarResult] = useState<string | null>(null);
  const [memoryDeck, setMemoryDeck] = useState<MemoryCard[]>([]);
  const [memorySelection, setMemorySelection] = useState<string[]>([]);
  const [memoryMistakes, setMemoryMistakes] = useState(0);
  const [memoryResult, setMemoryResult] = useState<string | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [simonInput, setSimonInput] = useState<string[]>([]);
  const [simonHintVisible, setSimonHintVisible] = useState(true);
  const [simonResult, setSimonResult] = useState<string | null>(null);
  const [rebusInput, setRebusInput] = useState("");
  const [rebusAttempts, setRebusAttempts] = useState(0);
  const [rebusResult, setRebusResult] = useState<string | null>(null);
  const [boggleInput, setBoggleInput] = useState("");
  const [boggleSelectedCellPath, setBoggleSelectedCellPath] = useState<number[]>([]);
  const [boggleAttempts, setBoggleAttempts] = useState(0);
  const [boggleResult, setBoggleResult] = useState<string | null>(null);
  const [miniSudokuValues, setMiniSudokuValues] = useState<string[]>(["", "", "", ""]);
  const [miniSudokuAttempts, setMiniSudokuAttempts] = useState(0);
  const [miniSudokuResult, setMiniSudokuResult] = useState<string | null>(null);
  const [matchingLeftCarouselIndex, setMatchingLeftCarouselIndex] = useState(0);
  const [matchingRightCarouselIndex, setMatchingRightCarouselIndex] = useState(0);
  const [matchingMatchedLeft, setMatchingMatchedLeft] = useState<string[]>([]);
  const [matchingAttempts, setMatchingAttempts] = useState(0);
  const [matchingResult, setMatchingResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [quizIconLoadFailed, setQuizIconLoadFailed] = useState(false);
  const [isSubmittingQuizAnswer, setIsSubmittingQuizAnswer] = useState(false);
  const [isSubmittingWordleGuess, setIsSubmittingWordleGuess] = useState(false);
  const [isSubmittingHangmanGuess, setIsSubmittingHangmanGuess] = useState(false);
  const [isSubmittingMastermindGuess, setIsSubmittingMastermindGuess] = useState(false);
  const [isSubmittingAnagram, setIsSubmittingAnagram] = useState(false);
  const [isSubmittingCaesar, setIsSubmittingCaesar] = useState(false);
  const [isSubmittingMemory, setIsSubmittingMemory] = useState(false);
  const [isSubmittingSimon, setIsSubmittingSimon] = useState(false);
  const [isSubmittingRebus, setIsSubmittingRebus] = useState(false);
  const [isSubmittingBoggle, setIsSubmittingBoggle] = useState(false);
  const [isSubmittingMiniSudoku, setIsSubmittingMiniSudoku] = useState(false);
  const [isSubmittingMatching, setIsSubmittingMatching] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isCodeInputInvalid, setIsCodeInputInvalid] = useState(false);
  const [isCodeInputSuccess, setIsCodeInputSuccess] = useState(false);
  const [wordleKeyboardContainerWidth, setWordleKeyboardContainerWidth] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayedStation, setDisplayedStation] = useState<StationTestViewModel | null>(stationProp);
  const [isOverlayMounted, setIsOverlayMounted] = useState(Boolean(stationProp));
  const [quizOutcomePopup, setQuizOutcomePopup] = useState<QuizOutcomePopup | null>(null);
  const [timeoutPopupSecondsLeft, setTimeoutPopupSecondsLeft] = useState<number | null>(null);
  const overlaySlideAnimation = useRef(new Animated.Value(stationProp ? 1 : 0)).current;
  const quizFeedbackAnimation = useRef(new Animated.Value(0)).current;
  const timerPulseAnimation = useRef(new Animated.Value(0)).current;
  const matchingCheckPulseAnimation = useRef(new Animated.Value(0)).current;
  const codeInputShakeAnimation = useRef(new Animated.Value(0)).current;
  const codeInputResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeInputSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioPlaybackSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const timerPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const matchingCheckPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const memoryHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simonHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordleRevealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timeoutPopupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutPopupShownRef = useRef(false);
  const quizOutcomeActionRef = useRef<(() => void) | null>(null);
  const quizOptions = useMemo(
    () =>
      displayedStation?.quizAnswers ?? text.fallbackQuizOptions,
    [displayedStation?.quizAnswers, text.fallbackQuizOptions],
  );
  const clearWordleRevealTimeouts = useCallback(() => {
    wordleRevealTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    wordleRevealTimeoutsRef.current = [];
  }, []);
  const runWordleRevealSequence = useCallback(
    (attemptIndex: number, revealLength: number) =>
      new Promise<void>((resolve) => {
        if (revealLength <= 0) {
          setIsWordleRevealAnimating(false);
          resolve();
          return;
        }

        clearWordleRevealTimeouts();
        setIsWordleRevealAnimating(true);
        for (let columnIndex = 0; columnIndex < revealLength; columnIndex += 1) {
          const timeoutId = setTimeout(() => {
            setWordleRevealedCellCounts((current) => {
              const next = [...current];
              if (next.length <= attemptIndex) {
                next.length = attemptIndex + 1;
              }
              const alreadyRevealed = next[attemptIndex] ?? 0;
              next[attemptIndex] = Math.max(alreadyRevealed, columnIndex + 1);
              return next;
            });
          }, columnIndex * WORDLE_REVEAL_CELL_DELAY_MS);
          wordleRevealTimeoutsRef.current.push(timeoutId);
        }

        const finalizeTimeoutId = setTimeout(() => {
          setIsWordleRevealAnimating(false);
          clearWordleRevealTimeouts();
          resolve();
        }, revealLength * WORDLE_REVEAL_CELL_DELAY_MS + WORDLE_REVEAL_FINISH_BUFFER_MS);
        wordleRevealTimeoutsRef.current.push(finalizeTimeoutId);
      }),
    [clearWordleRevealTimeouts],
  );
  const clearTimeoutPopupCountdown = useCallback(() => {
    if (timeoutPopupIntervalRef.current) {
      clearInterval(timeoutPopupIntervalRef.current);
      timeoutPopupIntervalRef.current = null;
    }
    setTimeoutPopupSecondsLeft(null);
  }, []);
  const showQuizOutcomePopup = useCallback(
    (variant: QuizOutcomePopup["variant"], message: string, onDismiss?: () => void) => {
      Keyboard.dismiss();
      if (variant !== "timeout") {
        clearTimeoutPopupCountdown();
      }
      quizOutcomeActionRef.current = onDismiss ?? onClose;
      setQuizOutcomePopup({
        variant,
        message,
      });
    },
    [clearTimeoutPopupCountdown, onClose],
  );
  const closeQuizOutcomePopup = useCallback(() => {
    const onDismiss = quizOutcomeActionRef.current;
    quizOutcomeActionRef.current = null;
    clearTimeoutPopupCountdown();
    setQuizOutcomePopup(null);
    onDismiss?.();
  }, [clearTimeoutPopupCountdown]);
  const unloadAudioSound = useCallback(async () => {
    const activePlayer = audioPlayerRef.current;
    audioPlayerRef.current = null;
    setIsAudioPlaying(false);
    if (audioPlaybackSubscriptionRef.current) {
      audioPlaybackSubscriptionRef.current.remove();
      audioPlaybackSubscriptionRef.current = null;
    }
    if (!activePlayer) {
      return;
    }

    try {
      activePlayer.pause();
    } catch {
      // noop
    }

    try {
      activePlayer.remove();
    } catch {
      // noop
    }
  }, []);
  const loadAudioSound = useCallback(
    async (audioUrl: string) => {
      const normalizedAudioUrl = audioUrl.trim();
      if (!normalizedAudioUrl) {
        setAudioLoadError(text.audioSourceMissing);
        setIsAudioLoading(false);
        return null;
      }

      await unloadAudioSound();
      setAudioLoadError(null);
      setIsAudioLoading(true);
      try {
        const player = createAudioPlayer(
          { uri: normalizedAudioUrl },
          {
            updateInterval: 250,
          },
        );
        audioPlayerRef.current = player;
        audioPlaybackSubscriptionRef.current = player.addListener(
          "playbackStatusUpdate",
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              setIsAudioPlaying(false);
              return;
            }

            setIsAudioLoading(false);
            setIsAudioPlaying(status.playing);
            if (status.didJustFinish) {
              void audioPlayerRef.current?.seekTo(0).catch(() => undefined);
              setIsAudioPlaying(false);
            }
          },
        );
        setIsAudioLoading(!player.isLoaded);
        return player;
      } catch {
        setAudioLoadError(text.audioLoadFailed);
        return null;
      } finally {
        if (!audioPlayerRef.current) {
          setIsAudioLoading(false);
        }
      }
    },
    [text.audioLoadFailed, text.audioSourceMissing, unloadAudioSound],
  );
  const handlePlayAudio = useCallback(async () => {
    if (!displayedStation || displayedStation.stationType !== "audio-quiz") {
      return;
    }

    const audioUrl = displayedStation.quizAudioUrl?.trim() ?? "";
    let activePlayer = audioPlayerRef.current;
    if (!activePlayer) {
      activePlayer = await loadAudioSound(audioUrl);
    }

    if (!activePlayer) {
      return;
    }

    try {
      await activePlayer.seekTo(0);
      activePlayer.play();
    } catch {
      setAudioLoadError(text.audioPlayFailed);
      setIsAudioPlaying(false);
    }
  }, [displayedStation, loadAudioSound, text.audioPlayFailed]);

  useEffect(() => {
    if (stationProp) {
      setDisplayedStation(stationProp);
      setIsOverlayMounted(true);
      overlaySlideAnimation.stopAnimation();
      Animated.timing(overlaySlideAnimation, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    overlaySlideAnimation.stopAnimation();
    Animated.timing(overlaySlideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsOverlayMounted(false);
        setDisplayedStation(null);
      }
    });
  }, [overlaySlideAnimation, stationProp]);

  useEffect(() => {
    setSelectedQuizOption(null);
    setQuizResult(null);
    setWordleInput("");
    setWordleAttempts([]);
    setWordleResult(null);
    setWordleRevealedCellCounts([]);
    setIsWordleRevealAnimating(false);
    setHangmanInput("");
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
    setMemoryMistakes(0);
    setMemoryResult(null);
    setMemoryBusy(false);
    setSimonInput([]);
    setSimonHintVisible(true);
    setSimonResult(null);
    setRebusInput("");
    setRebusAttempts(0);
    setRebusResult(null);
    setBoggleInput("");
    setBoggleSelectedCellPath([]);
    setBoggleAttempts(0);
    setBoggleResult(null);
    setMiniSudokuValues(["", "", "", ""]);
    setMiniSudokuAttempts(0);
    setMiniSudokuResult(null);
    setMatchingLeftCarouselIndex(0);
    setMatchingRightCarouselIndex(0);
    setMatchingMatchedLeft([]);
    setMatchingAttempts(0);
    setMatchingResult(null);
    setVerificationCode("");
    setCodeResult(null);
    setQuizSubmitError(null);
    setAudioLoadError(null);
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
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
    clearTimeoutPopupCountdown();
    setQuizOutcomePopup(null);
    setNowMs(Date.now());
    quizFeedbackAnimation.setValue(0);
    timerPulseAnimation.setValue(0);
    matchingCheckPulseAnimation.setValue(0);
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
    matchingCheckPulseLoopRef.current?.stop();
    if (memoryHideTimeoutRef.current) {
      clearTimeout(memoryHideTimeoutRef.current);
      memoryHideTimeoutRef.current = null;
    }
    if (simonHintTimeoutRef.current) {
      clearTimeout(simonHintTimeoutRef.current);
      simonHintTimeoutRef.current = null;
    }
    clearWordleRevealTimeouts();
    timeoutPopupShownRef.current = false;
    quizOutcomeActionRef.current = null;
  }, [
    clearTimeoutPopupCountdown,
    clearWordleRevealTimeouts,
    codeInputShakeAnimation,
    displayedStation?.stationId,
    matchingCheckPulseAnimation,
    quizFeedbackAnimation,
    timerPulseAnimation,
  ]);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
      shouldPlayInBackground: false,
    }).catch(() => undefined);

    return () => {
      void unloadAudioSound();
    };
  }, [unloadAudioSound]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "audio-quiz") {
      void unloadAudioSound();
      return;
    }

    const audioUrl = displayedStation.quizAudioUrl?.trim() ?? "";
    if (!audioUrl) {
      void unloadAudioSound();
      setAudioLoadError(text.audioSourceMissing);
      return;
    }

    let cancelled = false;
    void loadAudioSound(audioUrl).then((loadedSound) => {
      if (!cancelled || !loadedSound) {
        return;
      }

      try {
        loadedSound.pause();
      } catch {
        // noop
      }
      try {
        loadedSound.remove();
      } catch {
        // noop
      }
      if (audioPlayerRef.current === loadedSound) {
        audioPlayerRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [displayedStation, loadAudioSound, text.audioSourceMissing, unloadAudioSound]);

  useEffect(() => {
    if (!debugOutcomePreview || !displayedStation) {
      return;
    }

    showQuizOutcomePopup(debugOutcomePreview.variant, debugOutcomePreview.message);
    onDebugOutcomePreviewConsumed?.();
  }, [
    debugOutcomePreview,
    displayedStation,
    onDebugOutcomePreviewConsumed,
    showQuizOutcomePopup,
  ]);

  useEffect(() => {
    if (quizOutcomePopup?.variant !== "timeout") {
      clearTimeoutPopupCountdown();
      return;
    }

    if (timeoutPopupIntervalRef.current) {
      clearInterval(timeoutPopupIntervalRef.current);
    }
    setTimeoutPopupSecondsLeft(TIMEOUT_POPUP_AUTO_CLOSE_SECONDS);
    timeoutPopupIntervalRef.current = setInterval(() => {
      setTimeoutPopupSecondsLeft((current) => {
        if (current === null) {
          return null;
        }
        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => {
      if (timeoutPopupIntervalRef.current) {
        clearInterval(timeoutPopupIntervalRef.current);
        timeoutPopupIntervalRef.current = null;
      }
    };
  }, [clearTimeoutPopupCountdown, quizOutcomePopup?.variant]);

  useEffect(() => {
    if (quizOutcomePopup?.variant !== "timeout" || timeoutPopupSecondsLeft !== 0) {
      return;
    }
    closeQuizOutcomePopup();
  }, [closeQuizOutcomePopup, quizOutcomePopup?.variant, timeoutPopupSecondsLeft]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "simon") {
      if (simonHintTimeoutRef.current) {
        clearTimeout(simonHintTimeoutRef.current);
        simonHintTimeoutRef.current = null;
      }
      return;
    }

    setSimonHintVisible(true);
    if (simonHintTimeoutRef.current) {
      clearTimeout(simonHintTimeoutRef.current);
    }
    simonHintTimeoutRef.current = setTimeout(() => {
      setSimonHintVisible(false);
      simonHintTimeoutRef.current = null;
    }, 2300);
  }, [displayedStation?.stationId, displayedStation?.stationType]);

  useEffect(() => {
    return () => {
      if (codeInputResetTimeoutRef.current) {
        clearTimeout(codeInputResetTimeoutRef.current);
        codeInputResetTimeoutRef.current = null;
      }
      if (codeInputSuccessTimeoutRef.current) {
        clearTimeout(codeInputSuccessTimeoutRef.current);
        codeInputSuccessTimeoutRef.current = null;
      }
      if (memoryHideTimeoutRef.current) {
        clearTimeout(memoryHideTimeoutRef.current);
        memoryHideTimeoutRef.current = null;
      }
      if (simonHintTimeoutRef.current) {
        clearTimeout(simonHintTimeoutRef.current);
        simonHintTimeoutRef.current = null;
      }
      clearWordleRevealTimeouts();
      clearTimeoutPopupCountdown();
      void unloadAudioSound();
      quizOutcomeActionRef.current = null;
    };
  }, [clearTimeoutPopupCountdown, clearWordleRevealTimeouts, unloadAudioSound]);

  useEffect(() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done" ||
      displayedStation.status === "failed"
    ) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const now = Date.now();
      setNowMs(now);
      const msToNextSecond = 1000 - (now % 1000);
      timeout = setTimeout(tick, Math.max(40, msToNextSecond + 12));
    };

    tick();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [displayedStation]);

  const remainingTimeSeconds = (() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0
    ) {
      return null;
    }

    const startedMs = new Date(displayedStation.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    const endsAtMs = startedMs + displayedStation.timeLimitSeconds * 1000;
    const remainingMs = Math.max(0, endsAtMs - nowMs);
    return Math.max(0, Math.ceil(remainingMs / 1000));
  })();
  const finalTenSecondsProgress =
    remainingTimeSeconds !== null && remainingTimeSeconds <= 10 ? clamp01((10 - remainingTimeSeconds) / 10) : 0;
  const isUrgentPulse = remainingTimeSeconds !== null && remainingTimeSeconds <= 10;
  const hasCountdownForPulse = Boolean(
    displayedStation?.startedAt &&
      displayedStation.timeLimitSeconds > 0 &&
      displayedStation.status !== "done" &&
      displayedStation.status !== "failed",
  );
  const hasTimerStartedForPulse = Boolean(displayedStation?.startedAt);
  const stationStatusForPulse = displayedStation?.status;

  useEffect(() => {
    timerPulseLoopRef.current?.stop();
    timerPulseAnimation.setValue(0);

    if (
      !isOverlayMounted ||
      !hasCountdownForPulse ||
      !hasTimerStartedForPulse ||
      stationStatusForPulse === "done" ||
      stationStatusForPulse === "failed" ||
      remainingTimeSeconds === null
    ) {
      return;
    }

    const pulseDuration = isUrgentPulse ? 220 : 620;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulseAnimation, {
          toValue: 1,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
        Animated.timing(timerPulseAnimation, {
          toValue: 0,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
      ]),
    );

    timerPulseLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [
    hasCountdownForPulse,
    hasTimerStartedForPulse,
    isUrgentPulse,
    isOverlayMounted,
    stationStatusForPulse,
    timerPulseAnimation,
  ]);

  useEffect(() => {
    if (!displayedStation || !isQuizStationType(displayedStation.stationType)) {
      return;
    }

    if (
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done" ||
      displayedStation.status === "failed"
    ) {
      return;
    }

    if (remainingTimeSeconds === null || remainingTimeSeconds > 0) {
      return;
    }

    const isQuizAnswerPending =
      (displayedStation.stationType === "quiz" || displayedStation.stationType === "audio-quiz") &&
      isSubmittingQuizAnswer;
    const isWordlePending = displayedStation.stationType === "wordle" && isSubmittingWordleGuess;
    const isHangmanPending = displayedStation.stationType === "hangman" && isSubmittingHangmanGuess;
    const isMastermindPending = displayedStation.stationType === "mastermind" && isSubmittingMastermindGuess;
    const isAnagramPending = displayedStation.stationType === "anagram" && isSubmittingAnagram;
    const isCaesarPending = displayedStation.stationType === "caesar-cipher" && isSubmittingCaesar;
    const isMemoryPending = displayedStation.stationType === "memory" && isSubmittingMemory;
    const isSimonPending = displayedStation.stationType === "simon" && isSubmittingSimon;
    const isRebusPending = displayedStation.stationType === "rebus" && isSubmittingRebus;
    const isBogglePending = displayedStation.stationType === "boggle" && isSubmittingBoggle;
    const isMiniSudokuPending = displayedStation.stationType === "mini-sudoku" && isSubmittingMiniSudoku;
    const isMatchingPending = displayedStation.stationType === "matching" && isSubmittingMatching;
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
      timeoutPopupShownRef.current
    ) {
      return;
    }

    timeoutPopupShownRef.current = true;
    onQuizFailed?.(displayedStation.stationId, "time_limit_expired");
    const timeoutMessage =
      displayedStation.stationType === "wordle"
        ? text.timeoutWordle
        : displayedStation.stationType === "hangman"
          ? text.timeoutHangman
          : displayedStation.stationType === "mastermind"
            ? text.timeoutMastermind
            : displayedStation.stationType === "anagram"
              ? text.timeoutAnagram
              : displayedStation.stationType === "caesar-cipher"
                ? text.timeoutCaesar
                : displayedStation.stationType === "memory"
                  ? text.timeoutMemory
                  : displayedStation.stationType === "simon"
                    ? text.timeoutSimon
                    : displayedStation.stationType === "rebus"
                      ? text.timeoutRebus
                      : displayedStation.stationType === "boggle"
                        ? text.timeoutBoggle
                        : displayedStation.stationType === "mini-sudoku"
                          ? text.timeoutMiniSudoku
                          : displayedStation.stationType === "matching"
                            ? text.timeoutMatching
                            : text.timeoutQuiz;
    showQuizOutcomePopup("timeout", timeoutMessage);
  }, [
    displayedStation,
    isSubmittingAnagram,
    isSubmittingBoggle,
    isSubmittingCaesar,
    isSubmittingHangmanGuess,
    isSubmittingMastermindGuess,
    isSubmittingMatching,
    isSubmittingMemory,
    isSubmittingMiniSudoku,
    isSubmittingQuizAnswer,
    isSubmittingRebus,
    isSubmittingSimon,
    isSubmittingWordleGuess,
    onQuizFailed,
    remainingTimeSeconds,
    showQuizOutcomePopup,
  ]);

  useEffect(() => {
    if (!displayedStation || isQuizStationType(displayedStation.stationType)) {
      return;
    }

    if (
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done" ||
      displayedStation.status === "failed"
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
    onTimeExpired?.(displayedStation.stationId);
    showQuizOutcomePopup(
      "timeout",
      text.timeoutCodeTask,
    );
  }, [
    displayedStation,
    isSubmittingCode,
    onTimeExpired,
    remainingTimeSeconds,
    showQuizOutcomePopup,
    text.timeoutCodeTask,
  ]);

  const wordleSecretForInputReset =
    displayedStation?.stationType === "wordle" ? resolvePuzzleSecret(displayedStation, "wordle") : "";
  const wordleLengthForInputReset = Array.from(wordleSecretForInputReset).length;
  const wordleDisplayLengthForTracking = Math.max(1, wordleLengthForInputReset || 5);
  const normalizedWordleInputForReset = normalizeWordleSecret(wordleInput).slice(0, wordleLengthForInputReset || 32);
  useEffect(() => {
    if (wordleResult !== null) {
      setWordleResult(null);
    }
    if (quizSubmitError !== null) {
      setQuizSubmitError(null);
    }
  }, [normalizedWordleInputForReset]);
  useEffect(() => {
    if (!wordleAttempts.length) {
      if (wordleRevealedCellCounts.length > 0) {
        setWordleRevealedCellCounts([]);
      }
      return;
    }

    setWordleRevealedCellCounts((current) => {
      const next = current.slice(0, wordleAttempts.length);
      while (next.length < wordleAttempts.length) {
        next.push(wordleDisplayLengthForTracking);
      }
      return next;
    });
  }, [wordleAttempts.length, wordleDisplayLengthForTracking, wordleRevealedCellCounts.length]);

  const isMatchingStationForPulse = displayedStation?.stationType === "matching";
  const matchingPairsForPulse =
    displayedStation && isMatchingStationForPulse
      ? resolveMatchingPairs(displayedStation, uiLanguage)
      : [];
  const matchingAllMatchedForPulse =
    isMatchingStationForPulse &&
    matchingPairsForPulse.length > 0 &&
    matchingMatchedLeft.length === matchingPairsForPulse.length;
  const hasMatchingTimedLimit = Boolean(displayedStation && displayedStation.timeLimitSeconds > 0);
  const hasMatchingTimerStarted = Boolean(displayedStation?.startedAt);
  const isMatchingTimeExpired =
    hasMatchingTimedLimit &&
    hasMatchingTimerStarted &&
    remainingTimeSeconds !== null &&
    remainingTimeSeconds <= 0;
  const isMatchingLockedForPulse =
    !displayedStation ||
    displayedStation.status === "done" ||
    displayedStation.status === "failed" ||
    (hasMatchingTimedLimit && !hasMatchingTimerStarted) ||
    isMatchingTimeExpired;
  const canPulseMatchingCheck =
    isOverlayMounted &&
    isMatchingStationForPulse &&
    !isMatchingLockedForPulse &&
    !isSubmittingMatching &&
    !matchingAllMatchedForPulse &&
    matchingAttempts < MEMORY_MAX_MISTAKES;

  useEffect(() => {
    matchingCheckPulseLoopRef.current?.stop();
    matchingCheckPulseAnimation.setValue(0);

    if (!canPulseMatchingCheck) {
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(matchingCheckPulseAnimation, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(matchingCheckPulseAnimation, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    matchingCheckPulseLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [canPulseMatchingCheck, matchingCheckPulseAnimation]);

  if (!isOverlayMounted || !displayedStation) {
    return null;
  }
  const station = displayedStation;

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
  const isQuizStation = isQuizStationType(station.stationType);
  const requiresCode = station.stationType === "time" || station.stationType === "points";
  const isNumericCodeStation =
    requiresCode && station.completionCodeInputMode === "numeric";
  const normalizedImageUrl = station.imageUrl?.trim() || "";
  const isDicebearFallback = normalizedImageUrl.includes("api.dicebear.com/9.x/shapes/svg");
  const shouldShowQuizFallbackGraphic =
    isQuizStation && (imageLoadFailed || !normalizedImageUrl || isDicebearFallback);
  const stationImageUri = shouldShowQuizFallbackGraphic ? undefined : normalizedImageUrl || undefined;
  const stationDescription = station.description.trim();
  const stationMediaHeight = (() => {
    if (isNumericCodeStation) {
      return Math.max(104, Math.round(viewportHeight * 0.14));
    }
    if (requiresCode) {
      return Math.max(128, Math.round(viewportHeight * 0.2));
    }
    if (isWordleStation) {
      return Math.max(230, Math.round(viewportHeight * 0.4));
    }
    if (isAnagramStation) {
      return Math.max(210, Math.round(viewportHeight * 0.34));
    }
    if (isMatchingStation) {
      return Math.max(430, Math.round(viewportHeight * 0.7));
    }
    if (isBoggleStation) {
      return Math.max(400, Math.round(viewportHeight * 0.64));
    }
    return Math.max(190, Math.round(viewportHeight * 0.33));
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
        Math.min(
          wordleDisplayLength,
          wordleRevealedCellCounts[attemptIndex] ?? wordleDisplayLength,
        ),
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
  const wordleKeyboardKeyWidth = (() => {
    const availableWidth =
      wordleKeyboardContainerWidth > 0 ? wordleKeyboardContainerWidth : Math.max(260, viewportWidth - 72);
    return Math.max(24, Math.floor((availableWidth - 9 * wordleKeyboardKeyGap) / 10));
  })();
  const wordleBoardCellSize = wordleKeyboardKeyWidth;
  const guessedHangmanSet = new Set(hangmanGuessedLetters);
  const hangmanSecret = isHangmanStation ? resolvePuzzleSecret(station, "hangman") : "";
  const hangmanMaskedSecret = isHangmanStation
    ? Array.from(hangmanSecret)
        .map((character) => {
          if (!isGuessableHangmanCharacter(character)) {
            return character;
          }

          return guessedHangmanSet.has(character) ? character : "_";
        })
        .join(" ")
    : "";
  const normalizedHangmanInput = normalizeHangmanSecret(hangmanInput).replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9]/g, "").slice(0, 1);
  const hangmanHasWon = isHangmanStation
    ? Array.from(hangmanSecret).every((character) => !isGuessableHangmanCharacter(character) || guessedHangmanSet.has(character))
    : false;
  const hangmanAttemptsLeft = Math.max(0, HANGMAN_MAX_MISSES - hangmanMisses.length);
  const puzzleSourceAnswer = resolveCorrectAnswerText(station);
  const mastermindSecret = isMastermindStation ? resolveMastermindSecret(station) : "";
  const normalizedMastermindInput = mastermindInput
    .toUpperCase()
    .replace(/[^A-F]/g, "")
    .slice(0, 4);
  const mastermindSolved = mastermindAttempts.some((attempt) => attempt.exact === mastermindSecret.length);
  const mastermindAttemptsLeft = Math.max(0, MASTERMIND_MAX_ATTEMPTS - mastermindAttempts.length);
  const anagramTarget = isAnagramStation ? normalizePuzzleWord(puzzleSourceAnswer || station.name) : "";
  const anagramHintSource = isAnagramStation ? normalizePuzzleText(puzzleSourceAnswer || station.name || "") : "";
  const anagramSourceWords = isAnagramStation
    ? anagramHintSource
        .split(" ")
        .map((part) => normalizeWordleSecret(part))
        .filter((part) => part.length > 0)
    : [];
  const anagramHintWordLengths = anagramSourceWords.map((part) => Array.from(part).length);
  const anagramHintWordCount = anagramHintWordLengths.length > 0 ? anagramHintWordLengths.length : anagramTarget.length > 0 ? 1 : 0;
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
  const caesarEncoded = isCaesarStation ? caesarShift(caesarDecoded, caesarShiftValue) : "";
  const caesarMaxLength = Math.max(1, Array.from(caesarDecoded).length || 32);
  const normalizedCaesarInput = normalizePuzzleText(caesarInput);
  const caesarAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - caesarAttempts);
  const memoryMatchedCount = memoryDeck.filter((card) => card.matched).length;
  const memoryAllMatched = isMemoryStation && memoryDeck.length > 0 && memoryMatchedCount === memoryDeck.length;
  const memoryAttemptsLeft = Math.max(0, MEMORY_MAX_MISTAKES - memoryMistakes);
  const simonSequence = isSimonStation ? resolveSimonSequence(station) : [];
  const simonHiddenHint = simonSequence.map(() => "•").join(" ");
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
  const normalizedMiniSudokuValues = miniSudokuValues.map((value) => value.replace(/[^1-2]/g, "").slice(0, 1));
  const miniSudokuAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - miniSudokuAttempts);
  const matchingPairs = isMatchingStation ? resolveMatchingPairs(station, uiLanguage) : [];
  const matchingAllRightOptions = isMatchingStation
    ? shuffleDeterministic(
        matchingPairs.map((pair) => pair.right),
        `${station.stationId}-matching-right`,
      )
    : [];
  const matchingAllMatched = isMatchingStation && matchingMatchedLeft.length === matchingPairs.length && matchingPairs.length > 0;
  const matchingAttemptsLeft = Math.max(0, MEMORY_MAX_MISTAKES - matchingAttempts);
  const matchingMatchedRightSet = new Set(
    matchingMatchedLeft
      .map((leftKey) => matchingPairs.find((pair) => pair.left === leftKey)?.right ?? "")
      .filter((value) => value.length > 0),
  );
  const matchingLeftCarouselOptions = matchingPairs
    .map((pair) => pair.left)
    .filter((left) => !matchingMatchedLeft.includes(left));
  const matchingRightCarouselOptions = matchingAllRightOptions.filter(
    (right) => !matchingMatchedRightSet.has(right),
  );
  const matchingSelectedLeft =
    matchingLeftCarouselOptions.length > 0
      ? matchingLeftCarouselOptions[
          normalizeCarouselIndex(
            matchingLeftCarouselIndex,
            matchingLeftCarouselOptions.length,
          )
        ]
      : null;
  const matchingSelectedRight =
    matchingRightCarouselOptions.length > 0
      ? matchingRightCarouselOptions[
          normalizeCarouselIndex(
            matchingRightCarouselIndex,
            matchingRightCarouselOptions.length,
          )
        ]
      : null;
  const feedbackTone =
    hasQuizAnswer && station.quizCorrectAnswerIndex === selectedQuizOption ? "success" : hasQuizAnswer ? "error" : null;
  const remainingTimeLabel = remainingTimeSeconds !== null ? formatRemainingTimeLabel(remainingTimeSeconds) : null;
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
  const executionTimeLabel = remainingTimeLabel ?? station.timeLimitLabel;
  const shouldShowExecutionTimer = executionTimeLabel.trim().length > 0;
  const hasTimedLimit = station.timeLimitSeconds > 0;
  const isTimeExpired =
    hasTimedLimit &&
    hasTimerStarted &&
    remainingTimeSeconds !== null &&
    remainingTimeSeconds <= 0;
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
  const matchingCanSubmit =
    !isInteractiveLocked &&
    matchingAttemptsLeft > 0 &&
    !isSubmittingMatching &&
    !matchingAllMatched &&
    matchingLeftCarouselOptions.length > 0 &&
    matchingRightCarouselOptions.length > 0;
  const matchingCheckPulseStyle = {
    opacity: matchingCheckPulseAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.9],
    }),
    transform: [
      {
        scale: matchingCheckPulseAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  } as const;
  const triggerInvalidCodeFeedback = () => {
    setIsCodeInputInvalid(true);
    codeInputShakeAnimation.stopAnimation();
    codeInputShakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(codeInputShakeAnimation, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: -4, duration: 35, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 4, duration: 35, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();

    if (codeInputResetTimeoutRef.current) {
      clearTimeout(codeInputResetTimeoutRef.current);
    }
    codeInputResetTimeoutRef.current = setTimeout(() => {
      setIsCodeInputInvalid(false);
      codeInputResetTimeoutRef.current = null;
    }, 1000);
  };
  const submitVerificationCode = async () => {
    if (!verificationCode.trim()) {
      setCodeResult(text.codeEnter);
      return;
    }

    if (!onCompleteTask) {
      setIsCodeInputInvalid(false);
      setIsCodeInputSuccess(true);
      setCodeResult(text.codeApprovedTestMode);
      if (codeInputSuccessTimeoutRef.current) {
        clearTimeout(codeInputSuccessTimeoutRef.current);
      }
      codeInputSuccessTimeoutRef.current = setTimeout(() => {
        codeInputSuccessTimeoutRef.current = null;
        onClose();
      }, 5000);
      return;
    }

    setIsSubmittingCode(true);
    const error = await onCompleteTask(station.stationId, verificationCode, station.startedAt ?? undefined);
    setIsSubmittingCode(false);

    if (error) {
      if (isInvalidCompletionCodeErrorMessage(error)) {
        setCodeResult(null);
        triggerInvalidCodeFeedback();
        return;
      }
      setCodeResult(error);
      return;
    }

    setIsCodeInputInvalid(false);
    setIsCodeInputSuccess(true);
    setCodeResult(text.codeApproved);
    if (codeInputSuccessTimeoutRef.current) {
      clearTimeout(codeInputSuccessTimeoutRef.current);
    }
    codeInputSuccessTimeoutRef.current = setTimeout(() => {
      codeInputSuccessTimeoutRef.current = null;
      onClose();
    }, 5000);
  };
  const submitWordleGuess = async () => {
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
      station.status === "done" ||
      station.status === "failed" ||
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
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.wordleFailedPopup);
      return;
    }

    if (!onCompleteTask) {
      setWordleResult(text.wordleSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.wordleSolvedPopup);
      return;
    }

    setIsSubmittingWordleGuess(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingWordleGuess(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setWordleResult(text.wordleSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.wordleSolvedPopup);
  };
  const submitQuizAnswer = async (index: number) => {
    if (!isClassicQuizStation && !isAudioQuizStation) {
      return;
    }

    if (
      selectedQuizOption !== null ||
      isSubmittingQuizAnswer ||
      station.status === "done" ||
      station.status === "failed" ||
      (hasTimedLimit && !hasTimerStarted) ||
      isTimeExpired
    ) {
      return;
    }

    setSelectedQuizOption(index);
    setQuizSubmitError(null);
    const correct = station.quizCorrectAnswerIndex === index;
    setQuizResult(correct ? text.quizCorrect : text.quizIncorrect);
    quizFeedbackAnimation.setValue(0);
    Animated.timing(quizFeedbackAnimation, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();

    if (!correct) {
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.quizWrongPopup);
      return;
    }

    if (!onCompleteTask) {
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.quizSuccessPopup);
      return;
    }

    setIsSubmittingQuizAnswer(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingQuizAnswer(false);

    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.quizSuccessPopup);
  };
  const submitHangmanGuess = async (forcedLetter?: string) => {
    if (!isHangmanStation) {
      return;
    }

    const candidate = (forcedLetter ?? normalizedHangmanInput).trim();
    const letter = normalizeHangmanSecret(candidate).replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9]/g, "").slice(0, 1);

    if (!letter) {
      setHangmanResult(text.hangmanEnterLetter);
      return;
    }

    if (
      station.status === "done" ||
      station.status === "failed" ||
      isSubmittingHangmanGuess ||
      (hasTimedLimit && !hasTimerStarted) ||
      isTimeExpired
    ) {
      return;
    }

    if (guessedHangmanSet.has(letter) || hangmanMisses.includes(letter)) {
      setHangmanInput("");
      setHangmanResult(text.hangmanLetterAlreadyChecked);
      return;
    }

    const isHit = hangmanSecret.includes(letter);
    const nextGuessedLetters = isHit ? [...hangmanGuessedLetters, letter] : hangmanGuessedLetters;
    const nextMisses = isHit ? hangmanMisses : [...hangmanMisses, letter];
    setHangmanInput("");
    setQuizSubmitError(null);

    if (isHit) {
      setHangmanGuessedLetters(nextGuessedLetters);
    } else {
      setHangmanMisses(nextMisses);
    }

    const solvedNow = Array.from(hangmanSecret).every(
      (character) =>
        !isGuessableHangmanCharacter(character) || nextGuessedLetters.includes(character),
    );

    if (!solvedNow) {
      if (!isHit && nextMisses.length >= HANGMAN_MAX_MISSES) {
        setHangmanResult(text.hangmanNoAttempts(hangmanSecret));
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.hangmanFailedPopup);
        return;
      }

      setHangmanResult(isHit ? text.hangmanGoodLetter : text.hangmanMiss);
      return;
    }

    if (!onCompleteTask) {
      setHangmanResult(text.hangmanSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.hangmanSolvedPopup);
      return;
    }

    setIsSubmittingHangmanGuess(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingHangmanGuess(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setHangmanResult(text.hangmanSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.hangmanSolvedPopup);
  };
  const submitMastermindGuess = async () => {
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
        setMastermindResult(text.mastermindNoAttempts(mastermindSecret));
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.mastermindFailedPopup);
        return;
      }
      setMastermindResult(text.mastermindFeedback(feedback.exact, feedback.misplaced));
      return;
    }

    if (!onCompleteTask) {
      setMastermindResult(text.mastermindSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.mastermindSolvedPopup);
      return;
    }

    setIsSubmittingMastermindGuess(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingMastermindGuess(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setMastermindResult(text.mastermindSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.mastermindSolvedPopup);
  };
  const submitAnagram = async () => {
    if (!isAnagramStation) {
      return;
    }

    if (!normalizedAnagramInput) {
      setAnagramResult(text.anagramEnter);
      return;
    }

    if (isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const isCorrect = normalizedAnagramInput === anagramTarget;
    if (!isCorrect) {
      const nextAttempts = anagramAttempts + 1;
      setAnagramAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setAnagramResult(text.anagramNoAttempts);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.anagramFailedPopup);
        return;
      }

      setAnagramResult(text.anagramIncorrect);
      return;
    }

    if (!onCompleteTask) {
      setAnagramResult(text.anagramSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.anagramSolvedPopup);
      return;
    }

    setIsSubmittingAnagram(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingAnagram(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setAnagramResult(text.anagramSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.anagramSolvedPopup);
  };
  const submitCaesar = async () => {
    if (!isCaesarStation) {
      return;
    }

    if (!normalizedCaesarInput) {
      setCaesarResult(text.caesarEnter);
      return;
    }

    if (isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const isCorrect = normalizedCaesarInput === caesarDecoded;
    if (!isCorrect) {
      const nextAttempts = caesarAttempts + 1;
      setCaesarAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setCaesarResult(text.caesarNoAttempts(caesarDecoded));
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.caesarFailedPopup);
        return;
      }

      setCaesarResult(text.caesarIncorrect);
      return;
    }

    if (!onCompleteTask) {
      setCaesarResult(text.caesarSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.caesarSolvedPopup);
      return;
    }

    setIsSubmittingCaesar(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingCaesar(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setCaesarResult(text.caesarSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.caesarSolvedPopup);
  };
  const handleMemoryCardPress = async (cardId: string) => {
    if (!isMemoryStation || isInteractiveLocked || memoryBusy || isSubmittingMemory || memoryAllMatched || memoryAttemptsLeft <= 0) {
      return;
    }

    const card = memoryDeck.find((entry) => entry.id === cardId);
    if (!card || card.matched || card.revealed || memorySelection.length >= 2) {
      return;
    }

    const nextDeck = memoryDeck.map((entry) => (entry.id === cardId ? { ...entry, revealed: true } : entry));
    const nextSelection = [...memorySelection, cardId];
    setMemoryDeck(nextDeck);
    setMemorySelection(nextSelection);
    setQuizSubmitError(null);

    if (nextSelection.length < 2) {
      return;
    }

    const [firstId, secondId] = nextSelection;
    const firstCard = nextDeck.find((entry) => entry.id === firstId);
    const secondCard = nextDeck.find((entry) => entry.id === secondId);
    if (!firstCard || !secondCard) {
      setMemorySelection([]);
      return;
    }

    if (firstCard.symbol === secondCard.symbol) {
      const matchedDeck = nextDeck.map((entry) =>
        entry.id === firstId || entry.id === secondId ? { ...entry, matched: true } : entry,
      );
      setMemoryDeck(matchedDeck);
      setMemorySelection([]);
      if (matchedDeck.every((entry) => entry.matched)) {
        if (!onCompleteTask) {
          setMemoryResult(text.memorySolved);
          onQuizPassed?.(station.stationId);
          showQuizOutcomePopup("success", text.memorySolvedPopup);
          return;
        }

        setIsSubmittingMemory(true);
        const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
        setIsSubmittingMemory(false);
        if (error) {
          setQuizSubmitError(error);
          Alert.alert(text.alertErrorTitle, error);
          return;
        }
        setMemoryResult(text.memorySolved);
        onQuizPassed?.(station.stationId);
        showQuizOutcomePopup("success", text.memorySolvedPopup);
      } else {
        setMemoryResult(text.memoryPairFound);
      }
      return;
    }

    const nextMistakes = memoryMistakes + 1;
    setMemoryMistakes(nextMistakes);
    setMemoryBusy(true);
    setMemoryResult(text.memoryMiss);
    if (memoryHideTimeoutRef.current) {
      clearTimeout(memoryHideTimeoutRef.current);
    }
    memoryHideTimeoutRef.current = setTimeout(() => {
      setMemoryDeck((current) =>
        current.map((entry) =>
          nextSelection.includes(entry.id) && !entry.matched ? { ...entry, revealed: false } : entry,
        ),
      );
      setMemorySelection([]);
      setMemoryBusy(false);
      memoryHideTimeoutRef.current = null;
    }, 650);

    if (nextMistakes >= MEMORY_MAX_MISTAKES) {
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.memoryFailedPopup);
    }
  };
  const handleSimonPress = async (buttonId: string) => {
    if (!isSimonStation || isInteractiveLocked || isSubmittingSimon || simonInput.length >= simonSequence.length) {
      return;
    }

    const nextInput = [...simonInput, buttonId];
    setSimonInput(nextInput);
    setQuizSubmitError(null);

    const isPrefixValid = nextInput.every((entry, index) => entry === simonSequence[index]);
    if (!isPrefixValid) {
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      setSimonResult(text.simonWrong);
      showQuizOutcomePopup("failed", text.simonFailedPopup);
      return;
    }

    if (nextInput.length < simonSequence.length) {
      setSimonResult(text.simonProgress(nextInput.length, simonSequence.length));
      return;
    }

    if (!onCompleteTask) {
      setSimonResult(text.simonSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.simonSolvedPopup);
      return;
    }

    setIsSubmittingSimon(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingSimon(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setSimonResult(text.simonSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.simonSolvedPopup);
  };
  const submitRebus = async () => {
    if (!isRebusStation) {
      return;
    }

    if (!normalizedRebusInput) {
      setRebusResult(text.rebusEnter);
      return;
    }

    if (isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const isCorrect = normalizedRebusInput === rebusAnswer;
    if (!isCorrect) {
      const nextAttempts = rebusAttempts + 1;
      setRebusAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setRebusResult(text.rebusNoAttempts(rebusAnswer));
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.rebusFailedPopup);
        return;
      }

      setRebusResult(text.rebusIncorrect);
      return;
    }

    if (!onCompleteTask) {
      setRebusResult(text.rebusSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.rebusSolvedPopup);
      return;
    }

    setIsSubmittingRebus(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingRebus(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setRebusResult(text.rebusSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.rebusSolvedPopup);
  };
  const submitBoggle = async () => {
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
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.boggleFailedPopup);
        return;
      }

      setBoggleResult(text.boggleIncorrect);
      return;
    }

    if (!onCompleteTask) {
      setBoggleResult(text.boggleSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.boggleSolvedPopup);
      return;
    }

    setIsSubmittingBoggle(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingBoggle(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setBoggleResult(text.boggleSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.boggleSolvedPopup);
  };
  const selectBoggleBoardCell = (cellIndex: number) => {
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
  };
  const backspaceBoggleInput = () => {
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
  };
  const submitMiniSudoku = async () => {
    if (!isMiniSudokuStation || !miniSudokuPuzzle) {
      return;
    }

    if (isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0) {
      return;
    }

    const attemptedValues = miniSudokuPuzzle.given.map((givenValue, index) => givenValue ?? normalizedMiniSudokuValues[index] ?? "");
    if (attemptedValues.some((value) => value !== "1" && value !== "2")) {
      setMiniSudokuResult(text.miniSudokuFillAll);
      return;
    }

    const rowsValid = attemptedValues[0] !== attemptedValues[1] && attemptedValues[2] !== attemptedValues[3];
    const colsValid = attemptedValues[0] !== attemptedValues[2] && attemptedValues[1] !== attemptedValues[3];
    const matchesSolution = attemptedValues.every((value, index) => value === miniSudokuPuzzle.solution[index]);
    setQuizSubmitError(null);

    if (!(rowsValid && colsValid && matchesSolution)) {
      const nextAttempts = miniSudokuAttempts + 1;
      setMiniSudokuAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setMiniSudokuResult(text.miniSudokuNoAttempts(miniSudokuPuzzle.solution.join(" ")));
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        showQuizOutcomePopup("failed", text.miniSudokuFailedPopup);
        return;
      }

      setMiniSudokuResult(text.miniSudokuIncorrect);
      return;
    }

    if (!onCompleteTask) {
      setMiniSudokuResult(text.miniSudokuSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.miniSudokuSolvedPopup);
      return;
    }

    setIsSubmittingMiniSudoku(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingMiniSudoku(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert(text.alertErrorTitle, error);
      return;
    }

    setMiniSudokuResult(text.miniSudokuSolved);
    onQuizPassed?.(station.stationId);
    showQuizOutcomePopup("success", text.miniSudokuSolvedPopup);
  };
  const submitMatchingPair = async () => {
    if (!isMatchingStation || isInteractiveLocked || isSubmittingMatching || matchingAllMatched || matchingAttemptsLeft <= 0) {
      return;
    }

    if (!matchingSelectedLeft || !matchingSelectedRight) {
      setMatchingResult(text.matchingSetLine);
      return;
    }

    const selectedPair = matchingPairs.find((pair) => pair.left === matchingSelectedLeft);
    if (!selectedPair) {
      return;
    }

    setQuizSubmitError(null);
    if (selectedPair.right === matchingSelectedRight) {
      const nextMatched = [...matchingMatchedLeft, matchingSelectedLeft];
      setMatchingMatchedLeft(nextMatched);
      setMatchingLeftCarouselIndex(0);
      setMatchingRightCarouselIndex(0);
      if (nextMatched.length < matchingPairs.length) {
        setMatchingResult(text.matchingPairGood);
        return;
      }

      if (!onCompleteTask) {
        setMatchingResult(text.matchingSolved);
        onQuizPassed?.(station.stationId);
        showQuizOutcomePopup("success", text.matchingSolvedPopup);
        return;
      }

      setIsSubmittingMatching(true);
      const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
      setIsSubmittingMatching(false);
      if (error) {
        setQuizSubmitError(error);
        Alert.alert(text.alertErrorTitle, error);
        return;
      }

      setMatchingResult(text.matchingSolved);
      onQuizPassed?.(station.stationId);
      showQuizOutcomePopup("success", text.matchingSolvedPopup);
      return;
    }

    const nextAttempts = matchingAttempts + 1;
    setMatchingAttempts(nextAttempts);
    if (nextAttempts >= MEMORY_MAX_MISTAKES) {
      setMatchingResult(text.matchingNoAttempts);
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      showQuizOutcomePopup("failed", text.matchingFailedPopup);
      return;
    }

    setMatchingResult(text.matchingWrongPair);
  };
  const overlayBackdropStyle = {
    opacity: overlaySlideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  } as const;
  const overlayPanelStyle = {
    opacity: overlaySlideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        translateY: overlaySlideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [160, 0],
        }),
      },
    ],
  } as const;
  const isTimeoutOutcomePopup = quizOutcomePopup?.variant === "timeout";
  const quizOutcomeTitle = (() => {
    if (quizOutcomePopup?.variant === "success") {
      return text.outcomePassed;
    }
    if (isTimeoutOutcomePopup) {
      return text.outcomeTimedOut;
    }
    return text.outcomeFailed;
  })();
  const quizOutcomeAccent =
    quizOutcomePopup?.variant === "success"
      ? { border: "rgba(16, 185, 129, 0.55)", bg: "rgba(16, 185, 129, 0.18)", text: "#6ee7b7", icon: "✓" }
      : isTimeoutOutcomePopup
        ? { border: "rgba(245, 158, 11, 0.55)", bg: "rgba(245, 158, 11, 0.16)", text: "#fcd34d", icon: "⏳" }
        : { border: "rgba(239, 68, 68, 0.55)", bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5", icon: "✕" };
  const stationMediaRendererByType: Partial<Record<StationTestType, () => ReactNode>> = {
    wordle: () => (
      <WordleMediaBoard
        stationId={station.stationId}
        displayLength={wordleDisplayLength}
        attempts={wordleAttempts}
        revealedCellCounts={wordleRevealedCellCounts}
        cellSize={wordleBoardCellSize}
      />
    ),
    anagram: () => (
      <AnagramMediaPanel
        scrambledWords={anagramScrambledWords}
        hintWordCount={anagramHintWordCount}
        hintLettersLayout={anagramHintLettersLayout}
      />
    ),
    matching: () => (
      <View className="flex-1 px-2 py-2">
        <View className="flex-1 justify-center">
          <MatchingStationPanel
            matchingAttemptsLeft={matchingAttemptsLeft}
            matchingLeftOptions={matchingLeftCarouselOptions}
            matchingLeftIndex={matchingLeftCarouselIndex}
            matchingRightOptions={matchingRightCarouselOptions}
            matchingRightIndex={matchingRightCarouselIndex}
            matchingResult={matchingResult}
            isInteractiveLocked={isInteractiveLocked}
            onShiftLeft={(direction) => {
              if (isInteractiveLocked || isSubmittingMatching || matchingAllMatched || matchingAttemptsLeft <= 0) {
                return;
              }
              setMatchingLeftCarouselIndex((current) => current + direction);
              setMatchingResult(null);
              setQuizSubmitError(null);
            }}
            onShiftRight={(direction) => {
              if (isInteractiveLocked || isSubmittingMatching || matchingAllMatched || matchingAttemptsLeft <= 0) {
                return;
              }
              setMatchingRightCarouselIndex((current) => current + direction);
              setMatchingResult(null);
              setQuizSubmitError(null);
            }}
          />
        </View>

        <View className="mt-4 mb-24 items-center">
          <Animated.View style={matchingCheckPulseStyle}>
            <Pressable
              className="h-40 w-40 items-center justify-center rounded-full border-2 active:opacity-90"
              style={{
                borderColor: matchingCanSubmit ? "rgba(250, 204, 21, 0.88)" : "rgba(244, 244, 245, 0.2)",
                backgroundColor: matchingCanSubmit ? "rgba(250, 204, 21, 0.28)" : "rgba(24, 24, 27, 0.6)",
              }}
              onPress={() => {
                void submitMatchingPair();
              }}
              disabled={!matchingCanSubmit}
            >
              <Text className="px-2 text-center text-[15px] font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {isSubmittingMatching ? text.matchingChecking : text.matchingCheck}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View className="w-full px-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.matchingAttempts}: {matchingAttemptsLeft}
            </Text>
            <Text className="text-base font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.matchingMatched}: {matchingMatchedLeft.length}/{matchingPairs.length}
            </Text>
          </View>
        </View>
      </View>
    ),
    boggle: () => (
      <View className="flex-1 px-2 py-2">
        <BoggleStationPanel
          stationId={station.stationId}
          boggleBoardLetters={boggleBoardLetters}
          boggleAttemptsLeft={boggleAttemptsLeft}
          boggleMaxInputLength={boggleMaxInputLength}
          boggleInput={boggleInput}
          boggleResult={boggleResult}
          selectedCellPath={boggleSelectedCellPath}
          isActionDisabled={isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0}
          isSubmittingBoggle={isSubmittingBoggle}
          onChangeInput={(value) => {
            setBoggleInput(normalizePuzzleWord(value).slice(0, boggleMaxInputLength));
            setBoggleSelectedCellPath([]);
            setBoggleResult(null);
            setQuizSubmitError(null);
          }}
          onPressBoardCell={selectBoggleBoardCell}
          onBackspaceInput={backspaceBoggleInput}
          onSubmit={() => {
            void submitBoggle();
          }}
        />
      </View>
    ),
  };
  const renderedStationMedia = stationMediaRendererByType[station.stationType]?.() ?? null;
  const quizStationRendererByType: Partial<Record<StationTestType, () => ReactNode>> = {
    quiz: () => (
      <QuizAudioPanel
        station={station}
        isAudioQuizStation={false}
        quizOptions={quizOptions}
        selectedQuizOption={selectedQuizOption}
        isSubmittingQuizAnswer={isSubmittingQuizAnswer}
        hasTimedLimit={hasTimedLimit}
        hasTimerStarted={hasTimerStarted}
        isTimeExpired={isTimeExpired}
        hasAudioSource={hasAudioSource}
        isAudioLoading={isAudioLoading}
        isAudioPlaying={isAudioPlaying}
        audioLoadError={audioLoadError}
        quizResult={quizResult}
        feedbackTone={feedbackTone}
        quizFeedbackAnimation={quizFeedbackAnimation}
        onPlayAudio={() => {
          void handlePlayAudio();
        }}
        onSubmitQuizAnswer={(index) => {
          void submitQuizAnswer(index);
        }}
      />
    ),
    "audio-quiz": () => (
      <QuizAudioPanel
        station={station}
        isAudioQuizStation
        quizOptions={quizOptions}
        selectedQuizOption={selectedQuizOption}
        isSubmittingQuizAnswer={isSubmittingQuizAnswer}
        hasTimedLimit={hasTimedLimit}
        hasTimerStarted={hasTimerStarted}
        isTimeExpired={isTimeExpired}
        hasAudioSource={hasAudioSource}
        isAudioLoading={isAudioLoading}
        isAudioPlaying={isAudioPlaying}
        audioLoadError={audioLoadError}
        quizResult={quizResult}
        feedbackTone={feedbackTone}
        quizFeedbackAnimation={quizFeedbackAnimation}
        onPlayAudio={() => {
          void handlePlayAudio();
        }}
        onSubmitQuizAnswer={(index) => {
          void submitQuizAnswer(index);
        }}
      />
    ),
    wordle: () => (
      <WordleInteractionPanel
        stationId={station.stationId}
        displayLength={wordleDisplayLength}
        inputCharacters={wordleInputCharacters}
        boardCellSize={wordleBoardCellSize}
        keyboardKeySize={wordleKeyboardKeyWidth}
        keyboardKeyGap={wordleKeyboardKeyGap}
        keyStateByLetter={wordleKeyStateByLetter}
        isInteractiveDisabled={isWordleInteractiveDisabled}
        isRevealing={isWordleRevealAnimating}
        isSubmitting={isSubmittingWordleGuess}
        canSubmit={normalizedWordleInput.length === (wordleLength || 0)}
        canBackspace={!isWordleInteractiveDisabled && normalizedWordleInput.length > 0}
        onLayoutKeyboard={(nextWidth) => {
          if (Math.abs(nextWidth - wordleKeyboardContainerWidth) > 1) {
            setWordleKeyboardContainerWidth(nextWidth);
          }
        }}
        onPressKey={(key) => {
          setWordleInput((current) => {
            const nextValue = `${current}${key}`.slice(0, wordleLength || 32);
            return nextValue === current ? current : nextValue;
          });
        }}
        onBackspace={() => {
          setWordleInput((current) => {
            if (!current.length) {
              return current;
            }
            return current.slice(0, -1);
          });
        }}
        onSubmit={() => {
          void submitWordleGuess();
        }}
      />
    ),
    hangman: () => (
      <HangmanStationPanel
        stationId={station.stationId}
        hangmanMisses={hangmanMisses}
        hangmanAttemptsLeft={hangmanAttemptsLeft}
        hangmanMaskedSecret={hangmanMaskedSecret}
        hangmanInput={hangmanInput}
        hangmanResult={hangmanResult}
        guessedHangmanSet={guessedHangmanSet}
        isInputEditable={station.status !== "done" && station.status !== "failed" && !isSubmittingHangmanGuess}
        isGuessDisabled={
          station.status === "done" ||
          station.status === "failed" ||
          isSubmittingHangmanGuess ||
          (hasTimedLimit && !hasTimerStarted) ||
          isTimeExpired ||
          hangmanAttemptsLeft <= 0 ||
          hangmanHasWon
        }
        isSubmittingHangmanGuess={isSubmittingHangmanGuess}
        onChangeInput={(value) => {
          setHangmanInput(value);
          setHangmanResult(null);
          setQuizSubmitError(null);
        }}
        onSubmitGuess={() => {
          void submitHangmanGuess();
        }}
        onSubmitLetter={(letter) => {
          void submitHangmanGuess(letter);
        }}
      />
    ),
    mastermind: () => (
      <MastermindStationPanel
        stationId={station.stationId}
        mastermindAttempts={mastermindAttempts}
        mastermindAttemptsLeft={mastermindAttemptsLeft}
        mastermindInput={mastermindInput}
        mastermindResult={mastermindResult}
        isInputEditable={!isInteractiveLocked && !isSubmittingMastermindGuess && !mastermindSolved}
        isActionDisabled={isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0}
        isSymbolDisabled={isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0}
        isSubmittingMastermindGuess={isSubmittingMastermindGuess}
        onChangeInput={(value) => {
          setMastermindInput(value);
          setMastermindResult(null);
          setQuizSubmitError(null);
        }}
        onSubmitGuess={() => {
          void submitMastermindGuess();
        }}
        onAddSymbol={(symbol) => {
          if (isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0) {
            return;
          }
          setMastermindInput((current) => `${current}${symbol}`.slice(0, 4));
          setMastermindResult(null);
        }}
      />
    ),
    anagram: () => (
      <AnagramStationPanel
        anagramAttemptsLeft={anagramAttemptsLeft}
        anagramInput={anagramInput}
        anagramResult={anagramResult}
        isActionDisabled={isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0}
        isSubmittingAnagram={isSubmittingAnagram}
        onChangeInput={(value) => {
          setAnagramInput(value);
          setAnagramResult(null);
          setQuizSubmitError(null);
        }}
        onSubmit={() => {
          void submitAnagram();
        }}
      />
    ),
    "caesar-cipher": () => (
      <CaesarStationPanel
        caesarInput={caesarInput}
        caesarMaxLength={caesarMaxLength}
        caesarResult={caesarResult}
        isActionDisabled={isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0}
        isSubmittingCaesar={isSubmittingCaesar}
        onChangeInput={(value) => {
          setCaesarInput(value.slice(0, caesarMaxLength));
          setCaesarResult(null);
          setQuizSubmitError(null);
        }}
        onAppendCharacter={(character) => {
          if (isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0) {
            return;
          }

          setCaesarInput((current) => {
            if (current.length >= caesarMaxLength) {
              return current;
            }
            if (character === " " && (current.length === 0 || current.endsWith(" "))) {
              return current;
            }
            return `${current}${character}`.slice(0, caesarMaxLength);
          });
          setCaesarResult(null);
          setQuizSubmitError(null);
        }}
        onBackspace={() => {
          if (isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0) {
            return;
          }

          setCaesarInput((current) => current.slice(0, -1));
          setCaesarResult(null);
          setQuizSubmitError(null);
        }}
        onSubmit={() => {
          void submitCaesar();
        }}
      />
    ),
    memory: () => (
      <MemoryStationPanel
        memoryDeck={memoryDeck}
        memoryMatchedCount={memoryMatchedCount}
        memoryMistakes={memoryMistakes}
        memoryAttemptsLeft={memoryAttemptsLeft}
        memoryBusy={memoryBusy}
        memoryResult={memoryResult}
        isInteractiveLocked={isInteractiveLocked}
        onPressCard={(cardId) => {
          void handleMemoryCardPress(cardId);
        }}
      />
    ),
    simon: () => (
      <SimonStationPanel
        stationId={station.stationId}
        simonSequence={simonSequence}
        simonHiddenHint={simonHiddenHint}
        simonHintVisible={simonHintVisible}
        simonProgress={simonProgress}
        simonResult={simonResult}
        isInteractiveLocked={isInteractiveLocked}
        isSubmittingSimon={isSubmittingSimon}
        onPressButton={(buttonId) => {
          void handleSimonPress(buttonId);
        }}
      />
    ),
    rebus: () => (
      <RebusStationPanel
        rebusQuestion={station.quizQuestion?.trim() || "🏕️ + QUEST = ?"}
        rebusAttemptsLeft={rebusAttemptsLeft}
        rebusInput={rebusInput}
        rebusResult={rebusResult}
        isActionDisabled={isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0}
        isSubmittingRebus={isSubmittingRebus}
        onChangeInput={(value) => {
          setRebusInput(value);
          setRebusResult(null);
          setQuizSubmitError(null);
        }}
        onSubmit={() => {
          void submitRebus();
        }}
      />
    ),
    "mini-sudoku": () => (
      <MiniSudokuStationPanel
        stationId={station.stationId}
        miniSudokuPuzzle={miniSudokuPuzzle}
        normalizedMiniSudokuValues={normalizedMiniSudokuValues}
        miniSudokuAttemptsLeft={miniSudokuAttemptsLeft}
        miniSudokuResult={miniSudokuResult}
        isActionDisabled={isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0}
        isSubmittingMiniSudoku={isSubmittingMiniSudoku}
        onChangeCell={(index, nextValue) => {
          setMiniSudokuValues((current) => {
            const next = [...current];
            next[index] = nextValue.replace(/[^1-2]/g, "").slice(0, 1);
            return next;
          });
          setMiniSudokuResult(null);
          setQuizSubmitError(null);
        }}
        onSubmit={() => {
          void submitMiniSudoku();
        }}
      />
    ),
  };
  const renderedQuizStation = quizStationRendererByType[station.stationType]?.() ?? null;
  const stationHeaderLabel = isCaesarStation
    ? station.typeLabel
    : `${station.name} • ${station.typeLabel}`;

  return (
    <Animated.View className="absolute inset-0 z-50" style={[{ backgroundColor: "rgba(15, 25, 20, 0.9)" }, overlayBackdropStyle]}>
      <Animated.View className="flex-1 px-3 pb-5 pt-9" style={overlayPanelStyle}>
        <View className="flex-1 rounded-3xl border" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}>
          <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
            <View className="flex-1">
                <Text
                  className="uppercase tracking-widest"
                  style={{ color: EXPEDITION_THEME.textSubtle, fontSize: isTabletOverlay ? 13 : 11 }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stationHeaderLabel}
                </Text>
            </View>
            <Pressable
              className="items-center justify-center rounded-full border active:opacity-90"
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelMuted,
                width: isTabletOverlay ? 48 : 36,
                height: isTabletOverlay ? 48 : 36,
              }}
              onPress={onRequestClose ?? onClose}
              hitSlop={8}
            >
              <Text
                className="font-semibold text-center"
                style={{
                  color: EXPEDITION_THEME.textPrimary,
                  lineHeight: isTabletOverlay ? 20 : 16,
                  fontSize: isTabletOverlay ? 20 : 16,
                  includeFontPadding: false,
                }}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 px-4">
            <View className="flex-1">
              <View
                className={`${isNumericCodeStation ? "mt-0.5" : "mt-1"} w-full overflow-hidden rounded-2xl border`}
                style={{
                  ...(requiresCode
                    ? { flex: 1, minHeight: Math.max(140, Math.round(viewportHeight * 0.24)) }
                    : { height: stationMediaHeight }),
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                {isCaesarStation ? (
                  <View className="flex-1 px-4 pb-3 pt-4">
                    <View className="flex-1 items-center justify-center">
                      <Text
                        className="text-center font-black tracking-[5px]"
                        style={{ color: EXPEDITION_THEME.accentStrong, fontSize: isTabletOverlay ? 72 : 48, lineHeight: isTabletOverlay ? 76 : 52 }}
                        adjustsFontSizeToFit
                        minimumFontScale={0.55}
                        numberOfLines={2}
                      >
                        {caesarEncoded}
                      </Text>
                      <Text
                        className="mt-3 text-center font-semibold"
                        style={{ color: EXPEDITION_THEME.textMuted, fontSize: isTabletOverlay ? 24 : 18 }}
                      >
                        {text.caesarShiftHint(caesarShiftValue)}
                      </Text>
                    </View>
                    <AttemptsIndicator
                      label={text.caesarAttemptsLeftLabel}
                      attemptsLeft={caesarAttemptsLeft}
                      maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
                      align="center"
                    />
                  </View>
                ) : renderedStationMedia ? (
                  renderedStationMedia
                ) : shouldShowQuizFallbackGraphic ? (
                  <View className="flex-1 items-center justify-center">
                    {!quizIconLoadFailed ? (
                      <Image
                        source={{ uri: QUIZ_BRAIN_ICON_URI }}
                        style={{ width: "62%", height: "62%", tintColor: "#ffffff" }}
                        resizeMode="contain"
                        onError={() => setQuizIconLoadFailed(true)}
                      />
                    ) : (
                      <Text className="text-4xl">🧠</Text>
                    )}
                  </View>
                ) : stationImageUri ? (
                  <Image
                    source={{ uri: stationImageUri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onError={() => setImageLoadFailed(true)}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-3xl">📍</Text>
                  </View>
                )}
              </View>

              {requiresCode ? (
                <View
                  className="my-3 px-1"
                >
                  <Text
                    className="leading-6"
                    style={{ color: EXPEDITION_THEME.textMuted, textAlign: "justify", fontSize: isTabletOverlay ? 18 : 16 }}
                  >
                    {stationDescription.length > 0
                      ? stationDescription
                      : text.taskDescriptionMissing}
                  </Text>
                </View>
              ) : !isCaesarStation && stationDescription.length > 0 ? (
                <Text
                  className={`${isNumericCodeStation ? "mt-2" : "mt-3"} leading-5`}
                  style={{ color: EXPEDITION_THEME.textMuted, fontSize: isTabletOverlay ? 16 : 14 }}
                >
                  {stationDescription}
                </Text>
              ) : null}
              {isAnagramStation ? (
                <Text className="mt-2 leading-5" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: isTabletOverlay ? 14 : 12 }}>
                  {text.anagramDisplayHint}
                </Text>
              ) : null}

              {isQuizStation && !isMatchingStation && !isBoggleStation ? (
                <View
                  className="mt-3 rounded-2xl border"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: EXPEDITION_THEME.textPrimary, fontSize: isTabletOverlay ? 21 : 16, paddingHorizontal: 12, paddingTop: 12 }}
                  >
                    {resolveStationQuizPrompt({ station, wordleLength, uiLanguage })}
                  </Text>
                  <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  {renderedQuizStation}
                  </View>

                  {quizSubmitError ? (
                    <Text
                      className="mt-2 text-center"
                      style={{ color: EXPEDITION_THEME.danger, fontSize: isTabletOverlay ? 14 : 12 }}
                    >
                      {quizSubmitError}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {requiresCode ? (
              <CodeStationPanel
                station={station}
                isNumericCodeStation={isNumericCodeStation}
                hasTimedLimit={hasTimedLimit}
                hasTimerStarted={hasTimerStarted}
                isTimeExpired={isTimeExpired}
                isCodeActionDisabled={isCodeActionDisabled}
                verificationCode={verificationCode}
                isCodeInputInvalid={isCodeInputInvalid}
                isCodeInputSuccess={isCodeInputSuccess}
                codeResult={codeResult}
                isSubmittingCode={isSubmittingCode}
                codeInputShakeAnimation={codeInputShakeAnimation}
                onChangeVerificationCode={(value) => {
                  setVerificationCode(value);
                }}
                onBackspaceVerificationCode={() => {
                  setVerificationCode((current) => current.slice(0, -1));
                }}
                onAppendVerificationCode={(value) => {
                  setVerificationCode((current) => `${current}${value}`.slice(0, 32));
                }}
                onSubmitVerificationCode={() => {
                  void submitVerificationCode();
                }}
                onResetCodeFeedback={() => {
                  setIsCodeInputInvalid(false);
                  setIsCodeInputSuccess(false);
                  setCodeResult(null);
                }}
              />
            ) : null}

          </View>

          <View className={`px-4 ${isNumericCodeStation ? "pb-3 pt-1" : "pb-4 pt-2"}`}>
            <View className="flex-row items-end">
              <View className="flex-1" />
              {shouldShowExecutionTimer ? (
                <View className="items-center px-4 py-2">
                  <Animated.Text
                    className={`text-center ${isNumericCodeStation ? "text-5xl" : "text-6xl"} font-extrabold`}
                    style={[{ color: timerTextColor }, timerPulseStyle]}
                  >
                    {executionTimeLabel}
                  </Animated.Text>
                  <Text
                    className="mt-1 text-center text-[10px] uppercase tracking-widest"
                    style={{ color: EXPEDITION_THEME.textSubtle }}
                  >
                    {text.executionTimerLabel}
                  </Text>
                </View>
              ) : null}
              <View className="flex-1 items-end">
                <View
                  className="rounded-2xl border px-3 py-2"
                  style={{ borderColor: "rgba(252, 211, 77, 0.4)", backgroundColor: "rgba(252, 211, 77, 0.1)" }}
                >
                  <Text className="text-[10px] uppercase tracking-widest" style={{ color: "#fcd34d" }}>
                    {text.points}
                  </Text>
                  <Text className="mt-0.5 text-right text-lg font-extrabold" style={{ color: "#fcd34d" }}>
                    {station.points}
                  </Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      </Animated.View>
      {quizOutcomePopup ? (
        <View
          className="absolute inset-0 items-center justify-center px-6"
          style={{ zIndex: 80, backgroundColor: "rgba(15, 25, 20, 0.6)" }}
        >
          <View
            className="relative w-full max-w-md rounded-3xl border px-6 py-6"
            style={{
              borderColor: quizOutcomeAccent.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
          >
            {isTimeoutOutcomePopup && timeoutPopupSecondsLeft !== null ? (
              <View
                className="absolute right-4 top-4 rounded-lg border px-2 py-1"
                style={{
                  borderColor: "rgba(245, 158, 11, 0.45)",
                  backgroundColor: "rgba(245, 158, 11, 0.16)",
                }}
              >
                <Text className="text-xs font-bold" style={{ color: "#fcd34d" }}>
                  {`${timeoutPopupSecondsLeft}s`}
                </Text>
              </View>
            ) : null}
            <View
              className="mb-4 w-full items-center justify-center rounded-2xl border py-4"
              style={{
                borderColor: quizOutcomeAccent.border,
                backgroundColor: quizOutcomeAccent.bg,
              }}
            >
              <Text className="text-4xl font-black" style={{ color: quizOutcomeAccent.text }}>
                {quizOutcomeAccent.icon}
              </Text>
            </View>
            <Text className="text-center text-3xl font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {quizOutcomeTitle}
            </Text>
            <Text className="mt-3 text-center text-base leading-7" style={{ color: EXPEDITION_THEME.textMuted }}>
              {quizOutcomePopup.message}
            </Text>
            <Pressable
              className="mt-6 h-12 w-full items-center justify-center rounded-xl px-4 py-3 active:opacity-90"
              style={{
                backgroundColor:
                  quizOutcomePopup.variant === "success"
                    ? "#059669"
                    : isTimeoutOutcomePopup
                      ? "#b45309"
                      : "#dc2626",
              }}
              onPress={closeQuizOutcomePopup}
            >
              <Text className="w-full text-center text-base font-semibold" style={{ color: "#f8fafc" }}>
                {isTimeoutOutcomePopup ? text.backToMapNow : text.backToMap}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
