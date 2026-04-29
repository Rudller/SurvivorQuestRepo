import { BadRequestException } from '@nestjs/common';
import type {
  StationDraftInput,
  StationEntity,
  StationQuiz,
  StationType,
} from '../station.service';

function buildStationFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

const STATION_TYPES: StationType[] = [
  'quiz',
  'audio-quiz',
  'time',
  'points',
  'wordle',
  'hangman',
  'mastermind',
  'anagram',
  'caesar-cipher',
  'memory',
  'simon',
  'rebus',
  'boggle',
  'mini-sudoku',
  'matching',
];
const QUIZ_ANSWER_COUNT = 4;
const DEFAULT_STATION_DESCRIPTION =
  'Opis stanowiska będzie dostępny po rozpoczęciu zadania.';

function isCompletionCodeRequired(type: StationType) {
  return type === 'time' || type === 'points';
}

function isQuizDataStationType(type: StationType) {
  return (
    type === 'quiz' ||
    type === 'audio-quiz' ||
    type === 'wordle' ||
    type === 'hangman' ||
    type === 'mastermind' ||
    type === 'anagram' ||
    type === 'caesar-cipher' ||
    type === 'memory' ||
    type === 'simon' ||
    type === 'rebus' ||
    type === 'boggle' ||
    type === 'mini-sudoku' ||
    type === 'matching'
  );
}

function isWordPuzzleStationType(type: StationType) {
  return (
    type === 'wordle' ||
    type === 'hangman' ||
    type === 'mastermind' ||
    type === 'anagram' ||
    type === 'caesar-cipher' ||
    type === 'rebus' ||
    type === 'boggle' ||
    type === 'memory' ||
    type === 'simon' ||
    type === 'mini-sudoku'
  );
}

function isMatchingStationType(type: StationType) {
  return type === 'matching';
}

function normalizeMatchingAnswer(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(.+?)\s*(?:->|=|:)\s*(.+)$/);
  if (!match) {
    return '';
  }

  const left = match[1].trim();
  const right = match[2].trim();
  if (!left || !right) {
    return '';
  }

  return `${left} -> ${right}`;
}

export type CreateStationDto = {
  name: string;
  type: StationType;
  categories?: string[];
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  quiz?: StationQuiz;
  latitude?: number;
  longitude?: number;
};

export type UpdateStationDto = CreateStationDto & {
  id: string;
};

export type DeleteStationDto = {
  id: string;
  confirmName: string;
};

function ensureStationType(type: unknown): StationType {
  if (typeof type === 'string' && STATION_TYPES.includes(type as StationType)) {
    return type as StationType;
  }

  throw new BadRequestException('Invalid payload');
}

function ensureTrimmedString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException('Invalid payload');
  }

  return value.trim();
}

function ensureStringAllowingEmpty(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid payload');
  }

  return value.trim() || DEFAULT_STATION_DESCRIPTION;
}

function ensurePositiveNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BadRequestException('Invalid payload');
  }

  return Math.round(value);
}

function ensureCoordinate(value: unknown, min: number, max: number) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new BadRequestException('Invalid payload');
  }

  return value;
}

function ensureCoordinates(body: Record<string, unknown>) {
  const hasLatitude = body.latitude !== undefined;
  const hasLongitude = body.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    throw new BadRequestException('Invalid payload');
  }

  if (!hasLatitude) {
    return {
      latitude: undefined,
      longitude: undefined,
    };
  }

  return {
    latitude: ensureCoordinate(body.latitude, -90, 90),
    longitude: ensureCoordinate(body.longitude, -180, 180),
  };
}

function ensureStationCategories(value: unknown): string[] | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const seen = new Set<string>();
  const categories: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      throw new BadRequestException('Invalid payload');
    }

    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    categories.push(normalized);
  }

  return categories;
}

function ensureCompletionCode(
  value: unknown,
  type: StationType,
): string | undefined {
  if (!isCompletionCodeRequired(type)) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid payload');
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(normalized)) {
    throw new BadRequestException('Invalid payload');
  }

  return normalized;
}

