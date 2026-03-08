import { BadRequestException } from '@nestjs/common';
import type { ScenarioEntity } from '../scenario.service';

export type CreateScenarioDto = {
  name: string;
  description: string;
  stationIds: string[];
};

export type UpdateScenarioDto = CreateScenarioDto & {
  id: string;
};

export type DeleteScenarioDto = {
  id: string;
  confirmName: string;
};

export type CloneScenarioDto = {
  sourceId: string;
};

function ensureName(value: unknown) {
  if (typeof value !== 'string' || value.trim().length < 3) {
    throw new BadRequestException('Invalid payload');
  }

  return value.trim();
}

function ensureOptionalDescription(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function sanitizeStationIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const stationIds = value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);

  if (stationIds.length === 0) {
    throw new BadRequestException('Invalid payload');
  }

  return stationIds;
}

export function parseCreateScenarioDto(payload: unknown): CreateScenarioDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;

  return {
    name: ensureName(body.name),
    description: ensureOptionalDescription(body.description),
    stationIds: sanitizeStationIds(body.stationIds),
  };
}

export function parseUpdateScenarioDto(payload: unknown): UpdateScenarioDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const dto = parseCreateScenarioDto(payload);

  return {
    ...dto,
    id: ensureName(body.id),
  };
}

export function parseDeleteScenarioDto(payload: unknown): DeleteScenarioDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;

  return {
    id: ensureName(body.id),
    confirmName: ensureName(body.confirmName),
  };
}

export function parseCloneScenarioDto(payload: unknown): CloneScenarioDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  return {
    sourceId: ensureName((payload as Record<string, unknown>).sourceId),
  };
}

export function toCreateScenarioEntity(dto: CreateScenarioDto): ScenarioEntity {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: dto.name,
    description: dto.description,
    stationIds: dto.stationIds,
    kind: 'template',
    isTemplate: true,
    isInstance: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function toUpdatedScenarioEntity(
  current: ScenarioEntity,
  dto: UpdateScenarioDto,
): ScenarioEntity {
  return {
    ...current,
    name: dto.name,
    description: dto.description,
    stationIds: dto.stationIds,
    updatedAt: new Date().toISOString(),
  };
}
