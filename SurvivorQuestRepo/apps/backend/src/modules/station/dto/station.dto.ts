import { BadRequestException } from '@nestjs/common';
import type {
  StationDraftInput,
  StationEntity,
  StationType,
} from '../station.service';

function buildStationFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

const STATION_TYPES: StationType[] = ['quiz', 'time', 'points'];

export type CreateStationDto = {
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
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

  return value.trim();
}

function ensurePositiveNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BadRequestException('Invalid payload');
  }

  return Math.round(value);
}

function ensureCompletionCode(
  value: unknown,
  type: StationType,
): string | undefined {
  if (type === 'quiz') {
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

function ensureStationBody(payload: unknown): CreateStationDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const type = ensureStationType(body.type);

  return {
    name: ensureTrimmedString(body.name),
    type,
    description: ensureStringAllowingEmpty(body.description),
    imageUrl:
      typeof body.imageUrl === 'string' && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : undefined,
    points: ensurePositiveNumber(body.points),
    timeLimitSeconds:
      typeof body.timeLimitSeconds === 'number' ? body.timeLimitSeconds : NaN,
    completionCode: ensureCompletionCode(body.completionCode, type),
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
    completionCode: dto.completionCode,
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
    completionCode: dto.completionCode,
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
    completionCode: dto.completionCode,
  };
}
