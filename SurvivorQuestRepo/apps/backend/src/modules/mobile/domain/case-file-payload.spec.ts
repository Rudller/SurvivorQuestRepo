import { CaseFileKind, CaseFileUnlockMode } from '@prisma/client';

import {
  isCaseFileUnlocked,
  toMobileCaseFilePayload,
  type CaseFileRowForPayload,
} from './case-file-payload';

function row(overrides: Partial<CaseFileRowForPayload> = {}): CaseFileRowForPayload {
  return {
    id: 'c-1',
    kind: CaseFileKind.TEXT,
    unlockMode: CaseFileUnlockMode.AFTER_STATION,
    stationId: 's-1',
    order: 3,
    title: 'Odcisk palca na nożu',
    body: 'Treść, której gracz nie powinien zobaczyć przed czasem.',
    url: 'https://example.test/dowod.png',
    fields: [{ label: 'Wzrost', value: '181 cm' }],
    ...overrides,
  };
}

describe('toMobileCaseFilePayload — zablokowany dowód', () => {
  it('wysyła dokładnie pięć kluczy i ani jednego więcej', () => {
    // Asercja na DOKŁADNY zestaw kluczy, nie na brak wybranych pól. Dzięki temu
    // dołożenie kolumny do modelu wywali ten test, zamiast po cichu wypchnąć
    // nową treść na tablet.
    const payload = toMobileCaseFilePayload(row(), { isUnlocked: false });

    expect(Object.keys(payload).sort()).toEqual([
      'id',
      'kind',
      'locked',
      'order',
      'unlockStationId',
    ]);
  });

  it('nie niesie ani tytułu, ani treści, ani adresu pliku', () => {
    const payload = toMobileCaseFilePayload(row(), { isUnlocked: false });

    // Tytuł jest spoilerem tak samo jak treść — „Odcisk palca na nożu" mówi
    // wszystko, zanim ktokolwiek dotrze do stanowiska.
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('body');
    expect(payload).not.toHaveProperty('url');
    expect(payload).not.toHaveProperty('fields');
  });

  it('zachowuje typ i stanowisko, żeby dało się narysować pustą teczkę', () => {
    const payload = toMobileCaseFilePayload(row({ kind: CaseFileKind.AUDIO }), {
      isUnlocked: false,
    });

    expect(payload).toMatchObject({ kind: 'audio', locked: true, unlockStationId: 's-1' });
  });
});

describe('toMobileCaseFilePayload — odblokowany dowód', () => {
  it('daje notatce treść i nic poza nią', () => {
    const payload = toMobileCaseFilePayload(row({ kind: CaseFileKind.TEXT }), {
      isUnlocked: true,
    });

    expect(payload.title).toBe('Odcisk palca na nożu');
    expect(payload.body).toBe('Treść, której gracz nie powinien zobaczyć przed czasem.');
    // Redakcja spoza typu: wiersz ma wypełniony `url`, ale notatka go nie niesie.
    expect(payload).not.toHaveProperty('url');
    expect(payload).not.toHaveProperty('fields');
  });

  it('daje zdjęciu adres pliku, a nie treść', () => {
    const payload = toMobileCaseFilePayload(row({ kind: CaseFileKind.IMAGE }), {
      isUnlocked: true,
    });

    expect(payload.url).toBe('https://example.test/dowod.png');
    expect(payload).not.toHaveProperty('body');
  });

  it('daje kartotece pary pole-wartość', () => {
    const payload = toMobileCaseFilePayload(row({ kind: CaseFileKind.DOSSIER }), {
      isUnlocked: true,
    });

    expect(payload.fields).toEqual([{ label: 'Wzrost', value: '181 cm' }]);
  });

  it('znosi uszkodzoną zawartość kartoteki zamiast wywracać odpowiedź', () => {
    const payload = toMobileCaseFilePayload(
      row({ kind: CaseFileKind.DOSSIER, fields: ['nonsens', { label: 1 }, null] }),
      { isUnlocked: true },
    );

    expect(payload.fields).toEqual([]);
  });
});

describe('isCaseFileUnlocked', () => {
  it('odblokowuje dowód oznaczony jako widoczny od startu', () => {
    expect(
      isCaseFileUnlocked(
        { unlockMode: CaseFileUnlockMode.FROM_START, stationId: null },
        new Set(),
      ),
    ).toBe(true);
  });

  it('odblokowuje dowód, gdy jego stanowisko zostało zaliczone', () => {
    expect(
      isCaseFileUnlocked(
        { unlockMode: CaseFileUnlockMode.AFTER_STATION, stationId: 's-1' },
        new Set(['s-1']),
      ),
    ).toBe(true);
  });

  it('trzyma dowód zablokowany, gdy stanowiska nikt nie zaliczył', () => {
    expect(
      isCaseFileUnlocked(
        { unlockMode: CaseFileUnlockMode.AFTER_STATION, stationId: 's-1' },
        new Set(['s-2']),
      ),
    ).toBe(false);
  });

  it('trzyma dowód zablokowany, gdy stracił przypisanie do stanowiska', () => {
    // Tak wygląda wiersz po podmianie scenariusza: SetNull wyzerował stationId.
    // Potraktowanie go jako „od startu" odsłoniłoby treść, której nikt nie zdobył.
    expect(
      isCaseFileUnlocked(
        { unlockMode: CaseFileUnlockMode.AFTER_STATION, stationId: null },
        new Set(['s-1']),
      ),
    ).toBe(false);
  });
});
