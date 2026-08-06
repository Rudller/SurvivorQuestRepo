import { BadRequestException } from '@nestjs/common';
import type {
  RealizationLanguage,
  RealizationEntity,
  RealizationStatus,
  RealizationType,
  ScenarioStationDraftPayload,
  ValidatedRealizationPayload,
} from '../entities/realization.entity';

const REALIZATION_TYPES: RealizationType[] = [
  'outdoor-games',
  'hotel-games',
  'workshops',
  'evening-attractions',
  'dj',
  'recreation',
];

const REALIZATION_STATUSES: RealizationStatus[] = [
  'planned',
  'in-progress',
  'done',
];

const REALIZATION_LANGUAGES: RealizationLanguage[] = [
  'polish',
  'english',
  'ukrainian',
  'russian',
  'other',
];

export type CreateRealizationDto = {
  companyName?: string;
  location?: string;
  language?: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: unknown;
  type?: RealizationType;
  logoUrl?: string;
  hideMap?: boolean;
  mapImageUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId?: string;
  teamCount?: number;
  peopleCount?: number;
  positionsCount?: number;
  durationMinutes?: number;
  status?: RealizationStatus;
  scheduledAt?: string;
  showLeaderboard?: boolean;
  showLeaderboardDuringGame?: boolean;
  showLeaderboardOnFinish?: boolean;
  teamStationNumberingEnabled?: boolean;
  timedStationPointsDecayEnabled?: boolean;
  hideTaskList?: boolean;
  changedBy?: string;
  scenarioStations?: unknown;
};

export type UpdateRealizationDto = CreateRealizationDto & {
  id?: string;
};

export type TranslateRealizationTextsDto = {
  sourceLanguage?: RealizationLanguage;
  targetLanguage?: RealizationLanguage;
  texts?: unknown;
};

export type ValidatedTranslateRealizationTextsPayload = {
  sourceLanguage: RealizationLanguage;
  targetLanguage: RealizationLanguage;
  texts: string[];
};

const TRANSLATE_TEXTS_MAX_COUNT = 200;
const TRANSLATE_TEXTS_MAX_LENGTH = 5000;

export function validateTranslateRealizationTextsPayload(
  payload: TranslateRealizationTextsDto,
): ValidatedTranslateRealizationTextsPayload {
  if (
    !isValidRealizationLanguage(payload.sourceLanguage) ||
    !isValidRealizationLanguage(payload.targetLanguage)
  ) {
    throw new BadRequestException('Invalid source or target language.');
  }

  if (payload.sourceLanguage === 'other' || payload.targetLanguage === 'other') {
    throw new BadRequestException(
      'Automatic translation is not available for a custom language.',
    );
  }

  if (payload.sourceLanguage === payload.targetLanguage) {
    throw new BadRequestException(
      'Source and target language must be different.',
    );
  }

  if (!Array.isArray(payload.texts) || payload.texts.length === 0) {
    throw new BadRequestException('texts must be a non-empty array.');
  }

  if (payload.texts.length > TRANSLATE_TEXTS_MAX_COUNT) {
    throw new BadRequestException(
      `texts must contain at most ${TRANSLATE_TEXTS_MAX_COUNT} entries.`,
    );
  }

  const texts = payload.texts.map((text) => {
    if (typeof text !== 'string') {
      throw new BadRequestException('Each text entry must be a string.');
    }
    if (text.length > TRANSLATE_TEXTS_MAX_LENGTH) {
      throw new BadRequestException(
        `Each text entry must be at most ${TRANSLATE_TEXTS_MAX_LENGTH} characters.`,
      );
    }
    return text;
  });

  return {
    sourceLanguage: payload.sourceLanguage,
    targetLanguage: payload.targetLanguage,
    texts,
  };
}

