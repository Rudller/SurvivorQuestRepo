import { BadRequestException } from '@nestjs/common';

import { parseCaesarShift } from '../domain/station-quiz.schema';
import {
  QUIZ_ANSWER_COUNT,
  isFillBlankStationType,
  isMatchingStationType,
  isOpenQuizStationType,
  isQuizDataStationType,
  isReviewedAnswerStationType,
  isTrueFalseStationType,
  isWordPuzzleStationType,
  normalizeMatchingAnswer,
  normalizeTrueFalseAnswer,
} from '../domain/station.rules';
import type { StationQuiz, StationType } from '../domain/station.types';

// Jedyne miejsce, w którym z wejścia użytkownika powstaje StationQuiz.
//
// Wcześniej istniało to dwa razy: ensureStationQuiz (ładunek HTTP) i
// normalizeStationQuiz (szkic stacji osadzony w realizacji). Ta sama logika,
// inne typowanie wejścia i cztery drobne rozbieżności, z których dwie były
// przypadkowe. Rozbieżność, która okazała się zamierzona, została parametrem:
// patrz onInvalidAnswerKeys.

export type BuildStationQuizOptions = {
  /**
   * Co zrobić z listą kluczy odpowiedzi, która nie jest tablicą stringów.
   *
   * 'throw' (domyślnie) dla ładunków HTTP — klienta da się poprawić, a cichy
   * zapis połowy danych jest gorszy niż 400.
   * 'skip' dla szkiców osadzonych w realizacji — tam jedno felerne pole nie ma
   * prawa wywrócić zapisu całej realizacji.
   */
  onInvalidAnswerKeys?: 'throw' | 'skip';
};

function invalidPayload(): never {
  throw new BadRequestException('Invalid payload');
}

function requireTrimmedString(value: unknown): string {
  if (typeof value !== 'string') {
    invalidPayload();
  }

  const trimmed = value.trim();
  if (!trimmed) {
    invalidPayload();
  }

  return trimmed;
}

function optionalTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// Przycięta, odduplikowana (bez względu na wielkość liter) lista zachowująca
// kolejność wpisaną przez admina.
function collectAnswerKeys(
  value: unknown,
  onInvalid: 'throw' | 'skip',
  seededWith: string[] = [],
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    if (onInvalid === 'throw') {
      invalidPayload();
    }

    return [];
  }

  const seen = new Set<string>(seededWith.map((item) => item.toLowerCase()));
  const keys: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      if (onInvalid === 'throw') {
        invalidPayload();
      }

      continue;
    }

    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      continue;
    }

    seen.add(trimmed.toLowerCase());
    keys.push(trimmed);
  }

  return keys;
}

export function buildStationQuizFromInput(
  raw: unknown,
  stationType: StationType,
  options: BuildStationQuizOptions = {},
): StationQuiz | undefined {
  if (!isQuizDataStationType(stationType)) {
    return undefined;
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    invalidPayload();
  }

  const onInvalidAnswerKeys = options.onInvalidAnswerKeys ?? 'throw';
  const quiz = raw as Record<string, unknown>;
  const question = requireTrimmedString(quiz.question);

  if (isWordPuzzleStationType(stationType)) {
    // Szyfr jest jedyną zagadką słowną z parametrem po stronie admina; reszta
    // wyprowadza planszę z samego hasła.
    const caesarShift =
      stationType === 'caesar-cipher'
        ? ensureCaesarShift(quiz.caesarShift)
        : undefined;

    return {
      question,
      answers: [question, 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      ...(caesarShift !== undefined ? { caesarShift } : {}),
    };
  }

  // Nic tutaj nie jest porównywane z tym, co wpisze drużyna — ocenia Game
  // Master. acceptedAnswers to jego opcjonalne punkty kontrolne, a answers
  // powiela kształt zagadki słownej wyłącznie po to, żeby wiersz dało się
  // odczytać: readStationQuiz odrzuca quiz z pustym slotem, co zabrałoby ze
  // sobą pytanie na karcie zapisanej bez żadnego klucza.
  if (isReviewedAnswerStationType(stationType)) {
    const answerKeys = collectAnswerKeys(
      quiz.acceptedAnswers,
      onInvalidAnswerKeys,
    );

    return {
      question,
      answers: [question, 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      ...(answerKeys.length > 0 ? { acceptedAnswers: answerKeys } : {}),
    };
  }

  // fill-blank zapisuje się i sprawdza dokładnie jak pytanie otwarte — różni je
  // tylko prezentacja karty.
  if (
    isOpenQuizStationType(stationType) ||
    isFillBlankStationType(stationType)
  ) {
    const correctAnswer = requireTrimmedString(
      Array.isArray(quiz.answers) ? quiz.answers[0] : undefined,
    );
    const acceptedAnswers = collectAnswerKeys(
      quiz.acceptedAnswers,
      onInvalidAnswerKeys,
      [correctAnswer],
    );

    return {
      question,
      answers: [correctAnswer, 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      ...(acceptedAnswers.length > 0 ? { acceptedAnswers } : {}),
    };
  }

  if (
    !Array.isArray(quiz.answers) ||
    quiz.answers.length !== QUIZ_ANSWER_COUNT
  ) {
    invalidPayload();
  }

  const answers = quiz.answers.map((answer) => requireTrimmedString(answer));
  const normalizedAnswers = isMatchingStationType(stationType)
    ? answers.map((answer) => normalizeMatchingAnswer(answer))
    : isTrueFalseStationType(stationType)
      ? answers.map((answer) => normalizeTrueFalseAnswer(answer))
      : answers;
  const correctAnswerIndex = Math.round(Number(quiz.correctAnswerIndex));

  if (
    normalizedAnswers.some((answer) => !answer) ||
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= QUIZ_ANSWER_COUNT
  ) {
    invalidPayload();
  }

  return {
    question,
    answers: [
      normalizedAnswers[0],
      normalizedAnswers[1],
      normalizedAnswers[2],
      normalizedAnswers[3],
    ],
    // matching i true-false rozkładają odpowiedź na wszystkie cztery sloty, więc
    // nie ma jednego "poprawnego" indeksu do zapamiętania — pinujemy go zamiast
    // przechowywać to, co akurat przysłał formularz.
    correctAnswerIndex:
      isMatchingStationType(stationType) || isTrueFalseStationType(stationType)
        ? 0
        : correctAnswerIndex,
    audioUrl: optionalTrimmedString(quiz.audioUrl),
  };
}

// Puste/niepodane przesunięcie zostawia stację przy jej deterministycznym
// domyślnym szyfrze wyprowadzonym z id (patrz resolveCaesarShift na mobile).
// Wartość spoza zakresu to natomiast błąd wejścia, a nie cicha zmiana zagadki.
function ensureCaesarShift(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = parseCaesarShift(
    typeof value === 'number' ? value : Number(value),
  );
  if (parsed === undefined) {
    invalidPayload();
  }

  return parsed;
}
