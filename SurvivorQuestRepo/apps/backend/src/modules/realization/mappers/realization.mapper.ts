import {
  RealizationLanguage as PrismaRealizationLanguage,
  RealizationStatus as PrismaRealizationStatus,
  RealizationType as PrismaRealizationType,
} from '@prisma/client';
import type {
  RealizationEntity,
  RealizationLanguage,
  RealizationLog,
  RealizationStatus,
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
  return 'recreation';
}

export function toPrismaRealizationType(type: RealizationType) {
  if (type === 'outdoor-games') return PrismaRealizationType.OUTDOOR_GAMES;
  if (type === 'hotel-games') return PrismaRealizationType.HOTEL_GAMES;
  if (type === 'workshops') return PrismaRealizationType.WORKSHOPS;
  if (type === 'evening-attractions')
    return PrismaRealizationType.EVENING_ATTRACTIONS;
  if (type === 'dj') return PrismaRealizationType.DJ;
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
  const autoDoneTimestamp = scheduledTimestamp + safeDurationMinutes * MINUTES_TO_MS + DAY_TO_MS;

  if (Number.isFinite(scheduledTimestamp) && autoDoneTimestamp < Date.now()) {
    return 'done' as const;
  }

  return status;
}

export function calculateRequiredDevices(teamCount: number) {
  return teamCount + 2;
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
      contactPerson: string;
    contactPhone: string | null;
    contactEmail: string | null;
    instructors: unknown;
    type: PrismaRealizationType;
    logoUrl: string | null;
    offerPdfUrl: string | null;
    offerPdfName: string | null;
    scenarioId: string;
    scenarioTemplateId?: string;
    scenarioTemplateName?: string;
    joinCode: string;
    teamCount: number;
    requiredDevicesCount: number;
    peopleCount: number;
    positionsCount: number;
    durationMinutes: number;
    locationRequired: boolean;
    status: PrismaRealizationStatus;
    scheduledAt: Date;
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
    contactPerson: realization.contactPerson,
    contactPhone: realization.contactPhone || undefined,
    contactEmail: realization.contactEmail || undefined,
    instructors: Array.isArray(realization.instructors)
      ? realization.instructors.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    type: fromPrismaRealizationType(realization.type),
    logoUrl: realization.logoUrl || undefined,
    offerPdfUrl: realization.offerPdfUrl || undefined,
    offerPdfName: realization.offerPdfName || undefined,
    scenarioId: realization.scenarioId,
    scenarioTemplateId: realization.scenarioTemplateId,
    scenarioTemplateName: realization.scenarioTemplateName,
    stationIds: input.stationIds,
    scenarioStations: input.scenarioStations,
    joinCode: realization.joinCode,
    teamCount: realization.teamCount,
    requiredDevicesCount: realization.requiredDevicesCount,
    peopleCount: realization.peopleCount,
    positionsCount: realization.positionsCount,
    durationMinutes: realization.durationMinutes,
    locationRequired: realization.locationRequired,
    status: resolveRealizationStatus(
      fromPrismaRealizationStatus(realization.status),
      realization.scheduledAt.toISOString(),
      realization.durationMinutes,
    ),
    scheduledAt: realization.scheduledAt.toISOString(),
    createdAt: realization.createdAt.toISOString(),
    updatedAt: realization.updatedAt.toISOString(),
    logs: input.logs,
  };
}
