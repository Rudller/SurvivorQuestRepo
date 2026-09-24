import { BadRequestException } from '@nestjs/common';

/**
 * Walidacja dowodu w aktach sprawy.
 *
 * Styl ręczny, jak validateRealizationPayload w tym samym katalogu — bez
 * class-validatora, z jednym komunikatem 'Invalid payload'.
 *
 * Najważniejsza właściwość tej funkcji: **zwraca wyłącznie pola pasujące do
 * `kind`, resztę zeruje**. To nie jest porządkowanie, tylko bramka
 * bezpieczeństwa. Redakcja treści w payloadzie mobilnym wybiera pola po
 * `kind`, więc bez tego czyszczenia dałoby się podłożyć `body` pod
 * `kind: 'image'` i wypchnąć treść gałęzią, która jej nie ukrywa.
 */

export const CASE_FILE_KINDS = ['text', 'image', 'audio', 'dossier'] as const;
export type CaseFileKindInput = (typeof CASE_FILE_KINDS)[number];

export const CASE_FILE_UNLOCK_MODES = ['from-start', 'after-station'] as const;
export type CaseFileUnlockModeInput = (typeof CASE_FILE_UNLOCK_MODES)[number];

export type CaseFileFieldInput = { label: string; value: string };

export type CaseFileDto = {
  kind?: unknown;
  title?: unknown;
  unlockMode?: unknown;
  stationId?: unknown;
  body?: unknown;
  url?: unknown;
  objectKey?: unknown;
  fields?: unknown;
};

export type ValidatedCaseFilePayload = {
  kind: CaseFileKindInput;
  title: string;
  unlockMode: CaseFileUnlockModeInput;
  stationId: string | null;
  body: string | null;
  url: string | null;
  objectKey: string | null;
  fields: CaseFileFieldInput[] | null;
};

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 5000;
const MAX_FIELDS = 30;
const MAX_FIELD_LABEL_LENGTH = 120;
const MAX_FIELD_VALUE_LENGTH = 500;

function requireTrimmedString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid payload');
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    throw new BadRequestException('Invalid payload');
  }

  return trimmed;
}

function parseDossierFields(value: unknown): CaseFileFieldInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_FIELDS) {
    throw new BadRequestException('Invalid payload');
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new BadRequestException('Invalid payload');
    }

    const record = entry as Record<string, unknown>;

    return {
      label: requireTrimmedString(record.label, MAX_FIELD_LABEL_LENGTH),
      value: requireTrimmedString(record.value, MAX_FIELD_VALUE_LENGTH),
    };
  });
}

export function parseCaseFilePayload(
  payload: CaseFileDto | undefined,
): ValidatedCaseFilePayload {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const kind = payload.kind;

  if (
    typeof kind !== 'string' ||
    !CASE_FILE_KINDS.includes(kind as CaseFileKindInput)
  ) {
    throw new BadRequestException('Invalid payload');
  }

  const title = requireTrimmedString(payload.title, MAX_TITLE_LENGTH);

  const unlockMode =
    typeof payload.unlockMode === 'undefined'
      ? 'from-start'
      : payload.unlockMode;

  if (
    typeof unlockMode !== 'string' ||
    !CASE_FILE_UNLOCK_MODES.includes(unlockMode as CaseFileUnlockModeInput)
  ) {
    throw new BadRequestException('Invalid payload');
  }

  // Tryb „od startu" nie może wlec za sobą stanowiska, a „po stanowisku" bez
  // stanowiska byłoby dowodem nieodblokowywalnym — i to drugie jest gorsze, bo
  // wygląda jak działająca konfiguracja.
  let stationId: string | null = null;

  if (unlockMode === 'after-station') {
    if (typeof payload.stationId !== 'string' || !payload.stationId.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    stationId = payload.stationId.trim();
  }

  const base = {
    kind: kind as CaseFileKindInput,
    title,
    unlockMode: unlockMode as CaseFileUnlockModeInput,
    stationId,
    body: null,
    url: null,
    objectKey: null,
    fields: null,
  } satisfies ValidatedCaseFilePayload;

  switch (kind as CaseFileKindInput) {
    case 'text':
      return { ...base, body: requireTrimmedString(payload.body, MAX_BODY_LENGTH) };
    case 'image':
    case 'audio':
      return {
        ...base,
        url: requireTrimmedString(payload.url, 2048),
        objectKey:
          typeof payload.objectKey === 'string' && payload.objectKey.trim()
            ? payload.objectKey.trim()
            : null,
      };
    case 'dossier':
      return { ...base, fields: parseDossierFields(payload.fields) };
  }
}

export function requireCaseFileId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException('Invalid payload');
  }

  return value.trim();
}
