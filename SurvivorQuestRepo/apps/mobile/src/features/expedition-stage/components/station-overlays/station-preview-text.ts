/**
 * Wszystkie teksty podglądu stanowiska w czterech językach.
 *
 * Wydzielone z preview.tsx, gdzie zajmowały 713 z 3402 linii i stały między
 * logiką a JSX-em, przez co plik nie dawał się przeczytać ani jako logika, ani
 * jako słownik. Sam przenosiny — zero zmian w treściach.
 */

import type { UiLanguage } from "../../../i18n";

export type StationPreviewText = {
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
  fastestBonusEarnedSuffix: (points: number) => string;
  hangmanEnterLetter: string;
  hangmanLetterAlreadyChecked: string;
  hangmanNoAttempts: (secret: string) => string;
  hangmanFailedPopup: string;
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
  openQuizEnter: string;
  openQuizNoAttempts: (answer: string) => string;
  openQuizFailedPopup: string;
  openQuizIncorrect: string;
  openQuizSolved: string;
  openQuizSolvedPopup: string;
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
  trueFalseSolved: string;
  trueFalseSolvedPopup: string;
  trueFalseFailed: string;
  trueFalseFailedPopup: string;
  outcomePassed: string;
  outcomeTimedOut: string;
  outcomeFailed: string;
  outcomePending: string;
  photoTaskRejectedPopup: string;
  pendingReviewPopupMessage: string;
  matchingChecking: string;
  matchingCheck: string;
  matchingAttempts: string;
  matchingMatched: string;
  taskDescriptionMissing: string;
  anagramDisplayHint: string;
  executionTimerLabel: string;
  executionStopwatchLabel: string;
  fastestBonusAvailableLabel: (points: number) => string;
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
  fastestBonusEarnedSuffix: (points) => `\n\n+${points} bonus points for being the fastest!`,
  hangmanEnterLetter: "Enter one letter.",
  hangmanLetterAlreadyChecked: "This letter has already been checked.",
  hangmanNoAttempts: (secret: string) => `No attempts left. Phrase: ${secret}`,
  hangmanFailedPopup: "All Hangman attempts were used.",
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
  openQuizEnter: "Enter your answer.",
  openQuizNoAttempts: (answer: string) => `No attempts left. Correct answer: ${answer}`,
  openQuizFailedPopup: "Failed to answer the question.",
  openQuizIncorrect: "Incorrect. Try again.",
  openQuizSolved: "Great! Correct answer.",
  openQuizSolvedPopup: "Correct answer. Task passed.",
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
  trueFalseSolved: "Great! Every statement is marked correctly.",
  trueFalseSolvedPopup: "True/false task completed.",
  trueFalseFailed: "At least one statement is marked wrong.",
  trueFalseFailedPopup: "Not every statement was marked correctly.",
  outcomePassed: "Passed",
  outcomeTimedOut: "Time expired",
  outcomeFailed: "Failed",
  outcomePending: "Waiting for approval",
  photoTaskRejectedPopup: "Your photo was rejected by the Game Master. The task was not completed.",
  pendingReviewPopupMessage:
    "The task has been submitted. The Game Master will now check whether the photo shows what it should, then you'll continue in the game.",
  matchingChecking: "Checking...",
  matchingCheck: "Check",
  matchingAttempts: "Attempts",
  matchingMatched: "Matched",
  taskDescriptionMissing: "Task description has not been added yet.",
  anagramDisplayHint: "Jumbled text is displayed word by word, each in a separate row.",
  executionTimerLabel: "Time left to complete task",
  executionStopwatchLabel: "Time spent on task",
  fastestBonusAvailableLabel: (points) => `+${points} pts bonus for being fastest`,
  points: "Points",
  backToMapNow: "Back to map now",
  backToMap: "Back to home screen",
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
  fastestBonusEarnedSuffix: (points) => `\n\n+${points} бонусних балів за найшвидше виконання!`,
  hangmanEnterLetter: "Введіть одну літеру.",
  hangmanLetterAlreadyChecked: "Цю літеру вже перевіряли.",
  hangmanNoAttempts: (secret: string) => `Спроб не залишилося. Фраза: ${secret}`,
  hangmanFailedPopup: "Усі спроби у Шибениці використано.",
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
  openQuizEnter: "Введіть відповідь.",
  openQuizNoAttempts: (answer: string) => `Спроб не залишилося. Правильна відповідь: ${answer}`,
  openQuizFailedPopup: "Не вдалося відповісти на питання.",
  openQuizIncorrect: "Неправильно. Спробуйте ще раз.",
  openQuizSolved: "Чудово! Правильна відповідь.",
  openQuizSolvedPopup: "Правильна відповідь. Завдання зараховано.",
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
  trueFalseSolved: "Чудово! Усі твердження позначено правильно.",
  trueFalseSolvedPopup: "Завдання «правда чи хиба» виконано.",
  trueFalseFailed: "Принаймні одне твердження позначено неправильно.",
  trueFalseFailedPopup: "Не всі твердження позначено правильно.",
  outcomePassed: "Зараховано",
  outcomeTimedOut: "Час вичерпано",
  outcomeFailed: "Не зараховано",
  outcomePending: "Очікуємо на підтвердження",
  photoTaskRejectedPopup: "Ваше фото відхилено організатором. Завдання не зараховано.",
  pendingReviewPopupMessage:
    "Завдання надіслано. Організатор тепер перевірить, чи фото показує потрібне, після чого ви зможете продовжити гру.",
  matchingChecking: "Перевірка...",
  matchingCheck: "Перевірити",
  matchingAttempts: "Спроби",
  matchingMatched: "Поєднано",
  taskDescriptionMissing: "Опис завдання ще не додано.",
  anagramDisplayHint:
    "Перемішаний текст відображається слово за словом, кожне в окремому рядку.",
  executionTimerLabel: "Час до завершення завдання",
  executionStopwatchLabel: "Час виконання завдання",
  fastestBonusAvailableLabel: (points) => `+${points} балів бонусу за найшвидше виконання`,
  points: "Бали",
  backToMapNow: "Повернутися до мапи зараз",
  backToMap: "Повернутися на головний екран",
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
  fastestBonusEarnedSuffix: (points) => `\n\n+${points} бонусных баллов за самое быстрое выполнение!`,
  hangmanEnterLetter: "Введите одну букву.",
  hangmanLetterAlreadyChecked: "Эта буква уже проверялась.",
  hangmanNoAttempts: (secret: string) => `Попыток не осталось. Фраза: ${secret}`,
  hangmanFailedPopup: "Все попытки в Виселице использованы.",
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
  openQuizEnter: "Введите ответ.",
  openQuizNoAttempts: (answer: string) => `Попыток не осталось. Правильный ответ: ${answer}`,
  openQuizFailedPopup: "Не удалось ответить на вопрос.",
  openQuizIncorrect: "Неправильно. Попробуйте ещё раз.",
  openQuizSolved: "Отлично! Правильный ответ.",
  openQuizSolvedPopup: "Правильный ответ. Задание зачтено.",
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
  trueFalseSolved: "Отлично! Все утверждения отмечены верно.",
  trueFalseSolvedPopup: "Задание «правда или ложь» завершено.",
  trueFalseFailed: "Хотя бы одно утверждение отмечено неверно.",
  trueFalseFailedPopup: "Не все утверждения отмечены верно.",
  outcomePassed: "Зачтено",
  outcomeTimedOut: "Время истекло",
  outcomeFailed: "Не зачтено",
  outcomePending: "Ожидаем подтверждения",
  photoTaskRejectedPopup: "Ваше фото отклонено организатором. Задание не зачтено.",
  pendingReviewPopupMessage:
    "Задание отправлено. Организатор теперь проверит, соответствует ли фото заданию, после чего вы сможете продолжить игру.",
  matchingChecking: "Проверка...",
  matchingCheck: "Проверить",
  matchingAttempts: "Попытки",
  matchingMatched: "Сопоставлено",
  taskDescriptionMissing: "Описание задания ещё не добавлено.",
  anagramDisplayHint:
    "Перемешанный текст отображается слово за словом, каждое в отдельной строке.",
  executionTimerLabel: "Время до завершения задания",
  executionStopwatchLabel: "Время выполнения задания",
  fastestBonusAvailableLabel: (points) => `+${points} баллов бонуса за самое быстрое выполнение`,
  points: "Баллы",
  backToMapNow: "Вернуться к карте сейчас",
  backToMap: "Вернуться на главный экран",
};

