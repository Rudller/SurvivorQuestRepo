import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_STATION_DESCRIPTION,
  buildStationFallbackImage,
} from '../domain/station.defaults';
import {
  COMPLETION_CODE_REGEX,
  QUIZ_ANSWER_COUNT,
  isCompletionCodeRequiredStationType,
  isMatchingStationType,
  isQuizDataStationType,
  isWordPuzzleStationType,
  normalizeMatchingAnswer,
} from '../domain/station.rules';
import type { StationDraftInput, StationQuiz } from '../domain/station.types';

function resolveImageUrl(imageUrl: string | undefined, seed: string) {
  return imageUrl?.trim() || buildStationFallbackImage(seed);
}

function normalizeStationCategories(categories: string[] | undefined) {
  if (!categories) {
    return undefined;
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const category of categories) {
    const trimmed = category.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function normalizeStationQuiz(
  quiz: StationQuiz | undefined,
  stationType: StationDraftInput['type'],
): StationQuiz | undefined {
  if (!isQuizDataStationType(stationType)) {
    return undefined;
  }

  if (!quiz) {
    throw new BadRequestException('Invalid payload');
  }

  const question = quiz.question?.trim();
  if (isWordPuzzleStationType(stationType)) {
    if (typeof question !== 'string' || !question) {
      throw new BadRequestException('Invalid payload');
    }

    return {
      question,
      answers: [question, 'A', 'B', 'C'],
      correctAnswerIndex: 0,
    };
  }

  const answers = quiz.answers?.map((answer) => answer.trim());
  const normalizedAnswers = isMatchingStationType(stationType)
    ? answers?.map((answer) => normalizeMatchingAnswer(answer))
    : answers;
  const correctAnswerIndex = Math.round(quiz.correctAnswerIndex);
  const audioUrl =
    typeof quiz.audioUrl === 'string' && quiz.audioUrl.trim()
      ? quiz.audioUrl.trim()
      : undefined;

  if (
    typeof question !== 'string' ||
    !question ||
    !Array.isArray(normalizedAnswers) ||
    normalizedAnswers.length !== QUIZ_ANSWER_COUNT ||
    normalizedAnswers.some((answer) => !answer) ||
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= QUIZ_ANSWER_COUNT
  ) {
    throw new BadRequestException('Invalid payload');
  }

  return {
    question,
    answers: [
      normalizedAnswers[0],
      normalizedAnswers[1],
      normalizedAnswers[2],
      normalizedAnswers[3],
    ],
    correctAnswerIndex: isMatchingStationType(stationType)
      ? 0
      : correctAnswerIndex,
    audioUrl,
  };
}

function normalizeCompletionCode(
  completionCode: string | undefined,
  stationType: StationDraftInput['type'],
) {
  if (!isCompletionCodeRequiredStationType(stationType)) {
    return undefined;
  }

  const normalized = completionCode?.trim().toUpperCase() ?? '';
  if (!COMPLETION_CODE_REGEX.test(normalized)) {
    throw new BadRequestException('Invalid payload');
  }

  return normalized;
}

export function normalizeStationDraft(
  input: StationDraftInput,
  currentId: string,
) {
  const normalizedName = input.name.trim() || 'Untitled station';
  const normalizedCompletionCode = normalizeCompletionCode(
    input.completionCode,
    input.type,
  );
  const normalizedQuiz = normalizeStationQuiz(input.quiz, input.type);

  return {
    name: normalizedName,
    type: input.type,
    categories: normalizeStationCategories(input.categories),
    description: input.description.trim() || DEFAULT_STATION_DESCRIPTION,
    imageUrl: resolveImageUrl(input.imageUrl, normalizedName || currentId),
    points: Math.round(input.points),
    timeLimitSeconds: Math.round(input.timeLimitSeconds),
    completionCode: normalizedCompletionCode,
    quiz: normalizedQuiz,
    translations: input.translations,
    latitude:
      typeof input.latitude === 'number' && Number.isFinite(input.latitude)
        ? input.latitude
        : undefined,
    longitude:
      typeof input.longitude === 'number' && Number.isFinite(input.longitude)
        ? input.longitude
        : undefined,
    sourceTemplateId: input.sourceTemplateId?.trim() || undefined,
  };
}
