import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Animated, Keyboard, Pressable, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../shared/layout/use-adaptive-layout";
import { CodeStationPanel } from "./station-panels/code-station-panel";
import type { MastermindAttempt } from "./station-panels/mastermind-station-panel";
import { StationMediaPanel } from "./station-panels/station-media-panel";
import { QuizOutcomePopupPanel, type QuizOutcomePopup } from "./station-panels/quiz-outcome-popup-panel";
import { resolveStationQuizPrompt } from "./station-panels/quiz-audio-station-panel";
import { StationQuizTaskWrapper } from "./station-panels/shared-ui";
import { useAudioQuizPlayback } from "./station-panels/use-audio-quiz-playback";
import { useStationCountdownPulse } from "./station-panels/use-station-countdown-pulse";
import { createStationPreviewActions } from "./station-panels/use-station-preview-actions";
import { useStationOverlayReset } from "./station-panels/use-station-overlay-reset";
import { buildStationPreviewModel } from "./station-panels/use-station-preview-model";
import { useStationTimeoutOutcome } from "./station-panels/use-station-timeout-outcome";
import { buildQuizStationRendererByType, buildStationMediaRendererByType } from "./station-panels/station-renderers";
import type { WordleAttempt } from "./station-panels/wordle-station-panel";
import type {
  StationPreviewOverlayProps,
  StationTestViewModel,
} from "./types";

import {
  type MemoryCard,
  normalizeWordleSecret,
  resolvePuzzleSecret,
  resolveSimonSequence,
} from "./puzzle-helpers";

const WORDLE_REVEAL_CELL_DELAY_MS = 340;
const WORDLE_REVEAL_FINISH_BUFFER_MS = 110;
const TIMEOUT_POPUP_AUTO_CLOSE_SECONDS = 10;
const SIMON_INITIAL_SEQUENCE_LENGTH = 3;
const SIMON_MAX_MISTAKES = 3;
const SIMON_PLAY_STEP_MS = 420;
const SIMON_PAUSE_BETWEEN_STEPS_MS = 170;
const SIMON_SEQUENCE_START_DELAY_MS = 650;
const SIMON_INPUT_HIGHLIGHT_MS = 220;
const SIMON_TONE_ASSET_BY_BUTTON: Record<string, number> = {
  "1": require("./assets/simon-tones/1.wav"),
  "2": require("./assets/simon-tones/2.wav"),
  "3": require("./assets/simon-tones/3.wav"),
  "4": require("./assets/simon-tones/4.wav"),
  "5": require("./assets/simon-tones/5.wav"),
  "6": require("./assets/simon-tones/6.wav"),
  "7": require("./assets/simon-tones/7.wav"),
  "8": require("./assets/simon-tones/8.wav"),
  "9": require("./assets/simon-tones/9.wav"),
};

function resolveSuccessOutcomeMessage(station: StationTestViewModel, text: StationPreviewText) {
  if (station.stationType === "wordle") {
    return text.wordleSolvedPopup;
  }
  if (station.stationType === "hangman") {
    return text.hangmanSolvedPopup;
  }
  if (station.stationType === "mastermind") {
    return text.mastermindSolvedPopup;
  }
  if (station.stationType === "anagram") {
    return text.anagramSolvedPopup;
  }
  if (station.stationType === "caesar-cipher") {
    return text.caesarSolvedPopup;
  }
  if (station.stationType === "memory") {
    return text.memorySolvedPopup;
  }
  if (station.stationType === "simon") {
    return text.simonSolvedPopup;
  }
  if (station.stationType === "rebus") {
    return text.rebusSolvedPopup;
  }
  if (station.stationType === "boggle") {
    return text.boggleSolvedPopup;
  }
  if (station.stationType === "mini-sudoku") {
    return text.miniSudokuSolvedPopup;
  }
  if (station.stationType === "matching") {
    return text.matchingSolvedPopup;
  }
  if (station.stationType === "time" || station.stationType === "points") {
    return text.codeApproved;
  }
  return text.quizSuccessPopup;
}


