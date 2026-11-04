import { BadRequestException } from '@nestjs/common';
import type {
  RealizationThemePack,
  RealizationTranslations,
} from '../../realization/entities/realization.entity';
import { ensureRealizationTranslations } from '../../realization/dto/realization.dto';
import { REALIZATION_THEME_PACK_VALUES } from '../../realization/mappers/realization.mapper';
import type { ScenarioEntity } from '../scenario.service';

export type CreateScenarioDto = {
  name: string;
  description: string;
  introText: string;
  gameRules: string;
  translations?: RealizationTranslations;
  stationIds: string[];
  categories: string[];
  /** undefined = klient nie wysłał pola (starszy admin). */
  themePack?: RealizationThemePack;
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

// Nieznana albo brakująca oprawa to undefined, a nie błąd: tworzenie zamienia
// je na standardową, a edycja zostawia dotychczasową — starszy admin, który
// pola nie wysyła, nie może po cichu zdjąć scenariuszowi oprawy kryminalnej.
function sanitizeThemePack(value: unknown): RealizationThemePack | undefined {
  return typeof value === 'string' &&
    REALIZATION_THEME_PACK_VALUES.includes(value as RealizationThemePack)
    ? (value as RealizationThemePack)
    : undefined;
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
    themePack: sanitizeThemePack(body.themePack),
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
    themePack: dto.themePack ?? 'standard',
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
    themePack: dto.themePack ?? current.themePack,
    updatedAt: new Date().toISOString(),
  };
}
