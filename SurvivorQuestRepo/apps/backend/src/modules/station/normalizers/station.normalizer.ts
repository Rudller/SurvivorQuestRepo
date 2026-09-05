import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_STATION_DESCRIPTION,
  buildStationFallbackImage,
} from '../domain/station.defaults';
import {
  COMPLETION_CODE_REGEX,
  isCompletionCodeRequiredStationType,
} from '../domain/station.rules';
import { buildStationQuizFromInput } from './station-quiz.normalizer';
import type {
  ChallengeDifficulty,
  ChallengeDifficultyMode,
  StationDraftInput,
  StationQuiz,
} from '../domain/station.types';

function normalizeChallengeDifficultyMode(
  value: StationDraftInput['challengeDifficultyMode'],
): ChallengeDifficultyMode {
  return value === 'player' ? 'player' : 'admin';
}

function normalizeChallengeDifficulty(
  value: StationDraftInput['challengeDifficulty'],
): ChallengeDifficulty {
  return value === 'easy' || value === 'hard' ? value : 'medium';
}

function normalizeCompletionStopwatchEnabled(
  value: StationDraftInput['completionStopwatchEnabled'],
): boolean {
  return value === true;
}

function normalizeAllowConcurrentTeams(
  value: StationDraftInput['allowConcurrentTeams'],
): boolean {
  return value === true;
}

function normalizeFastestCompletionBonusPoints(
  value: StationDraftInput['fastestCompletionBonusPoints'],
  completionStopwatchEnabled: boolean,
): number {
  if (!completionStopwatchEnabled) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

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
  // Szkic osadzony w realizacji: felerna lista kluczy odpowiedzi jest pomijana,
  // a nie wywraca zapisu calej realizacji. Sciezka HTTP (station.dto.ts) uzywa
  // tego samego buildera z domyslnym 'throw'.
  return buildStationQuizFromInput(quiz, stationType, {
    onInvalidAnswerKeys: 'skip',
  });
}

function normalizeQrScanCodes(
  codes: StationDraftInput['qrScanCodes'],
  stationType: StationDraftInput['type'],
): string[] {
  if (stationType !== 'qr-hunt') {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const code of codes ?? []) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  if (normalized.length === 0) {
    throw new BadRequestException('Invalid payload');
  }

  return normalized;
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

function normalizeQrEntryCode(qrEntryCode: string | undefined) {
  const normalized = qrEntryCode?.trim().toUpperCase() ?? '';
  if (!normalized) {
    return undefined;
  }

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
  const normalizedCompletionStopwatchEnabled =
    input.type === 'photo-task'
      ? false
      : normalizeCompletionStopwatchEnabled(input.completionStopwatchEnabled);

  return {
    name: normalizedName,
    type: input.type,
    categories: normalizeStationCategories(input.categories),
    description: input.description.trim() || DEFAULT_STATION_DESCRIPTION,
    imageUrl: resolveImageUrl(input.imageUrl, normalizedName || currentId),
    points: Math.round(input.points),
    timeLimitSeconds:
      input.type === 'photo-task' ? 0 : Math.round(input.timeLimitSeconds),
    completionCode: normalizedCompletionCode,
    qrEntryCode: normalizeQrEntryCode(input.qrEntryCode),
    qrScanCodes: normalizeQrScanCodes(input.qrScanCodes, input.type),
    quiz: normalizedQuiz,
    translations: input.translations,
    challengeDifficultyMode: normalizeChallengeDifficultyMode(
      input.challengeDifficultyMode,
    ),
    challengeDifficulty: normalizeChallengeDifficulty(
      input.challengeDifficulty,
    ),
    completionStopwatchEnabled: normalizedCompletionStopwatchEnabled,
    allowConcurrentTeams: normalizeAllowConcurrentTeams(
      input.allowConcurrentTeams,
    ),
    fastestCompletionBonusPoints: normalizeFastestCompletionBonusPoints(
      input.fastestCompletionBonusPoints,
      normalizedCompletionStopwatchEnabled,
    ),
    latitude:
      typeof input.latitude === 'number' && Number.isFinite(input.latitude)
        ? input.latitude
        : undefined,
    longitude:
      typeof input.longitude === 'number' && Number.isFinite(input.longitude)
        ? input.longitude
        : undefined,
    color: /^#[0-9a-fA-F]{6}$/.test(input.color ?? '')
      ? input.color!
      : '#f59e0b',
    sourceTemplateId: input.sourceTemplateId?.trim() || undefined,
  };
}
