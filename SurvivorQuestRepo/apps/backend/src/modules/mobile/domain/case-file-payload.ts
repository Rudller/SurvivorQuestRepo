import { CaseFileKind, CaseFileUnlockMode } from '@prisma/client';

/**
 * Redakcja dowodu przed wysłaniem na tablet.
 *
 * To jest bramka bezpieczeństwa całej funkcji akt, dlatego siedzi w osobnej
 * czystej funkcji, a nie w ciele getMobileSessionState.
 *
 * Zasada: dla zablokowanego dowodu obiekt jest **budowany od zera**, nigdy
 * przez skopiowanie wiersza i usunięcie pól. Dzięki temu dołożenie kolumny do
 * modelu CaseFile nie wycieknie samo z siebie — trzeba by świadomie dopisać ją
 * tutaj. Test pilnuje dokładnego zestawu kluczy.
 *
 * `title` też nie wychodzi przy zablokowanym: w scenariuszu kryminalnym sam
 * tytuł jest spoilerem („Odcisk palca Nowaka na nożu"). To ta sama zasada, co
 * przy stanowiskach, gdzie payload niesie długość kodu zaliczenia, a nie kod.
 *
 * Co świadomie wychodzi: `kind` i `unlockStationId`. Nie są sekretem — pełna
 * lista stanowisk z nazwami i opisami i tak leci w `realization.stations`, więc
 * klient dowiaduje się tylko „na tym stanowisku coś jest". Za to dzięki nim
 * aplikacja może pokazać pustą teczkę z numerem stanowiska, co jest całym
 * sensem mechaniki.
 */

export type MobileCaseFileKind = 'text' | 'image' | 'audio' | 'dossier';

const KIND_FROM_PRISMA: Record<CaseFileKind, MobileCaseFileKind> = {
  [CaseFileKind.TEXT]: 'text',
  [CaseFileKind.IMAGE]: 'image',
  [CaseFileKind.AUDIO]: 'audio',
  [CaseFileKind.DOSSIER]: 'dossier',
};

export type CaseFileRowForPayload = {
  id: string;
  kind: CaseFileKind;
  unlockMode: CaseFileUnlockMode;
  stationId: string | null;
  order: number;
  title: string;
  body: string | null;
  url: string | null;
  fields: unknown;
};

export type MobileCaseFilePayload = {
  id: string;
  kind: MobileCaseFileKind;
  locked: boolean;
  order: number;
  unlockStationId: string | null;
  title?: string;
  body?: string;
  url?: string;
  fields?: { label: string; value: string }[];
};

/**
 * Dowód jest odblokowany, gdy ma tryb „od startu" albo gdy jego stanowisko
 * zostało zaliczone przez KTÓRĄKOLWIEK drużynę — akta są wspólne dla realizacji.
 *
 * Tryb „po stanowisku" bez stanowiska zostaje ZABLOKOWANY. Taki stan powstaje,
 * gdy podmiana scenariusza wyzerowała `stationId` przez SetNull; potraktowanie
 * go jako „od startu" odsłoniłoby treść, której nikt nie zdobył.
 */
export function isCaseFileUnlocked(
  row: Pick<CaseFileRowForPayload, 'unlockMode' | 'stationId'>,
  unlockedStationIds: ReadonlySet<string>,
): boolean {
  if (row.unlockMode === CaseFileUnlockMode.FROM_START) {
    return true;
  }

  return Boolean(row.stationId && unlockedStationIds.has(row.stationId));
}

function parseFields(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as Record<string, unknown>;

    return typeof record.label === 'string' && typeof record.value === 'string'
      ? [{ label: record.label, value: record.value }]
      : [];
  });
}

export function toMobileCaseFilePayload(
  row: CaseFileRowForPayload,
  options: { isUnlocked: boolean },
): MobileCaseFilePayload {
  const kind = KIND_FROM_PRISMA[row.kind];

  if (!options.isUnlocked) {
    return {
      id: row.id,
      kind,
      locked: true,
      order: row.order,
      unlockStationId: row.stationId,
    };
  }

  const base = {
    id: row.id,
    kind,
    locked: false,
    order: row.order,
    unlockStationId: row.stationId,
    title: row.title,
  };

  switch (kind) {
    case 'text':
      return { ...base, body: row.body ?? '' };
    case 'image':
    case 'audio':
      return { ...base, url: row.url ?? '' };
    case 'dossier':
      return { ...base, fields: parseFields(row.fields) };
  }
}
