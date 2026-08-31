import {
  Prisma,
  RealizationLanguage as PrismaRealizationLanguage,
  RealizationStatus as PrismaRealizationStatus,
  RealizationType as PrismaRealizationType,
} from '@prisma/client';
import type {
  RealizationEntity,
  RealizationLanguage,
  RealizationLog,
  RealizationStatus,
  RealizationTranslation,
  RealizationTranslations,
  RealizationType,
} from '../entities/realization.entity';

const MINUTES_TO_MS = 60_000;
const DAY_TO_MS = 24 * 60 * 60 * 1000;

export function fromPrismaRealizationType(
  type: PrismaRealizationType,
): RealizationType {
  if (type === PrismaRealizationType.OUTDOOR_GAMES) return 'outdoor-games';
  if (type === PrismaRealizationType.HOTEL_GAMES) return 'hotel-games';
  if (type === PrismaRealizationType.WORKSHOPS) return 'workshops';
  if (type === PrismaRealizationType.EVENING_ATTRACTIONS)
    return 'evening-attractions';
  if (type === PrismaRealizationType.DJ) return 'dj';
  if (type === PrismaRealizationType.RISK_QUIZ) return 'risk-quiz';
  return 'recreation';
}

export function toPrismaRealizationType(type: RealizationType) {
  if (type === 'outdoor-games') return PrismaRealizationType.OUTDOOR_GAMES;
  if (type === 'hotel-games') return PrismaRealizationType.HOTEL_GAMES;
  if (type === 'workshops') return PrismaRealizationType.WORKSHOPS;
  if (type === 'evening-attractions')
    return PrismaRealizationType.EVENING_ATTRACTIONS;
  if (type === 'dj') return PrismaRealizationType.DJ;
  if (type === 'risk-quiz') return PrismaRealizationType.RISK_QUIZ;
  return PrismaRealizationType.RECREATION;
}

export function fromPrismaRealizationLanguage(
  language: PrismaRealizationLanguage,
): RealizationLanguage {
  if (language === PrismaRealizationLanguage.POLISH) return 'polish';
  if (language === PrismaRealizationLanguage.ENGLISH) return 'english';
  if (language === PrismaRealizationLanguage.UKRAINIAN) return 'ukrainian';
  if (language === PrismaRealizationLanguage.RUSSIAN) return 'russian';
  return 'other';
}

export function toPrismaRealizationLanguage(language: RealizationLanguage) {
  if (language === 'polish') return PrismaRealizationLanguage.POLISH;
  if (language === 'english') return PrismaRealizationLanguage.ENGLISH;
  if (language === 'ukrainian') return PrismaRealizationLanguage.UKRAINIAN;
  if (language === 'russian') return PrismaRealizationLanguage.RUSSIAN;
  return PrismaRealizationLanguage.OTHER;
}

export function toPrismaRealizationStatus(status: RealizationStatus) {
  if (status === 'planned') return PrismaRealizationStatus.PLANNED;
  if (status === 'in-progress') return PrismaRealizationStatus.IN_PROGRESS;
  return PrismaRealizationStatus.DONE;
}

export function fromPrismaRealizationStatus(
  status: PrismaRealizationStatus,
): RealizationStatus {
  if (status === PrismaRealizationStatus.PLANNED) return 'planned';
  if (status === PrismaRealizationStatus.IN_PROGRESS) return 'in-progress';
  return 'done';
}

export function resolveRealizationStatus(
  status: RealizationStatus,
  scheduledAt: string,
  durationMinutes: number,
) {
  const scheduledTimestamp = new Date(scheduledAt).getTime();
  const safeDurationMinutes = Math.max(1, Math.round(durationMinutes));
  const autoDoneTimestamp =
    scheduledTimestamp + safeDurationMinutes * MINUTES_TO_MS + DAY_TO_MS;

  if (Number.isFinite(scheduledTimestamp) && autoDoneTimestamp < Date.now()) {
    return 'done' as const;
  }

  return status;
}

export function calculateRequiredDevices(teamCount: number) {
  return teamCount + 2;
}

const REALIZATION_TRANSLATION_LANGUAGES: RealizationLanguage[] = [
  'polish',
  'english',
  'ukrainian',
  'russian',
  'other',
];