export const STATION_PREVIEW_TEXT: Record<UiLanguage, StationPreviewText> = {
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
    fastestBonusEarnedSuffix: (points) => `\n\n+${points} pkt bonusu za bycie najszybszym!`,
    hangmanEnterLetter: "Wpisz jedną literę.",
    hangmanLetterAlreadyChecked: "Ta litera była już sprawdzana.",
    hangmanNoAttempts: (secret: string) => `Brak prób. Hasło: ${secret}`,
    hangmanFailedPopup: "Wykorzystano wszystkie próby w Wisielcu.",
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
    openQuizEnter: "Wpisz odpowiedź.",
    openQuizNoAttempts: (answer: string) => `Brak prób. Poprawna odpowiedź: ${answer}`,
    openQuizFailedPopup: "Nie udało się odpowiedzieć na pytanie.",
    openQuizIncorrect: "Niepoprawnie. Spróbuj ponownie.",
    openQuizSolved: "Brawo! Poprawna odpowiedź.",
    openQuizSolvedPopup: "Poprawna odpowiedź. Zadanie zaliczone.",
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
    trueFalseSolved: "Brawo! Wszystkie zdania oznaczone poprawnie.",
    trueFalseSolvedPopup: "Zadanie Prawda/Fałsz ukończone.",
    trueFalseFailed: "Co najmniej jedno zdanie jest oznaczone błędnie.",
    trueFalseFailedPopup: "Nie wszystkie zdania zostały oznaczone poprawnie.",
    outcomePassed: "Zaliczono",
    outcomeTimedOut: "Czas minął",
    outcomeFailed: "Nie zaliczono",
    outcomePending: "Czekamy na zatwierdzenie",
    photoTaskRejectedPopup: "Zdjęcie zostało odrzucone przez organizatora. Zadanie nie zostało zaliczone.",
    pendingReviewPopupMessage:
      "Zadanie zostało wysłane. Organizator (Mistrz Gry) sprawdzi teraz, czy zdjęcie przedstawia to, co powinno, a potem będziesz mógł kontynuować grę.",
    matchingChecking: "Sprawdzanie...",
    matchingCheck: "Sprawdź",
    matchingAttempts: "Próby",
    matchingMatched: "Dopasowano",
    taskDescriptionMissing: "Opis zadania nie został jeszcze dodany.",
    anagramDisplayHint:
      "Rozsypanka jest wyświetlana wyraz po wyrazie, a każdy wyraz znajduje się w osobnym wierszu.",
    executionTimerLabel: "Czas do ukończenia zadania",
    executionStopwatchLabel: "Czas wykonania zadania",
    fastestBonusAvailableLabel: (points) => `+${points} pkt bonusu za najszybsze wykonanie`,
    points: "Punkty",
    backToMapNow: "Wróć do mapy teraz",
    backToMap: "Wróć do ekranu głównego",
  },
  english: STATION_PREVIEW_TEXT_ENGLISH,
  ukrainian: STATION_PREVIEW_TEXT_UKRAINIAN,
  russian: STATION_PREVIEW_TEXT_RUSSIAN,
};
