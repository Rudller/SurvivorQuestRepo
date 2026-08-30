// Copied from apps/mobile/.../station-panels/quiz-audio-station-panel.tsx (QUIZ_PROMPT_TEXT)
// so the admin preview shows byte-identical fallback prompt text to the real mobile app.
// Pure logic, no React/RN imports — keep in sync manually if the mobile source changes.
import type { RealizationLanguage } from "../types/realization";

type QuizPromptText = {
  classicQuizFallback: string;
  audioQuizFallback: string;
  wordleFallback: (wordleLength: number) => string;
  hangmanFallback: string;
  mastermindFallback: string;
  anagramFallback: string;
  caesarFallback: string;
  memoryFallback: string;
  simonFallback: string;
  rebusFallback: string;
  boggleFallback: string;
  miniSudokuFallback: string;
  matchingFallback: string;
  photoTaskFallback: string;
};

const QUIZ_PROMPT_TEXT_ENGLISH: QuizPromptText = {
  classicQuizFallback: "Quiz: choose one of 4 answers",
  audioQuizFallback: "Audio quiz: play recording and choose the correct answer.",
  wordleFallback: (wordleLength: number) => `Wordle: guess the word (${wordleLength || 5} letters).`,
  hangmanFallback: "Hangman: guess the phrase letter by letter.",
  mastermindFallback: "Mastermind: guess a 4-symbol code using letters A-F.",
  anagramFallback: "Anagram: arrange the correct word from jumbled letters.",
  caesarFallback: "Caesar cipher: decode the text using the shown shift.",
  memoryFallback: "Memory: find all pairs.",
  simonFallback: "Simon: repeat the sequence.",
  rebusFallback: "Rebus: enter the answer.",
  boggleFallback: "Boggle: find the target word on the board.",
  miniSudokuFallback: "Mini Sudoku: fill the 2x2 grid.",
  matchingFallback: "Matching pairs: match the elements.",
  photoTaskFallback: "Photo task: take a photo as proof, following the organizer's instructions.",
};