export function toPrismaRealizationTranslationsData(
  translations: RealizationTranslations | undefined,
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

    if (typeof value.introText === 'string' && value.introText.trim()) {
      next.introText = value.introText.trim();
    }

    if (typeof value.gameRules === 'string' && value.gameRules.trim()) {
      next.gameRules = value.gameRules.trim();
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

export function parseRealizationTranslationsData(
  translationsData: Prisma.JsonValue | null,
): RealizationTranslations | undefined {
  if (
    !translationsData ||
    typeof translationsData !== 'object' ||
    Array.isArray(translationsData)
  ) {
    return undefined;
  }

  const payload = translationsData as Record<string, unknown>;
  const parsed = Object.entries(payload).reduce<RealizationTranslations>(
    (acc, [key, value]) => {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !REALIZATION_TRANSLATION_LANGUAGES.includes(key as RealizationLanguage)
      ) {
        return acc;
      }

      const item = value as Record<string, unknown>;
      const translation: RealizationTranslation = {};

      if (typeof item.introText === 'string' && item.introText.trim()) {
        translation.introText = item.introText.trim();
      }

      if (typeof item.gameRules === 'string' && item.gameRules.trim()) {
        translation.gameRules = item.gameRules.trim();
      }

      if (Object.keys(translation).length > 0) {
        acc[key as RealizationLanguage] = translation;
      }

      return acc;
    },
    {},
  );

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

export function mapRealizationLogs(
  logsRaw: Array<{
    id: string;
    actorId: string;
    payload: unknown;
    createdAt: Date;
  }>,
): RealizationLog[] {
  return logsRaw.map((log) => {
    const payload = (log.payload || {}) as Record<string, unknown>;
    const changedBy =
      typeof payload.changedBy === 'string' && payload.changedBy.trim()
        ? payload.changedBy
        : log.actorId;
    const action = payload.action === 'created' ? 'created' : 'updated';
    const description =
      typeof payload.description === 'string' ? payload.description : '';

    return {
      id: log.id,
      changedBy,
      changedAt: log.createdAt.toISOString(),
      action,
      description,
    };
  });
}

export function buildRealizationEntity(input: {
  realization: {
    id: string;
    companyName: string;
    location: string | null;
    language: PrismaRealizationLanguage;
    customLanguage: string | null;
    introText: string | null;
    gameRules: string | null;
    translations: Prisma.JsonValue | null;
    contactPerson: string;
    contactPhone: string | null;
    contactEmail: string | null;
    instructors: unknown;
    notes: string | null;
    type: PrismaRealizationType;
    logoUrl: string | null;
    hideMap: boolean;
    mapImageUrl: string | null;
    offerPdfUrl: string | null;
    offerPdfName: string | null;
    scenarioId: string | null;
    scenarioTemplateId?: string;
    scenarioTemplateName?: string;
    riskSchemeId?: string | null;
    riskSchemeTemplateId?: string;
    joinCode: string;
    teamCount: number;
    requiredDevicesCount: number;
    peopleCount: number;
    positionsCount: number;
    durationMinutes: number;
    locationRequired: boolean;
    showLeaderboard: boolean;
    showLeaderboardDuringGame: boolean;
    showLeaderboardOnFinish: boolean;
    hideLeaderboardMinutesBeforeEnd: number;
    teamStationNumberingEnabled: boolean;
    timedStationPointsDecayEnabled: boolean;
    hideTaskList: boolean;
    riskChatEnabled: boolean;
    riskChatTeamsCanPost: boolean;
    pigsEnabled: boolean;
    pigGrantIntervalMinutes: number;
    pigEffectSeconds: number;
    pigShowThrowerName: boolean;
    status: PrismaRealizationStatus;
    scheduledAt: Date;
    startedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  stationIds: string[];
  scenarioStations: RealizationEntity['scenarioStations'];
  logs: RealizationLog[];
}): RealizationEntity {
  const { realization } = input;

  return {
    id: realization.id,
    companyName: realization.companyName,
    location: realization.location || undefined,
    language: fromPrismaRealizationLanguage(realization.language),
    customLanguage: realization.customLanguage || undefined,
    introText: realization.introText || undefined,
    gameRules: realization.gameRules || undefined,
    translations: parseRealizationTranslationsData(realization.translations),
    contactPerson: realization.contactPerson,
    contactPhone: realization.contactPhone || undefined,
    contactEmail: realization.contactEmail || undefined,
    instructors: Array.isArray(realization.instructors)
      ? realization.instructors.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    notes: realization.notes || undefined,
    type: fromPrismaRealizationType(realization.type),
    logoUrl: realization.logoUrl || undefined,
    hideMap: realization.hideMap,
    mapImageUrl: realization.mapImageUrl || undefined,
    offerPdfUrl: realization.offerPdfUrl || undefined,
    offerPdfName: realization.offerPdfName || undefined,
    scenarioId: realization.scenarioId,
    scenarioTemplateId: realization.scenarioTemplateId,
    scenarioTemplateName: realization.scenarioTemplateName,
    riskSchemeId: realization.riskSchemeId ?? undefined,
    riskSchemeTemplateId: realization.riskSchemeTemplateId,
    stationIds: input.stationIds,
    scenarioStations: input.scenarioStations,
    joinCode: realization.joinCode,
    teamCount: realization.teamCount,
    requiredDevicesCount: realization.requiredDevicesCount,
    peopleCount: realization.peopleCount,
    positionsCount: realization.positionsCount,
    durationMinutes: realization.durationMinutes,
    locationRequired: realization.locationRequired,
    showLeaderboard: realization.showLeaderboard,
    showLeaderboardDuringGame: realization.showLeaderboardDuringGame,
    showLeaderboardOnFinish: realization.showLeaderboardOnFinish,
    hideLeaderboardMinutesBeforeEnd:
      realization.hideLeaderboardMinutesBeforeEnd,
    teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
    timedStationPointsDecayEnabled: realization.timedStationPointsDecayEnabled,
    hideTaskList: realization.hideTaskList,
    riskChatEnabled: realization.riskChatEnabled,
    riskChatTeamsCanPost: realization.riskChatTeamsCanPost,
    pigsEnabled: realization.pigsEnabled,
    pigGrantIntervalMinutes: realization.pigGrantIntervalMinutes,
    pigEffectSeconds: realization.pigEffectSeconds,
    pigShowThrowerName: realization.pigShowThrowerName,
    status: resolveRealizationStatus(
      fromPrismaRealizationStatus(realization.status),
      realization.scheduledAt.toISOString(),
      realization.durationMinutes,
    ),
    scheduledAt: realization.scheduledAt.toISOString(),
    startedAt: realization.startedAt?.toISOString() ?? null,
    createdAt: realization.createdAt.toISOString(),
    updatedAt: realization.updatedAt.toISOString(),
    logs: input.logs,
  };
}
