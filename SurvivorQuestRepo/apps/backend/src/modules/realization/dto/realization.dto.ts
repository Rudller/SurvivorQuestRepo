import { BadRequestException } from '@nestjs/common';
import type {
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

export type CreateRealizationDto = {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: unknown;
  type?: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId?: string;
  teamCount?: number;
  peopleCount?: number;
  positionsCount?: number;
  status?: RealizationStatus;
  scheduledAt?: string;
  changedBy?: string;
  scenarioStations?: unknown;
};

export type UpdateRealizationDto = CreateRealizationDto & {
  id?: string;
};

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

export function validateRealizationPayload(
  payload: CreateRealizationDto,
): ValidatedRealizationPayload {
  const companyName = payload.companyName?.trim() || '';
  const contactPerson = payload.contactPerson?.trim() || '';
  const contactPhone = payload.contactPhone?.trim() || '';
  const contactEmail = payload.contactEmail?.trim() || '';
  const instructors = sanitizeInstructors(payload.instructors);
  const teamCount = Math.round(Number(payload.teamCount));
  const peopleCount = Math.round(Number(payload.peopleCount));
  const positionsCount = Math.round(Number(payload.positionsCount));
  const scenarioId = payload.scenarioId?.trim() || '';
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
    !isValidRealizationStatus(payload.status) ||
    !scenarioId ||
    !Number.isFinite(teamCount) ||
    teamCount < 1 ||
    !Number.isFinite(peopleCount) ||
    peopleCount < 1 ||
    !Number.isFinite(positionsCount) ||
    positionsCount < 1 ||
    !scheduledAt
  ) {
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

  return {
    companyName,
    contactPerson,
    contactPhone: contactPhone || undefined,
    contactEmail: contactEmail || undefined,
    instructors,
    type: payload.type,
    logoUrl: payload.logoUrl?.trim() || undefined,
    offerPdfUrl: payload.offerPdfUrl?.trim() || undefined,
    offerPdfName: payload.offerPdfName?.trim() || undefined,
    scenarioId,
    teamCount,
    peopleCount,
    positionsCount,
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
