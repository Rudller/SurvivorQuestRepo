import { BadRequestException } from '@nestjs/common';
import type {
  PointsQrCodeDraftPayload,
  RealizationLanguage,
  RealizationEntity,
  RealizationStatus,
  RealizationTranslation,
  RealizationTranslations,
  RealizationType,
  ScenarioStationDraftPayload,
  ValidatedRealizationPayload,
} from '../entities/realization.entity';

const REALIZATION_TRANSLATION_LANGUAGES: (keyof RealizationTranslations)[] = [
  'polish',
  'english',
  'ukrainian',
  'russian',
  'other',
];

function ensureRealizationTranslations(
  value: unknown,
): RealizationTranslations | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const payload = value as Record<string, unknown>;
  const translations: RealizationTranslations = {};

  for (const language of REALIZATION_TRANSLATION_LANGUAGES) {
    const entry = payload[language];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const item = entry as Record<string, unknown>;
    const translation: RealizationTranslation = {};

    if (typeof item.introText === 'string' && item.introText.trim()) {
      translation.introText = item.introText.trim();
    }

    if (typeof item.gameRules === 'string' && item.gameRules.trim()) {
      translation.gameRules = item.gameRules.trim();
    }

    if (Object.keys(translation).length > 0) {
      translations[language] = translation;
    }
  }

  return Object.keys(translations).length > 0 ? translations : undefined;
}

const REALIZATION_TYPES: RealizationType[] = [
  'outdoor-games',
  'hotel-games',
  'workshops',
  'evening-attractions',
  'dj',
  'recreation',
  'risk-quiz',
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
  translations?: unknown;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: unknown;
  notes?: string;
  type?: RealizationType;
  logoUrl?: string;
  hideMap?: boolean;
  mapImageUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId?: string;
  riskSchemeId?: string;
  teamCount?: number;
  peopleCount?: number;
  positionsCount?: number;
  durationMinutes?: number;
  status?: RealizationStatus;
  scheduledAt?: string;
  showLeaderboard?: boolean;
  showLeaderboardDuringGame?: boolean;
  showLeaderboardOnFinish?: boolean;
  hideLeaderboardMinutesBeforeEnd?: number;
  teamStationNumberingEnabled?: boolean;
  timedStationPointsDecayEnabled?: boolean;
  hideTaskList?: boolean;
  riskChatEnabled?: boolean;
  riskChatTeamsCanPost?: boolean;
  pigsEnabled?: boolean;
  pigGrantIntervalMinutes?: number;
  pigEffectSeconds?: number;
  pigShowThrowerName?: boolean;
  changedBy?: string;
  scenarioStations?: unknown;
  pointsQrCodes?: unknown;
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

  if (
    payload.sourceLanguage === 'other' ||
    payload.targetLanguage === 'other'
  ) {
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

// Bounds picked so the mechanic stays recognisable: below a minute the room
// never gets a break, above twenty a long game hands out barely any pigs.
function clampPigInterval(value: unknown) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5;
  }
  return Math.min(20, Math.max(1, parsed));
}

