import { BadRequestException } from '@nestjs/common';
import type {
  StationDraftInput,
  StationEntity,
  StationQuiz,
  StationTranslation,
  StationTranslations,
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
  'strong-password',
  'photo-task',
  'qr-hunt',
  'open-quiz',
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
    type === 'matching' ||
    type === 'strong-password' ||
    type === 'open-quiz'
  );
}

function isOpenQuizStationType(type: StationType) {
  return type === 'open-quiz';
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
    type === 'mini-sudoku' ||
    type === 'strong-password'
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
  qrEntryCode?: string;
  qrScanCodes?: string[];
  quiz?: StationQuiz;
  translations?: StationTranslations;
  challengeDifficultyMode?: 'admin' | 'player';
  challengeDifficulty?: 'easy' | 'medium' | 'hard';
  completionStopwatchEnabled?: boolean;
  allowConcurrentTeams?: boolean;
  fastestCompletionBonusPoints?: number;
  color?: string;
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

function ensureStationQrScanCodes(value: unknown, type: StationType): string[] {
  if (type !== 'qr-hunt') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const seen = new Set<string>();
  const codes: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      throw new BadRequestException('Invalid payload');
    }

    const normalized = item.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    codes.push(normalized);
  }

  if (codes.length === 0) {
    throw new BadRequestException('Invalid payload');
  }

  return codes;
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