const QUIZ_PROMPT_TEXT: Record<Exclude<RealizationLanguage, "other">, QuizPromptText> = {
  polish: {
    classicQuizFallback: "Quiz: wybierz jedną z 4 odpowiedzi",
    audioQuizFallback: "Quiz audio: odtwórz nagranie i wybierz poprawną odpowiedź.",
    wordleFallback: (wordleLength: number) => `Wordle: odgadnij słowo (${wordleLength || 5} liter).`,
    hangmanFallback: "Wisielec: odgadnij hasło litera po literze.",
    mastermindFallback: "Mastermind: odgadnij 4-znakowy kod z liter A-F.",
    anagramFallback: "Anagram: ułóż poprawne słowo z rozsypanki.",
    caesarFallback: "Szyfr Cezara: odszyfruj tekst używając pokazanego przesunięcia.",
    memoryFallback: "Memory: znajdź wszystkie pary.",
    simonFallback: "Simon: odtwórz sekwencję.",
    rebusFallback: "Rebus: wpisz hasło.",
    boggleFallback: "Boggle: znajdź docelowe słowo na planszy.",
    miniSudokuFallback: "Mini Sudoku: uzupełnij siatkę 2x2.",
    matchingFallback: "Łączenie par: dopasuj elementy.",
    photoTaskFallback: "Zadanie fotograficzne: wykonaj zdjęcie zgodnie z poleceniem organizatora.",
  },
  english: QUIZ_PROMPT_TEXT_ENGLISH,
  ukrainian: {
    classicQuizFallback: "Вікторина: виберіть одну з 4 відповідей",
    audioQuizFallback: "Аудіовікторина: відтворіть запис і виберіть правильну відповідь.",
    wordleFallback: (wordleLength: number) => `Wordle: вгадайте слово (${wordleLength || 5} літер).`,
    hangmanFallback: "Шибениця: вгадайте фразу літера за літерою.",
    mastermindFallback: "Mastermind: вгадайте 4-символьний код із літер A-F.",
    anagramFallback: "Анаграма: складіть правильне слово з перемішаних літер.",
    caesarFallback: "Шифр Цезаря: розшифруйте текст, використовуючи показаний зсув.",
    memoryFallback: "Memory: знайдіть усі пари.",
    simonFallback: "Simon: повторіть послідовність.",
    rebusFallback: "Ребус: введіть відповідь.",
    boggleFallback: "Boggle: знайдіть цільове слово на полі.",
    miniSudokuFallback: "Мінісудоку: заповніть сітку 2x2.",
    matchingFallback: "Підбір пар: зіставте елементи.",
    photoTaskFallback: "Фотозавдання: зробіть фото як підтвердження, дотримуючись інструкцій організатора.",
  },
  russian: {
    classicQuizFallback: "Викторина: выберите один из 4 ответов",
    audioQuizFallback: "Аудиовикторина: воспроизведите запись и выберите правильный ответ.",
    wordleFallback: (wordleLength: number) => `Wordle: угадайте слово (${wordleLength || 5} букв).`,
    hangmanFallback: "Виселица: угадайте фразу по буквам.",
    mastermindFallback: "Mastermind: угадайте 4-символьный код из букв A-F.",
    anagramFallback: "Анаграмма: составьте правильное слово из перемешанных букв.",
    caesarFallback: "Шифр Цезаря: расшифруйте текст, используя показанный сдвиг.",
    memoryFallback: "Memory: найдите все пары.",
    simonFallback: "Simon: повторите последовательность.",
    rebusFallback: "Ребус: введите ответ.",
    boggleFallback: "Boggle: найдите целевое слово на поле.",
    miniSudokuFallback: "Мини-судоку: заполните сетку 2x2.",
    matchingFallback: "Сопоставление пар: сопоставьте элементы.",
    photoTaskFallback: "Фотозадание: сделайте фото как подтверждение, следуя инструкциям организатора.",
  },
};

function resolvePromptText(language: RealizationLanguage): QuizPromptText {
  return language === "other" ? QUIZ_PROMPT_TEXT_ENGLISH : QUIZ_PROMPT_TEXT[language];
}

// Mirrors resolveStationQuizPrompt() in quiz-audio-station-panel.tsx.
export function resolveStationPreviewPrompt(
  type: string,
  quizQuestion: string | undefined,
  language: RealizationLanguage,
  wordleLength: number,
  description?: string,
): string {
  const text = resolvePromptText(language);
  const trimmedQuestion = quizQuestion?.trim();

  switch (type) {
    case "quiz":
      return trimmedQuestion || text.classicQuizFallback;
    case "audio-quiz":
      return trimmedQuestion || text.audioQuizFallback;
    case "open-quiz":
      return trimmedQuestion || text.classicQuizFallback;
    case "reviewed-answer":
    case "true-false":
    case "fill-blank":
      return trimmedQuestion || text.classicQuizFallback;
    case "wordle":
      return text.wordleFallback(wordleLength);
    case "hangman":
      return text.hangmanFallback;
    case "mastermind":
      return text.mastermindFallback;
    case "anagram":
      return text.anagramFallback;
    case "caesar-cipher":
      return text.caesarFallback;
    case "memory":
      return trimmedQuestion || text.memoryFallback;
    case "simon":
      return trimmedQuestion || text.simonFallback;
    case "rebus":
      return trimmedQuestion || text.rebusFallback;
    case "boggle":
      return trimmedQuestion || text.boggleFallback;
    case "mini-sudoku":
      return trimmedQuestion || text.miniSudokuFallback;
    case "strong-password":
      return (trimmedQuestion || text.matchingFallback).replace(/\s*dzienne\s*/i, " ").trim();
    case "photo-task":
      return description?.trim() || text.photoTaskFallback;
    default:
      return trimmedQuestion || text.matchingFallback;
  }
}
