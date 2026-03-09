import {
  RealizationStatus as PrismaRealizationStatus,
  RealizationType as PrismaRealizationType,
} from '@prisma/client';
import type {
  RealizationEntity,
  RealizationLog,
  RealizationStatus,
  RealizationType,
} from '../entities/realization.entity';

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
) {
  const scheduledTimestamp = new Date(scheduledAt).getTime();

  if (Number.isFinite(scheduledTimestamp) && scheduledTimestamp < Date.now()) {
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
    contactPerson: string;
    contactPhone: string | null;
    contactEmail: string | null;
    instructors: unknown;
    type: PrismaRealizationType;
    logoUrl: string | null;
    offerPdfUrl: string | null;
    offerPdfName: string | null;
    scenarioId: string;
    joinCode: string;
    teamCount: number;
    requiredDevicesCount: number;
    peopleCount: number;
    positionsCount: number;
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
    stationIds: input.stationIds,
    scenarioStations: input.scenarioStations,
    joinCode: realization.joinCode,
    teamCount: realization.teamCount,
    peopleCount: realization.peopleCount,
    positionsCount: realization.positionsCount,
    status: resolveRealizationStatus(
      fromPrismaRealizationStatus(realization.status),
      realization.scheduledAt.toISOString(),
    ),
    scheduledAt: realization.scheduledAt.toISOString(),
    createdAt: realization.createdAt.toISOString(),
    updatedAt: realization.updatedAt.toISOString(),
    logs: input.logs,
  };
}