function clampPigEffectSeconds(value: unknown) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 90;
  }
  return Math.min(300, Math.max(15, parsed));
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
  const translations = ensureRealizationTranslations(payload.translations);
  const contactPerson = payload.contactPerson?.trim() || '';
  const contactPhone = payload.contactPhone?.trim() || '';
  const contactEmail = payload.contactEmail?.trim() || '';
  const instructors = sanitizeInstructors(payload.instructors);
  const notes = payload.notes?.trim() || '';
  const teamCount = Math.round(Number(payload.teamCount));
  const peopleCount = Math.round(Number(payload.peopleCount));
  const positionsCount = Math.round(Number(payload.positionsCount));
  const durationMinutes = Math.round(Number(payload.durationMinutes));
  const scenarioId = payload.scenarioId?.trim() || '';
  const riskSchemeId = payload.riskSchemeId?.trim() || '';
  const isRiskQuizType = payload.type === 'risk-quiz';
  // Risk-quiz realizations don't use the scenario/station machinery at all —
  // Realization.scenarioId is nullable precisely for this type, so the admin
  // is never required to pick one. They instead pick a "talia" (RiskScheme).
  const requiresScenario = !isRiskQuizType;
  const showLeaderboard = payload.showLeaderboard;
  const showLeaderboardDuringGame = payload.showLeaderboardDuringGame;
  const showLeaderboardOnFinish = payload.showLeaderboardOnFinish;
  const hideLeaderboardMinutesBeforeEnd =
    payload.hideLeaderboardMinutesBeforeEnd;
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
    (requiresScenario && !scenarioId) ||
    (isRiskQuizType && !riskSchemeId) ||
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
    typeof hideLeaderboardMinutesBeforeEnd !== 'undefined' &&
    (!Number.isFinite(Number(hideLeaderboardMinutesBeforeEnd)) ||
      Number(hideLeaderboardMinutesBeforeEnd) < 0)
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

  let pointsQrCodeDrafts: PointsQrCodeDraftPayload[] | undefined;
  if (typeof payload.pointsQrCodes !== 'undefined') {
    if (!Array.isArray(payload.pointsQrCodes)) {
      throw new BadRequestException('Invalid payload');
    }

    pointsQrCodeDrafts = payload.pointsQrCodes.map(
      (item) => (item || {}) as PointsQrCodeDraftPayload,
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
    translations,
    contactPerson,
    contactPhone: contactPhone || undefined,
    contactEmail: contactEmail || undefined,
    instructors,
    notes: notes || undefined,
    type: payload.type,
    logoUrl: payload.logoUrl?.trim() || undefined,
    hideMap: payload.hideMap === true,
    hideTaskList: payload.hideTaskList === true,
    // Both default to on when the field is absent, unlike hideTaskList above —
    // an older client that does not send them must not silently switch the chat
    // off for a realization that had it.
    riskChatEnabled: payload.riskChatEnabled !== false,
    riskChatTeamsCanPost: payload.riskChatTeamsCanPost !== false,
    pigsEnabled: payload.pigsEnabled !== false,
    // Clamped rather than rejected: these come from number inputs an admin can
    // empty, and a realization with a zero-minute interval would hand out pigs
    // on every single poll.
    pigGrantIntervalMinutes: clampPigInterval(payload.pigGrantIntervalMinutes),
    pigEffectSeconds: clampPigEffectSeconds(payload.pigEffectSeconds),
    pigShowThrowerName: payload.pigShowThrowerName !== false,
    mapImageUrl: payload.mapImageUrl?.trim() || undefined,
    offerPdfUrl: payload.offerPdfUrl?.trim() || undefined,
    offerPdfName: payload.offerPdfName?.trim() || undefined,
    scenarioId,
    riskSchemeId: isRiskQuizType ? riskSchemeId : undefined,
    teamCount,
    peopleCount,
    positionsCount,
    durationMinutes,
    showLeaderboard:
      resolvedShowLeaderboardDuringGame || resolvedShowLeaderboardOnFinish,
    showLeaderboardDuringGame: resolvedShowLeaderboardDuringGame,
    showLeaderboardOnFinish: resolvedShowLeaderboardOnFinish,
    hideLeaderboardMinutesBeforeEnd:
      typeof hideLeaderboardMinutesBeforeEnd === 'number' &&
      Number.isFinite(hideLeaderboardMinutesBeforeEnd) &&
      hideLeaderboardMinutesBeforeEnd >= 0
        ? Math.round(hideLeaderboardMinutesBeforeEnd)
        : 0,
    teamStationNumberingEnabled: payload.teamStationNumberingEnabled ?? true,
    timedStationPointsDecayEnabled:
      payload.timedStationPointsDecayEnabled ?? false,
    status: payload.status,
    scheduledAt,
    changedBy: payload.changedBy?.trim() || 'admin@local',
    stationDrafts,
    pointsQrCodeDrafts,
  };
}

export function requireRealizationId(payload: UpdateRealizationDto) {
  const realizationId = payload.id?.trim();
  if (!realizationId) {
    throw new BadRequestException('Invalid payload');
  }

  return realizationId;
}

export type DeleteRealizationDto = {
  id: string;
  confirmName: string;
};

export function parseDeleteRealizationDto(
  payload: unknown,
): DeleteRealizationDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const confirmName =
    typeof body.confirmName === 'string' ? body.confirmName.trim() : '';

  if (!id || !confirmName) {
    throw new BadRequestException('Invalid payload');
  }

  return { id, confirmName };
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