function ensureStationQuiz(
  value: unknown,
  type: StationType,
): StationQuiz | undefined {
  if (!isQuizDataStationType(type)) {
    return undefined;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const quiz = value as Record<string, unknown>;
  const question = ensureTrimmedString(quiz.question);

  if (isWordPuzzleStationType(type)) {
    return {
      question,
      answers: [question, 'A', 'B', 'C'],
      correctAnswerIndex: 0,
    };
  }

  if (
    !Array.isArray(quiz.answers) ||
    quiz.answers.length !== QUIZ_ANSWER_COUNT
  ) {
    throw new BadRequestException('Invalid payload');
  }

  const answers = quiz.answers.map((answer) => ensureTrimmedString(answer));
  const normalizedAnswers = isMatchingStationType(type)
    ? answers.map((answer) => normalizeMatchingAnswer(answer))
    : answers;
  const correctAnswerIndex = Math.round(Number(quiz.correctAnswerIndex));
  const audioUrl =
    typeof quiz.audioUrl === 'string' && quiz.audioUrl.trim()
      ? quiz.audioUrl.trim()
      : undefined;

  if (
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
    correctAnswerIndex: isMatchingStationType(type) ? 0 : correctAnswerIndex,
    audioUrl,
  };
}

function ensureStationBody(payload: unknown): CreateStationDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const type = ensureStationType(body.type);
  const { latitude, longitude } = ensureCoordinates(body);

  return {
    name: ensureTrimmedString(body.name),
    type,
    categories: ensureStationCategories(body.categories),
    description: ensureStringAllowingEmpty(body.description),
    imageUrl:
      typeof body.imageUrl === 'string' && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : undefined,
    points: ensurePositiveNumber(body.points),
    timeLimitSeconds:
      typeof body.timeLimitSeconds === 'number' ? body.timeLimitSeconds : NaN,
    completionCode: ensureCompletionCode(body.completionCode, type),
    quiz: ensureStationQuiz(body.quiz, type),
    latitude,
    longitude,
  };
}

export function parseCreateStationDto(payload: unknown): CreateStationDto {
  return ensureStationBody(payload);
}

export function parseUpdateStationDto(payload: unknown): UpdateStationDto {
  const body = ensureStationBody(payload);

  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  return {
    ...body,
    id: ensureTrimmedString((payload as Record<string, unknown>).id),
  };
}

export function parseDeleteStationDto(payload: unknown): DeleteStationDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;

  return {
    id: ensureTrimmedString(body.id),
    confirmName: ensureTrimmedString(body.confirmName),
  };
}

export function toCreateStationEntity(
  dto: CreateStationDto,
  parsedTimeLimitSeconds: number,
): Omit<
  StationEntity,
  | 'sourceTemplateId'
  | 'scenarioInstanceId'
  | 'realizationId'
  | 'kind'
  | 'isTemplate'
> {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: dto.name,
    type: dto.type,
    description: dto.description,
    imageUrl: dto.imageUrl || buildStationFallbackImage(dto.name),
    points: dto.points,
    timeLimitSeconds: parsedTimeLimitSeconds,
    categories: dto.categories ?? [],
    completionCode: dto.completionCode,
    quiz: dto.quiz,
    latitude: dto.latitude,
    longitude: dto.longitude,
    createdAt: now,
    updatedAt: now,
  };
}

export function toUpdateStationEntity(
  current: StationEntity,
  dto: UpdateStationDto,
  parsedTimeLimitSeconds: number,
): StationEntity {
  return {
    ...current,
    name: dto.name,
    type: dto.type,
    description: dto.description,
    imageUrl: dto.imageUrl || buildStationFallbackImage(dto.name),
    points: dto.points,
    timeLimitSeconds: parsedTimeLimitSeconds,
    categories: dto.categories ?? current.categories,
    completionCode: dto.completionCode,
    quiz: dto.quiz,
    latitude: dto.latitude,
    longitude: dto.longitude,
    updatedAt: new Date().toISOString(),
  };
}

export function toStationDraftInput(
  dto: CreateStationDto,
  parsedTimeLimitSeconds: number,
): StationDraftInput {
  return {
    name: dto.name,
    type: dto.type,
    description: dto.description,
    imageUrl: dto.imageUrl,
    points: dto.points,
    timeLimitSeconds: parsedTimeLimitSeconds,
    categories: dto.categories,
    completionCode: dto.completionCode,
    quiz: dto.quiz,
    latitude: dto.latitude,
    longitude: dto.longitude,
  };
}
