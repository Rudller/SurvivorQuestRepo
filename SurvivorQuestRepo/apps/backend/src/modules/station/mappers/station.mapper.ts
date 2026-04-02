import { Prisma, StationType as PrismaStationType } from '@prisma/client';
import { buildStationFallbackImage } from '../domain/station.defaults';
import type {
  StationEntity,
  StationKind,
  StationQuiz,
  StationTranslation,
  StationTranslations,
  StationType,
} from '../domain/station.types';
import { QUIZ_ANSWER_COUNT } from '../domain/station.rules';

function deriveStationKind(input: {
  scenarioInstanceId: string | null;
  realizationId: string | null;
}): StationKind {
  if (input.realizationId) {
    return 'realization-instance';
  }

  if (input.scenarioInstanceId) {
    return 'scenario-instance';
  }

  return 'template';
}

export function toPrismaStationType(type: StationType) {
  if (type === 'quiz') return PrismaStationType.QUIZ;
  if (type === 'audio-quiz') return PrismaStationType.AUDIO_QUIZ;
  if (type === 'time') return PrismaStationType.TIME;
  if (type === 'points') return PrismaStationType.POINTS;
  if (type === 'wordle') return PrismaStationType.WORDLE;
  if (type === 'hangman') return PrismaStationType.HANGMAN;
  if (type === 'mastermind') return PrismaStationType.MASTERMIND;
  if (type === 'anagram') return PrismaStationType.ANAGRAM;
  if (type === 'caesar-cipher') return PrismaStationType.CAESAR_CIPHER;
  if (type === 'memory') return PrismaStationType.MEMORY;
  if (type === 'simon') return PrismaStationType.SIMON;
  if (type === 'rebus') return PrismaStationType.REBUS;
  if (type === 'boggle') return PrismaStationType.BOGGLE;
  if (type === 'mini-sudoku') return PrismaStationType.MINI_SUDOKU;
  return PrismaStationType.MATCHING;
}

function fromPrismaStationType(type: PrismaStationType): StationType {
  if (type === PrismaStationType.QUIZ) return 'quiz';
  if (type === PrismaStationType.AUDIO_QUIZ) return 'audio-quiz';
  if (type === PrismaStationType.TIME) return 'time';
  if (type === PrismaStationType.POINTS) return 'points';
  if (type === PrismaStationType.WORDLE) return 'wordle';
  if (type === PrismaStationType.HANGMAN) return 'hangman';
  if (type === PrismaStationType.MASTERMIND) return 'mastermind';
  if (type === PrismaStationType.ANAGRAM) return 'anagram';
  if (type === PrismaStationType.CAESAR_CIPHER) return 'caesar-cipher';
  if (type === PrismaStationType.MEMORY) return 'memory';
  if (type === PrismaStationType.SIMON) return 'simon';
  if (type === PrismaStationType.REBUS) return 'rebus';
  if (type === PrismaStationType.BOGGLE) return 'boggle';
  if (type === PrismaStationType.MINI_SUDOKU) return 'mini-sudoku';
  return 'matching';
}

export function toPrismaStationQuizData(quiz: StationQuiz | undefined) {
  if (!quiz) {
    return Prisma.DbNull;
  }

  return {
    question: quiz.question,
    answers: quiz.answers,
    correctAnswerIndex: quiz.correctAnswerIndex,
    ...(quiz.audioUrl ? { audioUrl: quiz.audioUrl } : {}),
  } as Prisma.InputJsonValue;
}

function parseStationQuizData(
  quizData: Prisma.JsonValue | null,
): StationQuiz | undefined {
  if (!quizData || typeof quizData !== 'object' || Array.isArray(quizData)) {
    return undefined;
  }

  const payload = quizData as Record<string, unknown>;
  const question = payload.question;
  const answers = payload.answers;
  const correctAnswerIndex = payload.correctAnswerIndex;
  const audioUrl = payload.audioUrl;

  if (
    typeof question !== 'string' ||
    !Array.isArray(answers) ||
    answers.length !== QUIZ_ANSWER_COUNT ||
    !answers.every((answer) => typeof answer === 'string') ||
    typeof correctAnswerIndex !== 'number'
  ) {
    return undefined;
  }

  const normalizedQuestion = question.trim();
  const normalizedAnswers = answers.map((answer) => answer.trim());
  const normalizedCorrectAnswerIndex = Math.round(correctAnswerIndex);

  if (
    !normalizedQuestion ||
    normalizedAnswers.some((answer) => !answer) ||
    !Number.isInteger(normalizedCorrectAnswerIndex) ||
    normalizedCorrectAnswerIndex < 0 ||
    normalizedCorrectAnswerIndex >= QUIZ_ANSWER_COUNT
  ) {
    return undefined;
  }

  const normalizedAudioUrl =
    typeof audioUrl === 'string' && audioUrl.trim()
      ? audioUrl.trim()
      : undefined;

  return {
    question: normalizedQuestion,
    answers: [
      normalizedAnswers[0],
      normalizedAnswers[1],
      normalizedAnswers[2],
      normalizedAnswers[3],
    ],
    correctAnswerIndex: normalizedCorrectAnswerIndex,
    audioUrl: normalizedAudioUrl,
  };
}