type StationPreviewText = {
  fallbackQuizOptions: string[];
  audioSourceMissing: string;
  audioLoadFailed: string;
  audioPlayFailed: string;
  audioOverlayPlay: string;
  audioOverlayStop: string;
  audioOverlayReplay: string;
  audioOverlayStatusReady: string;
  audioOverlayStatusPlaying: string;
  audioOverlayStatusDisabled: string;
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
  miniSudokuNoAttempts: () => string;
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
  audioOverlayPlay: "Play",
  audioOverlayStop: "Stop",
  audioOverlayReplay: "Replay",
  audioOverlayStatusReady: "Ready",
  audioOverlayStatusPlaying: "Playing",
  audioOverlayStatusDisabled: "Disabled",
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
  codeApprovedTestMode: "Code approved.",
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
  mastermindNoAttempts: () => "No attempts left.",
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
  miniSudokuFillAll: "Fill all empty cells with digits 1-9.",
  miniSudokuNoAttempts: () => "No attempts left.",
  miniSudokuFailedPopup: "Failed to solve mini Sudoku.",
  miniSudokuIncorrect: "Incorrect value. Check row, column and 3x3 box.",
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
  audioOverlayPlay: "Відтворити",
  audioOverlayStop: "Стоп",
  audioOverlayReplay: "Повтор",
  audioOverlayStatusReady: "Готово",
  audioOverlayStatusPlaying: "Відтворення",
  audioOverlayStatusDisabled: "Недоступно",
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
  codeApprovedTestMode: "Код підтверджено.",
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
  mastermindNoAttempts: () => "Спроб не залишилося.",
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
  miniSudokuFillAll: "Заповніть усі порожні поля цифрами 1-9.",
  miniSudokuNoAttempts: () => "Спроб не залишилося.",
  miniSudokuFailedPopup: "Не вдалося розв'язати міні Sudoku.",
  miniSudokuIncorrect: "Неправильне значення. Перевірте рядок, стовпець і блок 3x3.",
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
  audioOverlayPlay: "Воспроизвести",
  audioOverlayStop: "Стоп",
  audioOverlayReplay: "Повтор",
  audioOverlayStatusReady: "Готово",
  audioOverlayStatusPlaying: "Воспроизведение",
  audioOverlayStatusDisabled: "Недоступно",
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
  codeApprovedTestMode: "Код подтвержден.",
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
  mastermindNoAttempts: () => "Попыток не осталось.",
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
  miniSudokuFillAll: "Заполните все пустые ячейки цифрами 1-9.",
  miniSudokuNoAttempts: () => "Попыток не осталось.",
  miniSudokuFailedPopup: "Не удалось решить мини Sudoku.",
  miniSudokuIncorrect: "Неверное значение. Проверьте строку, столбец и блок 3x3.",
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
    audioOverlayPlay: "Odtwórz",
    audioOverlayStop: "Stop",
    audioOverlayReplay: "Powtórz",
    audioOverlayStatusReady: "Gotowe",
    audioOverlayStatusPlaying: "Odtwarzanie",
    audioOverlayStatusDisabled: "Niedostępne",
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
    codeApprovedTestMode: "Kod zatwierdzony.",
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
    mastermindNoAttempts: () => "Brak prób.",
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
    miniSudokuFillAll: "Uzupełnij wszystkie puste pola cyframi 1-9.",
    miniSudokuNoAttempts: () => "Brak prób.",
    miniSudokuFailedPopup: "Nie udało się rozwiązać mini Sudoku.",
    miniSudokuIncorrect: "Niepoprawna wartość. Sprawdź wiersz, kolumnę i pole 3x3.",
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
  const adaptiveLayout = useAdaptiveLayout();
  const uiLanguage = useUiLanguage();
  const text = STATION_PREVIEW_TEXT[uiLanguage];
  const { height: viewportHeight, width: viewportWidth } = adaptiveLayout;
  const isTabletOverlay = adaptiveLayout.isTablet;
  const isLightTheme = getExpeditionThemeMode() === "light";
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [wordleInput, setWordleInput] = useState("");
  const [wordleAttempts, setWordleAttempts] = useState<WordleAttempt[]>([]);
  const [wordleResult, setWordleResult] = useState<string | null>(null);
  const [wordleRevealedCellCounts, setWordleRevealedCellCounts] = useState<number[]>([]);
  const [isWordleRevealAnimating, setIsWordleRevealAnimating] = useState(false);
  const [hangmanGuessedLetters, setHangmanGuessedLetters] = useState<string[]>([]);
  const [hangmanMisses, setHangmanMisses] = useState<string[]>([]);
  const [hangmanResult, setHangmanResult] = useState<string | null>(null);
  const [mastermindInput, setMastermindInput] = useState("");
  const [mastermindAttempts, setMastermindAttempts] = useState<MastermindAttempt[]>([]);
  const [, setMastermindResult] = useState<string | null>(null);
  const [anagramInput, setAnagramInput] = useState("");
  const [anagramAttempts, setAnagramAttempts] = useState(0);
  const [anagramResult, setAnagramResult] = useState<string | null>(null);
  const [caesarInput, setCaesarInput] = useState("");
  const [caesarAttempts, setCaesarAttempts] = useState(0);
  const [caesarResult, setCaesarResult] = useState<string | null>(null);
  const [memoryDeck, setMemoryDeck] = useState<MemoryCard[]>([]);
  const [memorySelection, setMemorySelection] = useState<string[]>([]);
  const [memoryResult, setMemoryResult] = useState<string | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [simonInput, setSimonInput] = useState<string[]>([]);
  const [simonTargetLength, setSimonTargetLength] = useState(SIMON_INITIAL_SEQUENCE_LENGTH);
  const [simonMistakes, setSimonMistakes] = useState(0);
  const [simonActivePlaybackButtonId, setSimonActivePlaybackButtonId] = useState<string | null>(null);
  const [simonActiveInputButtonId, setSimonActiveInputButtonId] = useState<string | null>(null);
  const [isSimonPlaybackActive, setIsSimonPlaybackActive] = useState(false);
  const [simonResult, setSimonResult] = useState<string | null>(null);
  const [rebusInput, setRebusInput] = useState("");
  const [rebusAttempts, setRebusAttempts] = useState(0);
  const [rebusResult, setRebusResult] = useState<string | null>(null);
  const [boggleInput, setBoggleInput] = useState("");
  const [boggleSelectedCellPath, setBoggleSelectedCellPath] = useState<number[]>([]);
  const [boggleAttempts, setBoggleAttempts] = useState(0);
  const [boggleResult, setBoggleResult] = useState<string | null>(null);
  const [miniSudokuValues, setMiniSudokuValues] = useState<string[]>(
    Array.from({ length: 81 }, () => ""),
  );
  const [miniSudokuResult, setMiniSudokuResult] = useState<string | null>(null);
  const [matchingConnections, setMatchingConnections] = useState<Record<string, string>>({});
  const [matchingAttempts, setMatchingAttempts] = useState(0);
  const [matchingResult, setMatchingResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
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
  const codeInputShakeAnimation = useRef(new Animated.Value(0)).current;
  const codeInputResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeInputSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simonTonePlayerRef = useRef<AudioPlayer | null>(null);
  const simonTonePlayerSourceButtonRef = useRef<string | null>(null);
  const simonPlaybackRunRef = useRef(0);
  const simonInputHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const memoryHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordleRevealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timeoutPopupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizOutcomeActionRef = useRef<(() => void) | null>(null);
  const previousStatusByStationIdRef = useRef<Record<string, StationTestViewModel["status"]>>({});
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
    const onDismiss = quizOutcomeActionRef.current ?? onClose;
    quizOutcomeActionRef.current = null;
    clearTimeoutPopupCountdown();
    setQuizOutcomePopup(null);
    onDismiss?.();
  }, [clearTimeoutPopupCountdown, onClose]);

  useEffect(() => {
    const stationId = displayedStation?.stationId;
    if (!stationId) {
      return;
    }

    const currentStatus = displayedStation.status;
    const previousStatus = previousStatusByStationIdRef.current[stationId];
    previousStatusByStationIdRef.current[stationId] = currentStatus;

    const stationSeenBefore = previousStatus !== undefined;
    const transitionedToDone = stationSeenBefore && previousStatus !== "done" && currentStatus === "done";
    if (!transitionedToDone) {
      return;
    }

    if (quizOutcomePopup?.variant === "success") {
      return;
    }

    showQuizOutcomePopup("success", resolveSuccessOutcomeMessage(displayedStation, text));
  }, [displayedStation, quizOutcomePopup?.variant, showQuizOutcomePopup, text]);
  const {
    audioLoadError,
    isAudioLoading,
    isAudioPlaying,
    hasAudioPlaybackStarted,
    resetAudioPlaybackState,
    handlePlayAudio,
    handleStopAudio,
  } = useAudioQuizPlayback({
    stationType: displayedStation?.stationType,
    quizAudioUrl: displayedStation?.quizAudioUrl,
    text: {
      audioSourceMissing: text.audioSourceMissing,
      audioLoadFailed: text.audioLoadFailed,
      audioPlayFailed: text.audioPlayFailed,
    },
  });
  const stopSimonTonePlayback = useCallback(() => {
    const player = simonTonePlayerRef.current;
    if (!player) {
      return;
    }
    try {
      player.pause();
    } catch {
      // noop
    }
    void player.seekTo(0).catch(() => undefined);
  }, []);
  const clearSimonInputHighlight = useCallback(() => {
    if (!simonInputHighlightTimeoutRef.current) {
      return;
    }
    clearTimeout(simonInputHighlightTimeoutRef.current);
    simonInputHighlightTimeoutRef.current = null;
  }, []);
  const ensureSimonTonePlayer = useCallback(
    (buttonId: string) => {
      const toneAssetId = SIMON_TONE_ASSET_BY_BUTTON[buttonId];
      if (!toneAssetId) {
        return null;
      }

      let player = simonTonePlayerRef.current;
      if (!player) {
        player = createAudioPlayer(
          toneAssetId,
          {
            updateInterval: 250,
            keepAudioSessionActive: true,
          },
        );
        simonTonePlayerRef.current = player;
        simonTonePlayerSourceButtonRef.current = buttonId;
        return player;
      }

      if (simonTonePlayerSourceButtonRef.current !== buttonId) {
        try {
          player.replace(toneAssetId);
          simonTonePlayerSourceButtonRef.current = buttonId;
        } catch {
          return null;
        }
      }

      return player;
    },
    [],
  );
  const primeSimonTonePlayers = useCallback((buttonId: string) => {
    ensureSimonTonePlayer(buttonId);
  }, [ensureSimonTonePlayer]);
  const releaseSimonTonePlayers = useCallback(() => {
    const player = simonTonePlayerRef.current;
    simonTonePlayerRef.current = null;
    simonTonePlayerSourceButtonRef.current = null;
    if (!player) {
      return;
    }
    try {
      player.pause();
    } catch {
      // noop
    }
    try {
      player.remove();
    } catch {
      // noop
    }
  }, []);
  const playSimonTone = useCallback(
    async (buttonId: string) => {
      const activePlayer = ensureSimonTonePlayer(buttonId);
      if (!activePlayer) {
        return;
      }

      activePlayer.volume = 1;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await activePlayer.seekTo(0).catch(() => undefined);
        try {
          activePlayer.play();
        } catch {
          // noop
        }

        await new Promise<void>((resolve) => {
          setTimeout(resolve, 35);
        });
        if (activePlayer.playing) {
          return;
        }
      }
    },
    [ensureSimonTonePlayer],
  );
  const stopSimonPlayback = useCallback(() => {
    simonPlaybackRunRef.current += 1;
    clearSimonInputHighlight();
    stopSimonTonePlayback();
    setSimonActivePlaybackButtonId(null);
    setSimonActiveInputButtonId(null);
    setIsSimonPlaybackActive(false);
  }, [clearSimonInputHighlight, stopSimonTonePlayback]);
  const playSimonSequence = useCallback(
    async (sequence: string[]) => {
      if (!sequence.length) {
        stopSimonPlayback();
        return;
      }

      const runId = simonPlaybackRunRef.current + 1;
      simonPlaybackRunRef.current = runId;
      setIsSimonPlaybackActive(true);
      setSimonActivePlaybackButtonId(null);
      setSimonActiveInputButtonId(null);
      setSimonInput([]);

      const wait = (durationMs: number) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, durationMs);
        });

      await wait(SIMON_SEQUENCE_START_DELAY_MS);
      if (simonPlaybackRunRef.current !== runId) {
        return;
      }

      for (const buttonId of sequence) {
        if (simonPlaybackRunRef.current !== runId) {
          return;
        }
        setSimonActivePlaybackButtonId(buttonId);
        await playSimonTone(buttonId);
        await wait(SIMON_PLAY_STEP_MS);

        if (simonPlaybackRunRef.current !== runId) {
          return;
        }
        setSimonActivePlaybackButtonId(null);
        await wait(SIMON_PAUSE_BETWEEN_STEPS_MS);
      }

      if (simonPlaybackRunRef.current !== runId) {
        return;
      }
      setSimonActivePlaybackButtonId(null);
      setIsSimonPlaybackActive(false);
    },
    [playSimonTone, stopSimonPlayback],
  );
  useEffect(() => {
    if (stationProp) {
      setDisplayedStation((current) => {
        if (
          current &&
          current.stationId === stationProp.stationId &&
          current.status === stationProp.status &&
          current.startedAt === stationProp.startedAt &&
          current.quizFailed === stationProp.quizFailed &&
          current.timeLimitSeconds === stationProp.timeLimitSeconds &&
          current.points === stationProp.points
        ) {
          return current;
        }

        return stationProp;
      });
      setIsOverlayMounted((current) => (current ? current : true));
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
  }, [
    overlaySlideAnimation,
    stationProp,
    stationProp?.points,
    stationProp?.quizFailed,
    stationProp?.startedAt,
    stationProp?.stationId,
    stationProp?.status,
    stationProp?.timeLimitSeconds,
  ]);

  useStationOverlayReset({
    displayedStation,
    stationResetKey: displayedStation?.stationId ?? null,
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
  });

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
      stopSimonPlayback();
      return;
    }

    const sequence = resolveSimonSequence(displayedStation);
    const initialLength = Math.max(
      1,
      Math.min(SIMON_INITIAL_SEQUENCE_LENGTH, sequence.length),
    );
    setSimonInput([]);
    setSimonMistakes(0);
    setSimonTargetLength(initialLength);
    setSimonResult(null);
    primeSimonTonePlayers(sequence[0] ?? "1");
    void playSimonSequence(sequence.slice(0, initialLength));

    return () => {
      stopSimonPlayback();
    };
  }, [displayedStation, playSimonSequence, primeSimonTonePlayers, stopSimonPlayback]);

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
      stopSimonPlayback();
      releaseSimonTonePlayers();
      clearWordleRevealTimeouts();
      clearTimeoutPopupCountdown();
      quizOutcomeActionRef.current = null;
    };
  }, [clearTimeoutPopupCountdown, clearWordleRevealTimeouts, releaseSimonTonePlayers, stopSimonPlayback]);

  const { remainingTimeSeconds, finalTenSecondsProgress } = useStationCountdownPulse({
    station: displayedStation,
    isOverlayMounted,
    nowMs,
    setNowMs,
    timerPulseAnimation,
    timerPulseLoopRef,
  });

  useStationTimeoutOutcome({
    station: displayedStation,
    remainingTimeSeconds,
    isSubmittingCode,
    pendingByType: {
      quiz: isSubmittingQuizAnswer,
      wordle: isSubmittingWordleGuess,
      hangman: isSubmittingHangmanGuess,
      mastermind: isSubmittingMastermindGuess,
      anagram: isSubmittingAnagram,
      caesar: isSubmittingCaesar,
      memory: isSubmittingMemory,
      simon: isSubmittingSimon,
      rebus: isSubmittingRebus,
      boggle: isSubmittingBoggle,
      miniSudoku: isSubmittingMiniSudoku,
      matching: isSubmittingMatching,
    },
    onQuizFailed,
    onTimeExpired,
    showQuizOutcomePopup,
    text: {
      timeoutWordle: text.timeoutWordle,
      timeoutHangman: text.timeoutHangman,
      timeoutMastermind: text.timeoutMastermind,
      timeoutAnagram: text.timeoutAnagram,
      timeoutCaesar: text.timeoutCaesar,
      timeoutMemory: text.timeoutMemory,
      timeoutSimon: text.timeoutSimon,
      timeoutRebus: text.timeoutRebus,
      timeoutBoggle: text.timeoutBoggle,
      timeoutMiniSudoku: text.timeoutMiniSudoku,
      timeoutMatching: text.timeoutMatching,
      timeoutQuiz: text.timeoutQuiz,
      timeoutCodeTask: text.timeoutCodeTask,
    },
  });

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
  }, [normalizedWordleInputForReset, quizSubmitError, wordleResult]);
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

  if (!isOverlayMounted || !displayedStation) {
    return null;
  }
  const station = displayedStation;
  const {
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
    isNumericCodeStation,
    shouldShowQuizFallbackGraphic,
    stationImageUri,
    stationDescription,
    stationMediaHeight,
    hasTimerStarted,
    wordleSecret,
    wordleLength,
    wordleDisplayLength,
    normalizedWordleInput,
    wordleInputCharacters,
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
    mastermindSecret,
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
    hasTimedLimit,
    isTimeExpired,
    isWordleInteractiveDisabled,
    isAudioOverlayControlDisabled,
    isAudioStopDisabled,
    isCodeActionDisabled,
    isInteractiveLocked,
    timerTextColor,
    timerPulseStyle,
  } = buildStationPreviewModel({
    station,
    uiLanguage,
    viewportHeight,
    viewportWidth,
    isTabletOverlay,
    adaptiveScale: adaptiveLayout.s,
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
    text: {
      miniSudokuIncorrect: text.miniSudokuIncorrect,
    },
  });
  const {
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
  } = createStationPreviewActions({
    stationId: station.stationId,
    stationStatus: station.status,
    startedAt: station.startedAt,
    onCompleteTask,
    onQuizFailed,
    onQuizPassed,
    onClose,
    showQuizOutcomePopup,
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
    isInteractiveLocked,
    hasTimedLimit,
    hasTimerStarted,
    isTimeExpired,
    verificationCode,
    selectedQuizOption,
    isSubmittingQuizAnswer,
    quizCorrectAnswerIndex: station.quizCorrectAnswerIndex,
    quizFeedbackAnimation,
    wordleLength,
    wordleSecret,
    wordleDisplayLength,
    normalizedWordleInput,
    wordleAttempts,
    isSubmittingWordleGuess,
    isWordleRevealAnimating,
    guessedHangmanSet,
    hangmanMisses,
    hangmanGuessedLetters,
    hangmanSecret,
    isSubmittingHangmanGuess,
    normalizedMastermindInput,
    mastermindSecret,
    mastermindSolved,
    mastermindAttemptsLeft,
    mastermindAttempts,
    isSubmittingMastermindGuess,
    normalizedAnagramInput,
    anagramTarget,
    anagramAttemptsLeft,
    anagramAttempts,
    isSubmittingAnagram,
    normalizedCaesarInput,
    caesarDecoded,
    caesarAttemptsLeft,
    caesarAttempts,
    caesarMaxLength,
    isSubmittingCaesar,
    memoryBusy,
    memoryAllMatched,
    memoryDeck,
    memorySelection,
    isSubmittingMemory,
    simonInput,
    simonRoundLength,
    simonSequence,
    simonMistakes,
    simonMaxMistakes: SIMON_MAX_MISTAKES,
    simonInputHighlightMs: SIMON_INPUT_HIGHLIGHT_MS,
    isSubmittingSimon,
    isSimonPlaybackActive,
    normalizedRebusInput,
    rebusAnswer,
    rebusAttemptsLeft,
    rebusAttempts,
    isSubmittingRebus,
    normalizedBoggleInput,
    boggleInput,
    boggleMaxInputLength,
    boggleAttemptsLeft,
    boggleBoardLetters,
    boggleTargetWord,
    boggleAttempts,
    boggleBoardSide,
    boggleSelectedCellPath,
    isSubmittingBoggle,
    hasMiniSudokuPuzzle: Boolean(miniSudokuPuzzle),
    miniSudokuGridMeta,
    miniSudokuAttemptedValues,
    miniSudokuHasConflicts,
    isSubmittingMiniSudoku,
    matchingAllMatched,
    matchingAttemptsLeft,
    matchingConnections,
    matchingMatchedRightSet,
    matchingPairs,
    matchingAttempts,
    isSubmittingMatching,
    codeInputShakeAnimation,
    codeInputResetTimeoutRef,
    memoryHideTimeoutRef,
    simonInputHighlightTimeoutRef,
    clearSimonInputHighlight,
    playSimonTone,
    playSimonSequence,
    runWordleRevealSequence,
    setIsCodeInputInvalid,
    setIsCodeInputSuccess,
    setCodeResult,
    setIsSubmittingCode,
    setSelectedQuizOption,
    setQuizResult,
    setQuizSubmitError,
    setIsSubmittingQuizAnswer,
    setWordleAttempts,
    setWordleRevealedCellCounts,
    setWordleInput,
    setWordleResult,
    setIsSubmittingWordleGuess,
    setHangmanResult,
    setHangmanGuessedLetters,
    setHangmanMisses,
    setIsSubmittingHangmanGuess,
    setMastermindAttempts,
    setMastermindInput,
    setMastermindResult,
    setIsSubmittingMastermindGuess,
    setAnagramInput,
    setAnagramAttempts,
    setAnagramResult,
    setIsSubmittingAnagram,
    setCaesarInput,
    setCaesarAttempts,
    setCaesarResult,
    setIsSubmittingCaesar,
    setMemoryDeck,
    setMemorySelection,
    setMemoryResult,
    setIsSubmittingMemory,
    setMemoryBusy,
    setSimonInput,
    setSimonMistakes,
    setSimonResult,
    setSimonTargetLength,
    setIsSubmittingSimon,
    setSimonActiveInputButtonId,
    setRebusInput,
    setRebusAttempts,
    setRebusResult,
    setIsSubmittingRebus,
    setBoggleInput,
    setBoggleSelectedCellPath,
    setBoggleAttempts,
    setBoggleResult,
    setIsSubmittingBoggle,
    setMiniSudokuResult,
    setMiniSudokuValues,
    setIsSubmittingMiniSudoku,
    setMatchingConnections,
    setMatchingResult,
    setIsSubmittingMatching,
    setMatchingAttempts,
    text: {
      alertErrorTitle: text.alertErrorTitle,
      codeEnter: text.codeEnter,
      codeApproved: text.codeApproved,
      wordleEnterGuess: text.wordleEnterGuess,
      wordleLengthExact: text.wordleLengthExact,
      wordleAttemptsExhausted: text.wordleAttemptsExhausted,
      wordleTryAgain: text.wordleTryAgain,
      wordleNoAttempts: text.wordleNoAttempts,
      wordleFailedPopup: text.wordleFailedPopup,
      wordleSolved: text.wordleSolved,
      wordleSolvedPopup: text.wordleSolvedPopup,
      quizCorrect: text.quizCorrect,
      quizIncorrect: text.quizIncorrect,
      quizWrongPopup: text.quizWrongPopup,
      quizSuccessPopup: text.quizSuccessPopup,
      hangmanEnterLetter: text.hangmanEnterLetter,
      hangmanLetterAlreadyChecked: text.hangmanLetterAlreadyChecked,
      hangmanNoAttempts: text.hangmanNoAttempts,
      hangmanFailedPopup: text.hangmanFailedPopup,
      hangmanGoodLetter: text.hangmanGoodLetter,
      hangmanMiss: text.hangmanMiss,
      hangmanSolved: text.hangmanSolved,
      hangmanSolvedPopup: text.hangmanSolvedPopup,
      mastermindInvalidCode: text.mastermindInvalidCode,
      mastermindNoAttempts: text.mastermindNoAttempts,
      mastermindFailedPopup: text.mastermindFailedPopup,
      mastermindFeedback: text.mastermindFeedback,
      mastermindSolved: text.mastermindSolved,
      mastermindSolvedPopup: text.mastermindSolvedPopup,
      anagramEnter: text.anagramEnter,
      anagramNoAttempts: text.anagramNoAttempts,
      anagramFailedPopup: text.anagramFailedPopup,
      anagramIncorrect: text.anagramIncorrect,
      anagramSolved: text.anagramSolved,
      anagramSolvedPopup: text.anagramSolvedPopup,
      caesarEnter: text.caesarEnter,
      caesarNoAttempts: text.caesarNoAttempts,
      caesarFailedPopup: text.caesarFailedPopup,
      caesarIncorrect: text.caesarIncorrect,
      caesarSolved: text.caesarSolved,
      caesarSolvedPopup: text.caesarSolvedPopup,
      memorySolved: text.memorySolved,
      memorySolvedPopup: text.memorySolvedPopup,
      memoryPairFound: text.memoryPairFound,
      memoryMiss: text.memoryMiss,
      simonWrong: text.simonWrong,
      simonFailedPopup: text.simonFailedPopup,
      simonProgress: text.simonProgress,
      simonSolved: text.simonSolved,
      simonSolvedPopup: text.simonSolvedPopup,
      rebusEnter: text.rebusEnter,
      rebusNoAttempts: text.rebusNoAttempts,
      rebusFailedPopup: text.rebusFailedPopup,
      rebusIncorrect: text.rebusIncorrect,
      rebusSolved: text.rebusSolved,
      rebusSolvedPopup: text.rebusSolvedPopup,
      boggleEnterMin: text.boggleEnterMin,
      boggleMaxLength: text.boggleMaxLength,
      boggleNoAttempts: text.boggleNoAttempts,
      boggleFailedPopup: text.boggleFailedPopup,
      boggleIncorrect: text.boggleIncorrect,
      boggleSolved: text.boggleSolved,
      boggleSolvedPopup: text.boggleSolvedPopup,
      boggleAdjacentOnly: text.boggleAdjacentOnly,
      miniSudokuIncorrect: text.miniSudokuIncorrect,
      miniSudokuFillAll: text.miniSudokuFillAll,
      miniSudokuSolved: text.miniSudokuSolved,
      miniSudokuSolvedPopup: text.miniSudokuSolvedPopup,
      matchingPairGood: text.matchingPairGood,
      matchingSolved: text.matchingSolved,
      matchingSolvedPopup: text.matchingSolvedPopup,
      matchingNoAttempts: text.matchingNoAttempts,
      matchingFailedPopup: text.matchingFailedPopup,
      matchingWrongPair: text.matchingWrongPair,
    },
  });
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
  const stationQuizPrompt = resolveStationQuizPrompt({ station, wordleLength, uiLanguage });
  const stationMediaRendererByType = buildStationMediaRendererByType({
    wordleMediaBoardProps: {
      stationId: station.stationId,
      displayLength: wordleDisplayLength,
      attempts: wordleAttempts,
      revealedCellCounts: wordleRevealedCellCounts,
      cellSize: wordleBoardCellSize,
      letterGap: wordleInputCellGap,
      rowGap: wordleDisplayLength >= 12 ? 4 : 6,
    },
    anagramMediaPanelProps: {
      scrambledWords: anagramScrambledWords,
      hintWordCount: anagramHintWordCount,
      hintLettersLayout: anagramHintLettersLayout,
    },
    simonPanelProps: {
      stationId: station.stationId,
      simonSequence,
      simonTargetLength: simonRoundLength,
      simonProgress,
      simonActivePlaybackButtonId,
      simonActiveInputButtonId,
      isSimonPlaybackActive,
      simonResult,
      isInteractiveLocked,
      isSubmittingSimon,
      onPressButton: (buttonId) => {
        void handleSimonPress(buttonId);
      },
    },
    mastermindMediaSectionProps: {
      stationId: station.stationId,
      prompt: stationQuizPrompt,
      mastermindAttempts,
      mastermindAttemptsLeft,
      mastermindInput,
      isInteractiveLocked,
      isSubmittingMastermindGuess,
      mastermindSolved,
      isTabletOverlay,
      quizSubmitError,
      onChangeInput: (value) => {
        handleMastermindInput(value);
      },
      onSubmitGuess: () => {
        void submitMastermindGuess();
      },
      onAddSymbol: (symbol) => {
        addMastermindSymbol(symbol);
      },
    },
    memoryMediaSectionProps: {
      prompt: stationQuizPrompt,
      memoryDeck,
      memoryMatchedCount,
      memoryBusy,
      memoryResult,
      isInteractiveLocked,
      isTabletOverlay,
      quizSubmitError,
      onPressCard: (cardId) => {
        void handleMemoryCardPress(cardId);
      },
    },
    miniSudokuMediaSectionProps: {
      stationId: station.stationId,
      miniSudokuPuzzle,
      normalizedMiniSudokuValues,
      miniSudokuResult: miniSudokuDisplayResult,
      conflictCellIndexes: miniSudokuConflictIndexes,
      isActionDisabled: isInteractiveLocked || isSubmittingMiniSudoku,
      isSubmittingMiniSudoku,
      onChangeCell: handleMiniSudokuChangeCell,
      onSubmit: handleMiniSudokuSubmit,
      isTabletOverlay,
      quizSubmitError,
    },
    matchingMediaSectionProps: {
      matchingAttemptsLeft,
      matchingLeftOptions,
      matchingRightOptions,
      matchingConnections,
      matchingResult,
      isInteractiveLocked: isInteractiveLocked || isSubmittingMatching || matchingAllMatched,
      onConnect: (left, right) => {
        if (isInteractiveLocked || isSubmittingMatching || matchingAllMatched || matchingAttemptsLeft <= 0) {
          return;
        }
        setMatchingResult(null);
        setQuizSubmitError(null);
        void submitMatchingPair(left, right);
      },
      matchingAttemptsLabel: text.matchingAttempts,
      matchingMatchedLabel: text.matchingMatched,
      matchingMatchedCount,
      totalPairs: matchingPairs.length,
    },
    boggleMediaSectionProps: {
      stationId: station.stationId,
      boggleBoardLetters,
      boggleAttemptsLeft,
      boggleMaxInputLength,
      boggleInput,
      boggleResult,
      selectedCellPath: boggleSelectedCellPath,
      isActionDisabled: isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0,
      isSubmittingBoggle,
      onChangeInput: (value) => {
        handleBoggleInput(value);
      },
      onPressBoardCell: selectBoggleBoardCell,
      onBackspaceInput: backspaceBoggleInput,
      onSubmit: () => {
        void submitBoggle();
      },
    },
  });
  const renderedStationMedia = stationMediaRendererByType[station.stationType]?.() ?? null;
  const quizStationRendererByType = buildQuizStationRendererByType({
    quizAudioPanelSharedProps: {
      station,
      quizOptions,
      selectedQuizOption,
      isSubmittingQuizAnswer,
      hasTimedLimit,
      hasTimerStarted,
      isTimeExpired,
      isAudioLoading,
      audioLoadError,
      quizResult,
      feedbackTone,
      quizFeedbackAnimation,
      onSubmitQuizAnswer: (index) => {
        void submitQuizAnswer(index);
      },
    },
    wordleInteractionPanelProps: {
      stationId: station.stationId,
      displayLength: wordleDisplayLength,
      inputCharacters: wordleInputCharacters,
      boardCellSize: wordleBoardCellSize,
      inputCellGap: wordleInputCellGap,
      inputActionGap: wordleInputActionGap,
      keyboardKeySize: wordleKeyboardKeyWidth,
      keyboardKeyGap: wordleKeyboardKeyGap,
      keyStateByLetter: wordleKeyStateByLetter,
      isInteractiveDisabled: isWordleInteractiveDisabled,
      isRevealing: isWordleRevealAnimating,
      isSubmitting: isSubmittingWordleGuess,
      canSubmit: normalizedWordleInput.length === (wordleLength || 0),
      canBackspace: !isWordleInteractiveDisabled && normalizedWordleInput.length > 0,
      onLayoutKeyboard: (nextWidth) => {
        if (Math.abs(nextWidth - wordleKeyboardContainerWidth) > 1) {
          setWordleKeyboardContainerWidth(nextWidth);
        }
      },
      onPressKey: (key) => {
        setWordleInput((current) => {
          const nextValue = `${current}${key}`.slice(0, wordleLength || 32);
          return nextValue === current ? current : nextValue;
        });
      },
      onBackspace: () => {
        setWordleInput((current) => {
          if (!current.length) {
            return current;
          }
          return current.slice(0, -1);
        });
      },
      onSubmit: () => {
        void submitWordleGuess();
      },
    },
    hangmanStationPanelProps: {
      stationId: station.stationId,
      hangmanMisses,
      hangmanAttemptsLeft,
      hangmanResult,
      guessedHangmanSet,
      isGuessDisabled:
        station.status === "done" ||
        station.status === "failed" ||
        isSubmittingHangmanGuess ||
        (hasTimedLimit && !hasTimerStarted) ||
        isTimeExpired ||
        hangmanAttemptsLeft <= 0 ||
        hangmanHasWon,
      isSubmittingHangmanGuess,
      onSubmitLetter: (letter) => {
        void submitHangmanGuess(letter);
      },
    },
    mastermindStationPanelProps: {
      stationId: station.stationId,
      mastermindAttempts,
      mastermindAttemptsLeft,
      mastermindInput,
      isInputEditable: !isInteractiveLocked && !isSubmittingMastermindGuess && !mastermindSolved,
      isActionDisabled: isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0,
      isSymbolDisabled: isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0,
      isSubmittingMastermindGuess,
      onChangeInput: (value) => {
        handleMastermindInput(value);
      },
      onSubmitGuess: () => {
        void submitMastermindGuess();
      },
      onAddSymbol: (symbol) => {
        addMastermindSymbol(symbol);
      },
    },
      anagramStationPanelProps: {
        anagramAttemptsLeft,
        anagramInput,
        anagramResult,
        isActionDisabled: isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0,
        isSubmittingAnagram,
        onChangeInput: (value) => {
          handleAnagramInputChange(value);
        },
        onSubmit: () => {
          void submitAnagram();
        },
      },
    caesarStationPanelProps: {
      caesarInput,
      caesarMaxLength,
        caesarResult,
        isActionDisabled: isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0,
        isSubmittingCaesar,
        onChangeInput: (value) => {
          handleCaesarInputChange(value);
        },
        onAppendCharacter: (character) => {
          appendCaesarCharacter(character);
        },
        onBackspace: () => {
          backspaceCaesarInput();
        },
        onSubmit: () => {
          void submitCaesar();
        },
      },
    rebusStationPanelProps: {
      rebusQuestion: station.quizQuestion?.trim() || "🏕️ + QUEST = ?",
      rebusAttemptsLeft,
      rebusInput,
        rebusResult,
        isActionDisabled: isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0,
        isSubmittingRebus,
        onChangeInput: (value) => {
          handleRebusInputChange(value);
        },
        onSubmit: () => {
          void submitRebus();
        },
      },
  });
  const renderedQuizStation = quizStationRendererByType[station.stationType]?.() ?? null;
  const stationHeaderLabel = isCaesarStation
    ? station.typeLabel
    : `${station.name} • ${station.typeLabel}`;

  return (
    <Animated.View
      className="absolute inset-0 z-50"
      style={[
        { backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(15, 25, 20, 0.9)" },
        overlayBackdropStyle,
      ]}
    >
      <Animated.View className="flex-1 px-3 pb-5 pt-9" style={overlayPanelStyle}>
        <View className="flex-1 rounded-3xl border" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}>
          <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
            <View className="flex-1">
                <Text
                  className="uppercase tracking-widest"
                  style={{ color: EXPEDITION_THEME.textSubtle, fontSize: adaptiveLayout.fs(isTabletOverlay ? 13 : 11, 10, 16) }}
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
                  width: adaptiveLayout.s(isTabletOverlay ? 48 : 36, 34, 56),
                  height: adaptiveLayout.s(isTabletOverlay ? 48 : 36, 34, 56),
                }}
              onPress={onRequestClose ?? onClose}
              hitSlop={8}
            >
              <Text
                className="font-semibold text-center"
                style={{
                  color: EXPEDITION_THEME.textPrimary,
                  lineHeight: adaptiveLayout.s(isTabletOverlay ? 20 : 16, 15, 24),
                  fontSize: adaptiveLayout.fs(isTabletOverlay ? 20 : 16, 15, 24),
                  includeFontPadding: false,
                }}
              >
                ✕
              </Text>
            </Pressable>
            </View>

            <View className="flex-1 px-4">
              <View className="flex-1">
                <StationMediaPanel
                  stationId={station.stationId}
                  stationType={station.stationType}
                  viewportHeight={viewportHeight}
                  stationMediaHeight={stationMediaHeight}
                  requiresCode={requiresCode}
                  isNumericCodeStation={isNumericCodeStation}
                  renderedStationMedia={renderedStationMedia}
                  shouldShowQuizFallbackGraphic={shouldShowQuizFallbackGraphic}
                  stationImageUri={stationImageUri}
                  quizIconLoadFailed={quizIconLoadFailed}
                  onQuizIconLoadError={() => setQuizIconLoadFailed(true)}
                  onStationImageLoadError={() => setImageLoadFailed(true)}
                  caesarMedia={{
                    decodedText: caesarDecoded,
                    shiftValue: caesarShiftValue,
                    attemptsLeft: caesarAttemptsLeft,
                    shiftHintLabel: text.caesarShiftHint(caesarShiftValue),
                    attemptsLabel: text.caesarAttemptsLeftLabel,
                  }}
                  hangmanMedia={{
                    secret: hangmanSecret,
                    guessedLetters: guessedHangmanSet,
                  }}
                  audioOverlay={
                    isAudioQuizStation
                        ? {
                            hasPlaybackStarted: hasAudioPlaybackStarted,
                            isPlayDisabled: isAudioOverlayControlDisabled,
                            isStopDisabled: isAudioStopDisabled,
                            isPlaying: isAudioPlaying,
                            playLabel: text.audioOverlayPlay,
                            replayLabel: text.audioOverlayReplay,
                            stopLabel: text.audioOverlayStop,
                            statusReadyLabel: text.audioOverlayStatusReady,
                            statusPlayingLabel: text.audioOverlayStatusPlaying,
                            statusDisabledLabel: text.audioOverlayStatusDisabled,
                            onPlay: () => {
                              void handlePlayAudio();
                            },
                          onStop: () => {
                            void handleStopAudio();
                          },
                        }
                      : undefined
                  }
                />

              {requiresCode ? (
                <View
                  className="my-3 px-1"
                >
                  <Text
                    className="leading-6"
                    style={{
                      color: EXPEDITION_THEME.textMuted,
                      textAlign: "justify",
                      fontSize: adaptiveLayout.fs(isTabletOverlay ? 18 : 16, 14, 22),
                    }}
                  >
                    {stationDescription.length > 0
                      ? stationDescription
                      : text.taskDescriptionMissing}
                  </Text>
                </View>
              ) : !isCaesarStation && stationDescription.length > 0 ? (
                <Text
                  className={`${isNumericCodeStation ? "mt-2" : "mt-3"} leading-5`}
                  style={{ color: EXPEDITION_THEME.textMuted, fontSize: adaptiveLayout.fs(isTabletOverlay ? 16 : 14, 13, 20) }}
                >
                  {stationDescription}
                </Text>
              ) : null}
              {isAnagramStation ? (
                <Text
                  className="mt-2 leading-5"
                  style={{ color: EXPEDITION_THEME.textSubtle, fontSize: adaptiveLayout.fs(isTabletOverlay ? 14 : 12, 11, 17) }}
                >
                  {text.anagramDisplayHint}
                </Text>
              ) : null}

              {isQuizStation && !isMatchingStation && !isBoggleStation && !isMastermindStation && !isMemoryStation && !isMiniSudokuStation && !isSimonStation ? (
                <StationQuizTaskWrapper
                  className="mt-3"
                  prompt={stationQuizPrompt}
                  hidePrompt={isRebusStation}
                  isTabletOverlay={isTabletOverlay}
                  error={quizSubmitError}
                  errorPlacement="inside"
                >
                  {renderedQuizStation}
                </StationQuizTaskWrapper>
              ) : null}
            </View>

            {requiresCode ? (
              <CodeStationPanel
                station={station}
                isNumericCodeStation={isNumericCodeStation}
                isCodeActionDisabled={isCodeActionDisabled}
                verificationCode={verificationCode}
                isCodeInputInvalid={isCodeInputInvalid}
                isCodeInputSuccess={isCodeInputSuccess}
                codeResult={codeResult}
                isSubmittingCode={isSubmittingCode}
                codeInputShakeAnimation={codeInputShakeAnimation}
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
      <QuizOutcomePopupPanel
        popup={quizOutcomePopup}
        timeoutSecondsLeft={timeoutPopupSecondsLeft}
        isLightTheme={isLightTheme}
        onClose={closeQuizOutcomePopup}
        text={{
          outcomePassed: text.outcomePassed,
          outcomeTimedOut: text.outcomeTimedOut,
          outcomeFailed: text.outcomeFailed,
          backToMapNow: text.backToMapNow,
          backToMap: text.backToMap,
        }}
      />
    </Animated.View>
  );
}