function sanitizeInstructors(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function isValidRealizationType(value: unknown): value is RealizationType {
  return (
    typeof value === 'string' &&
    REALIZATION_TYPES.includes(value as RealizationType)
  );
}

function isValidRealizationStatus(value: unknown): value is RealizationStatus {
  return (
    typeof value === 'string' &&
    REALIZATION_STATUSES.includes(value as RealizationStatus)
  );
}

function isValidRealizationLanguage(
  value: unknown,
): value is RealizationLanguage {
  return (
    typeof value === 'string' &&
    REALIZATION_LANGUAGES.includes(value as RealizationLanguage)
  );
}

export function validateRealizationPayload(
  payload: CreateRealizationDto,
): ValidatedRealizationPayload {
  const companyName = payload.companyName?.trim() || '';
  const location = payload.location?.trim() || '';
  const customLanguage = payload.customLanguage?.trim() || '';
  const introText = payload.introText?.trim() || '';
  const gameRules = payload.gameRules?.trim() || '';
  const contactPerson = payload.contactPerson?.trim() || '';
  const contactPhone = payload.contactPhone?.trim() || '';
  const contactEmail = payload.contactEmail?.trim() || '';
  const instructors = sanitizeInstructors(payload.instructors);
  const teamCount = Math.round(Number(payload.teamCount));
  const peopleCount = Math.round(Number(payload.peopleCount));
  const positionsCount = Math.round(Number(payload.positionsCount));
  const durationMinutes = Math.round(Number(payload.durationMinutes));
  const scenarioId = payload.scenarioId?.trim() || '';
  const showLeaderboard = payload.showLeaderboard;
  const showLeaderboardDuringGame = payload.showLeaderboardDuringGame;
  const showLeaderboardOnFinish = payload.showLeaderboardOnFinish;
  const teamStationNumberingEnabled = payload.teamStationNumberingEnabled;
  const timedStationPointsDecayEnabled = payload.timedStationPointsDecayEnabled;
  const scheduledAtDate = payload.scheduledAt
    ? new Date(payload.scheduledAt)
    : null;
  const scheduledAt =
    scheduledAtDate && Number.isFinite(scheduledAtDate.getTime())
      ? scheduledAtDate.toISOString()
      : '';

  if (
    !companyName ||
    !contactPerson ||
    (!contactPhone && !contactEmail) ||
    !isValidRealizationType(payload.type) ||
    !isValidRealizationLanguage(payload.language) ||
    !isValidRealizationStatus(payload.status) ||
    !scenarioId ||
    !Number.isFinite(teamCount) ||
    teamCount < 1 ||
    !Number.isFinite(peopleCount) ||
    peopleCount < 1 ||
    !Number.isFinite(positionsCount) ||
    positionsCount < 1 ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1 ||
    !scheduledAt
  ) {
    throw new BadRequestException('Invalid payload');
  }

  if (
    typeof showLeaderboard !== 'undefined' &&
    typeof showLeaderboard !== 'boolean'
  ) {
    throw new BadRequestException('Invalid payload');
  }
  if (
    typeof showLeaderboardDuringGame !== 'undefined' &&
    typeof showLeaderboardDuringGame !== 'boolean'
  ) {
    throw new BadRequestException('Invalid payload');
  }
  if (
    typeof showLeaderboardOnFinish !== 'undefined' &&
    typeof showLeaderboardOnFinish !== 'boolean'
  ) {
    throw new BadRequestException('Invalid payload');
  }
  if (
    typeof teamStationNumberingEnabled !== 'undefined' &&
    typeof teamStationNumberingEnabled !== 'boolean'
  ) {
    throw new BadRequestException('Invalid payload');
  }
  if (
    typeof timedStationPointsDecayEnabled !== 'undefined' &&
    typeof timedStationPointsDecayEnabled !== 'boolean'
  ) {
    throw new BadRequestException('Invalid payload');
  }

  if (payload.language === 'other' && !customLanguage) {
    throw new BadRequestException('Invalid payload');
  }

  let stationDrafts: ScenarioStationDraftPayload[] | undefined;
  if (typeof payload.scenarioStations !== 'undefined') {
    if (!Array.isArray(payload.scenarioStations)) {
      throw new BadRequestException('Invalid payload');
    }

    stationDrafts = payload.scenarioStations.map(
      (item) => (item || {}) as ScenarioStationDraftPayload,
    );
  }

  const resolvedShowLeaderboardDuringGame =
    typeof payload.showLeaderboardDuringGame === 'boolean'
      ? payload.showLeaderboardDuringGame
      : typeof payload.showLeaderboard === 'boolean'
        ? payload.showLeaderboard
        : true;
  const resolvedShowLeaderboardOnFinish =
    typeof payload.showLeaderboardOnFinish === 'boolean'
      ? payload.showLeaderboardOnFinish
      : typeof payload.showLeaderboard === 'boolean'
        ? payload.showLeaderboard
        : true;

  return {
    companyName,
    location: location || undefined,
    language: payload.language,
    customLanguage: payload.language === 'other' ? customLanguage : undefined,
    introText: introText || undefined,
    gameRules: gameRules || undefined,
    contactPerson,
    contactPhone: contactPhone || undefined,
    contactEmail: contactEmail || undefined,
    instructors,
    type: payload.type,
    logoUrl: payload.logoUrl?.trim() || undefined,
    hideMap: payload.hideMap === true,
    hideTaskList: payload.hideTaskList === true,
    mapImageUrl: payload.mapImageUrl?.trim() || undefined,
    offerPdfUrl: payload.offerPdfUrl?.trim() || undefined,
    offerPdfName: payload.offerPdfName?.trim() || undefined,
    scenarioId,
    teamCount,
    peopleCount,
    positionsCount,
    durationMinutes,
    showLeaderboard:
      resolvedShowLeaderboardDuringGame || resolvedShowLeaderboardOnFinish,
    showLeaderboardDuringGame: resolvedShowLeaderboardDuringGame,
    showLeaderboardOnFinish: resolvedShowLeaderboardOnFinish,
    teamStationNumberingEnabled: payload.teamStationNumberingEnabled ?? true,
    timedStationPointsDecayEnabled:
      payload.timedStationPointsDecayEnabled ?? false,
    status: payload.status,
    scheduledAt,
    changedBy: payload.changedBy?.trim() || 'admin@local',
    stationDrafts,
  };
}

export function requireRealizationId(payload: UpdateRealizationDto) {
  const realizationId = payload.id?.trim();
  if (!realizationId) {
    throw new BadRequestException('Invalid payload');
  }

  return realizationId;
}

export function toUpdatedScenarioEntity(
  scenario: { stationIds: string[]; updatedAt: string },
  stationIds: string[],
) {
  return {
    ...scenario,
    stationIds,
    updatedAt: new Date().toISOString(),
  };
}

export function toRealizationSuccessMeta(entity: RealizationEntity) {
  return {
    id: entity.id,
    scenarioId: entity.scenarioId,
    teamCount: entity.teamCount,
  };
}