export function toPrismaStationTranslationsData(
  translations: StationTranslations | undefined,
) {
  if (!translations) {
    return Prisma.DbNull;
  }

  const normalized = Object.entries(translations).reduce<
    Record<string, Prisma.InputJsonValue>
  >((acc, [key, value]) => {
    if (!value || typeof value !== 'object') {
      return acc;
    }

    const next: Record<string, Prisma.InputJsonValue> = {};

    if (typeof value.name === 'string' && value.name.trim()) {
      next.name = value.name.trim();
    }

    if (typeof value.description === 'string' && value.description.trim()) {
      next.description = value.description.trim();
    }

    if (value.quiz) {
      next.quiz = {
        question: value.quiz.question,
        answers: value.quiz.answers,
        correctAnswerIndex: value.quiz.correctAnswerIndex,
        ...(value.quiz.audioUrl ? { audioUrl: value.quiz.audioUrl } : {}),
      } as Prisma.InputJsonValue;
    }

    if (Object.keys(next).length === 0) {
      return acc;
    }

    acc[key] = next;
    return acc;
  }, {});

  if (Object.keys(normalized).length === 0) {
    return Prisma.DbNull;
  }

  return normalized as Prisma.InputJsonValue;
}

function parseStationTranslationsData(
  translationsData: Prisma.JsonValue | null,
): StationTranslations | undefined {
  if (
    !translationsData ||
    typeof translationsData !== 'object' ||
    Array.isArray(translationsData)
  ) {
    return undefined;
  }

  const payload = translationsData as Record<string, unknown>;
  const parsed = Object.entries(payload).reduce<StationTranslations>(
    (acc, [key, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return acc;
      }

      const item = value as Record<string, unknown>;
      const translation: StationTranslation = {};

      if (typeof item.name === 'string' && item.name.trim()) {
        translation.name = item.name.trim();
      }

      if (typeof item.description === 'string' && item.description.trim()) {
        translation.description = item.description.trim();
      }

      const parsedQuiz = parseStationQuizData(
        (item.quiz as Prisma.JsonValue | null) ?? null,
      );
      if (parsedQuiz) {
        translation.quiz = parsedQuiz;
      }

      if (Object.keys(translation).length === 0) {
        return acc;
      }

      if (
        key === 'polish' ||
        key === 'english' ||
        key === 'ukrainian' ||
        key === 'russian' ||
        key === 'other'
      ) {
        acc[key] = translation;
      }
      return acc;
    },
    {},
  );

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

export function mapStation(input: {
  id: string;
  name: string;
  type: PrismaStationType;
  description: string;
  imageUrl: string | null;
  points: number;
  timeLimitSeconds: number;
  completionCode: string | null;
  quizData: Prisma.JsonValue | null;
  translations: Prisma.JsonValue | null;
  latitude: number | null;
  longitude: number | null;
  sourceTemplateId: string | null;
  scenarioInstanceId: string | null;
  realizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): StationEntity {
  const kind = deriveStationKind(input);

  return {
    id: input.id,
    name: input.name,
    type: fromPrismaStationType(input.type),
    description: input.description,
    imageUrl: input.imageUrl || buildStationFallbackImage(input.name),
    points: input.points,
    timeLimitSeconds: input.timeLimitSeconds,
    completionCode: input.completionCode || undefined,
    quiz: parseStationQuizData(input.quizData),
    translations: parseStationTranslationsData(input.translations),
    latitude: typeof input.latitude === 'number' ? input.latitude : undefined,
    longitude:
      typeof input.longitude === 'number' ? input.longitude : undefined,
    sourceTemplateId: input.sourceTemplateId || undefined,
    scenarioInstanceId: input.scenarioInstanceId || undefined,
    realizationId: input.realizationId || undefined,
    kind,
    isTemplate: kind === 'template',
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}
