import { BadRequestException } from '@nestjs/common';
import type { RealizationTranslations } from '../../realization/entities/realization.entity';
import { ensureRealizationTranslations } from '../../realization/dto/realization.dto';
import type { ScenarioEntity } from '../scenario.service';

export type CreateScenarioDto = {
  name: string;
  description: string;
  introText: string;
  gameRules: string;
  translations?: RealizationTranslations;
  stationIds: string[];
  categories: string[];
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

// Tagi scenariusza, niezależne od kategorii jego stanowisk. Brak pola to pusta
// lista, a nie błąd — starsze wersje admina go nie wysyłają.
function sanitizeCategories(value: unknown) {
  if (typeof value === 'undefined') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  const categories: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new BadRequestException('Invalid payload');
    }

    const normalized = item.trim();
    if (normalized && !categories.includes(normalized)) {
      categories.push(normalized);
    }
  }

  return categories;
}

// Tekst bazowy scenariusza jest zawsze po polsku, a scenariusz nie ma nazwy
// języka niestandardowego — wpisy `polish` i `other` nie miałyby gdzie trafić.
function sanitizeScenarioTranslations(value: unknown) {
  const translations = ensureRealizationTranslations(value);
  if (!translations) {
    return undefined;
  }

  delete translations.polish;
  delete translations.other;
  return Object.keys(translations).length > 0 ? translations : undefined;
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
    introText: ensureOptionalDescription(body.introText),
    gameRules: ensureOptionalDescription(body.gameRules),
    translations: sanitizeScenarioTranslations(body.translations),
    stationIds: sanitizeStationIds(body.stationIds),
    categories: sanitizeCategories(body.categories),
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
    introText: dto.introText,
    gameRules: dto.gameRules,
    translations: dto.translations,
    stationIds: dto.stationIds,
    categories: dto.categories,
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
    introText: dto.introText,
    gameRules: dto.gameRules,
    translations: dto.translations,
    stationIds: dto.stationIds,
    categories: dto.categories,
    updatedAt: new Date().toISOString(),
  };
}