function ensureQrEntryCode(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

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

  if (isOpenQuizStationType(type)) {
    const correctAnswer = ensureTrimmedString(
      Array.isArray(quiz.answers) ? quiz.answers[0] : undefined,
    );

    const seenAcceptedAnswers = new Set<string>([correctAnswer.toLowerCase()]);
    const acceptedAnswers: string[] = [];
    if (quiz.acceptedAnswers !== undefined) {
      if (!Array.isArray(quiz.acceptedAnswers)) {
        throw new BadRequestException('Invalid payload');
      }

      for (const item of quiz.acceptedAnswers) {
        if (typeof item !== 'string') {
          throw new BadRequestException('Invalid payload');
        }

        const trimmed = item.trim();
        if (!trimmed) {
          continue;
        }

        const key = trimmed.toLowerCase();
        if (seenAcceptedAnswers.has(key)) {
          continue;
        }

        seenAcceptedAnswers.add(key);
        acceptedAnswers.push(trimmed);
      }
    }

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

const STATION_TRANSLATION_LANGUAGES: (keyof StationTranslations)[] = [
  'polish',
  'english',
  'ukrainian',
  'russian',
  'other',
];

function ensureStationTranslationQuiz(value: unknown): StationQuiz | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const quiz = value as Record<string, unknown>;
  if (typeof quiz.question !== 'string' || !quiz.question.trim()) {
    return undefined;
  }

  if (
    !Array.isArray(quiz.answers) ||
    quiz.answers.length !== QUIZ_ANSWER_COUNT
  ) {
    return undefined;
  }

  const answers = quiz.answers.map((answer) =>
    typeof answer === 'string' ? answer.trim() : '',
  );
  const correctAnswerIndex = Math.round(Number(quiz.correctAnswerIndex));
  if (
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= QUIZ_ANSWER_COUNT
  ) {
    return undefined;
  }

  const audioUrl =
    typeof quiz.audioUrl === 'string' && quiz.audioUrl.trim()
      ? quiz.audioUrl.trim()
      : undefined;
  const acceptedAnswers = Array.isArray(quiz.acceptedAnswers)
    ? quiz.acceptedAnswers.filter(
        (answer): answer is string =>
          typeof answer === 'string' && answer.trim().length > 0,
      )
    : undefined;

  return {
    question: quiz.question.trim(),
    answers: [answers[0], answers[1], answers[2], answers[3]],
    correctAnswerIndex,
    audioUrl,
    ...(acceptedAnswers?.length ? { acceptedAnswers } : {}),
  };
}

function ensureStationTranslations(
  value: unknown,
): StationTranslations | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const payload = value as Record<string, unknown>;
  const translations: StationTranslations = {};

  for (const language of STATION_TRANSLATION_LANGUAGES) {
    const entry = payload[language];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const item = entry as Record<string, unknown>;
    const translation: StationTranslation = {};

    if (typeof item.name === 'string' && item.name.trim()) {
      translation.name = item.name.trim();
    }

    if (typeof item.description === 'string' && item.description.trim()) {
      translation.description = item.description.trim();
    }

    const quiz = ensureStationTranslationQuiz(item.quiz);
    if (quiz) {
      translation.quiz = quiz;
    }

    if (Object.keys(translation).length > 0) {
      translations[language] = translation;
    }
  }

  return Object.keys(translations).length > 0 ? translations : undefined;
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
    qrEntryCode: ensureQrEntryCode(body.qrEntryCode),
    qrScanCodes: ensureStationQrScanCodes(body.qrScanCodes, type),
    quiz: ensureStationQuiz(body.quiz, type),
    translations: ensureStationTranslations(body.translations),
    challengeDifficultyMode:
      body.challengeDifficultyMode === 'player' ? 'player' : 'admin',
    challengeDifficulty:
      body.challengeDifficulty === 'easy' || body.challengeDifficulty === 'hard'
        ? body.challengeDifficulty
        : 'medium',
    completionStopwatchEnabled: body.completionStopwatchEnabled === true,
    allowConcurrentTeams: body.allowConcurrentTeams === true,
    fastestCompletionBonusPoints:
      body.completionStopwatchEnabled === true &&
      Number.isFinite(Number(body.fastestCompletionBonusPoints))
        ? Math.max(0, Math.round(Number(body.fastestCompletionBonusPoints)))
        : 0,
    color: /^#[0-9a-fA-F]{6}$/.test(String(body.color ?? ''))
      ? String(body.color)
      : undefined,
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
    qrEntryCode: dto.qrEntryCode,
    qrScanCodes: dto.qrScanCodes ?? [],
    quiz: dto.quiz,
    translations: dto.translations,
    challengeDifficultyMode: dto.challengeDifficultyMode ?? 'admin',
    challengeDifficulty: dto.challengeDifficulty ?? 'medium',
    completionStopwatchEnabled: dto.completionStopwatchEnabled ?? false,
    allowConcurrentTeams: dto.allowConcurrentTeams ?? false,
    fastestCompletionBonusPoints: dto.fastestCompletionBonusPoints ?? 0,
    color: dto.color ?? '#f59e0b',
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
    qrEntryCode: dto.qrEntryCode || current.qrEntryCode,
    qrScanCodes: dto.qrScanCodes ?? current.qrScanCodes,
    quiz: dto.quiz,
    translations: dto.translations ?? current.translations,
    challengeDifficultyMode: dto.challengeDifficultyMode ?? 'admin',
    challengeDifficulty: dto.challengeDifficulty ?? 'medium',
    completionStopwatchEnabled: dto.completionStopwatchEnabled ?? false,
    allowConcurrentTeams:
      dto.allowConcurrentTeams ?? current.allowConcurrentTeams,
    fastestCompletionBonusPoints: dto.fastestCompletionBonusPoints ?? 0,
    color: dto.color ?? current.color,
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
    qrScanCodes: dto.qrScanCodes,
    quiz: dto.quiz,
    translations: dto.translations,
    challengeDifficultyMode: dto.challengeDifficultyMode,
    challengeDifficulty: dto.challengeDifficulty,
    completionStopwatchEnabled: dto.completionStopwatchEnabled,
    allowConcurrentTeams: dto.allowConcurrentTeams,
    fastestCompletionBonusPoints: dto.fastestCompletionBonusPoints,
    latitude: dto.latitude,
    longitude: dto.longitude,
  };
}
