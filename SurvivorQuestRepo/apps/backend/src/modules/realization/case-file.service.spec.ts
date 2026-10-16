import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CaseFileService } from './case-file.service';
import { parseCaseFilePayload } from './dto/case-file.dto';

/**
 * Wycinek jednej funkcjonalności w osobnym pliku spec — jak
 * realization.service.translate-texts.spec.ts. Serwis konstruowany ręcznie,
 * mocki Prismy budowane per opis, tylko dla metod, których dana ścieżka dotyka.
 */

function createService(prismaOverrides: Record<string, unknown> = {}) {
  const storage = {
    deleteObject: jest.fn().mockResolvedValue(undefined),
    uploadCaseFileImage: jest.fn(),
    uploadCaseFileAudio: jest.fn(),
  };

  const prisma = {
    realization: { findUnique: jest.fn().mockResolvedValue({ id: 'r-1' }) },
    station: { findFirst: jest.fn().mockResolvedValue({ id: 's-1' }) },
    caseFile: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    ...prismaOverrides,
  };

  const service = new CaseFileService(prisma as never, storage as never);

  return { service, prisma, storage };
}

const TEXT_PAYLOAD = { kind: 'text', title: 'Notatka', body: 'Treść notatki' };

describe('parseCaseFilePayload', () => {
  it('odrzuca nieznany typ dowodu', () => {
    expect(() => parseCaseFilePayload({ kind: 'video', title: 'X' })).toThrow(
      BadRequestException,
    );
  });

  it('odrzuca pusty tytuł', () => {
    expect(() =>
      parseCaseFilePayload({ ...TEXT_PAYLOAD, title: '   ' }),
    ).toThrow(BadRequestException);
  });

  it('odrzuca notatkę bez treści', () => {
    expect(() =>
      parseCaseFilePayload({ kind: 'text', title: 'Notatka' }),
    ).toThrow(BadRequestException);
  });

  it('odrzuca kartotekę bez pól', () => {
    expect(() =>
      parseCaseFilePayload({ kind: 'dossier', title: 'Kartoteka', fields: [] }),
    ).toThrow(BadRequestException);
  });

  it('odrzuca kartotekę z pustą etykietą pola', () => {
    expect(() =>
      parseCaseFilePayload({
        kind: 'dossier',
        title: 'Kartoteka',
        fields: [{ label: '  ', value: 'Nowak' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('czyści pola spoza wybranego typu', () => {
    // To jest bramka bezpieczeństwa, nie porządkowanie: redakcja treści w
    // payloadzie mobilnym wybiera pola po `kind`, więc `body` przemycone pod
    // `kind: 'image'` wyszłoby gałęzią, która go nie ukrywa.
    const parsed = parseCaseFilePayload({
      kind: 'image',
      title: 'Skan',
      url: 'https://example.test/a.png',
      body: 'przemycona treść',
      fields: [{ label: 'a', value: 'b' }],
    });

    expect(parsed.url).toBe('https://example.test/a.png');
    expect(parsed.body).toBeNull();
    expect(parsed.fields).toBeNull();
  });

  it('wymaga stanowiska przy odblokowaniu po stanowisku', () => {
    expect(() =>
      parseCaseFilePayload({ ...TEXT_PAYLOAD, unlockMode: 'after-station' }),
    ).toThrow(BadRequestException);
  });

  it('zrywa przypisanie stanowiska przy odblokowaniu od startu', () => {
    const parsed = parseCaseFilePayload({
      ...TEXT_PAYLOAD,
      unlockMode: 'from-start',
      stationId: 's-1',
    });

    expect(parsed.stationId).toBeNull();
  });
});

describe('CaseFileService', () => {
  it('odrzuca stanowisko spoza tej realizacji', async () => {
    // Station.realizationId to luźna kolumna bez klucza obcego, więc baza się
    // nie obroni — obce stanowisko dałoby dowód na zawsze zablokowany.
    const { service, prisma } = createService();
    prisma.station.findFirst.mockResolvedValue(null);

    await expect(
      service.createCaseFile(
        { realizationId: 'r-1' },
        {
          ...TEXT_PAYLOAD,
          unlockMode: 'after-station',
          stationId: 'obce',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('dokłada nowy dowód na koniec listy', async () => {
    const { service, prisma } = createService();
    prisma.caseFile.findFirst.mockResolvedValue({ order: 4 });
    prisma.caseFile.create.mockResolvedValue({
      id: 'c-1',
      kind: 'TEXT',
      unlockMode: 'FROM_START',
      stationId: null,
      station: null,
      order: 5,
      title: 'Notatka',
      body: 'Treść notatki',
      url: null,
      objectKey: null,
      fields: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });

    const entry = await service.createCaseFile(
      { realizationId: 'r-1' },
      TEXT_PAYLOAD,
    );

    expect(prisma.caseFile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 5 }) }),
    );
    expect(entry.order).toBe(5);
  });

  it('nie pozwala skasować dowodu z obcej realizacji', async () => {
    const { service, prisma } = createService();
    prisma.caseFile.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteCaseFile({ realizationId: 'r-1' }, 'c-obce'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.caseFile.deleteMany).not.toHaveBeenCalled();
  });

  it('sprząta plik w R2 po usunięciu ostatniego dowodu, który go trzymał', async () => {
    const { service, prisma, storage } = createService();
    prisma.caseFile.findFirst.mockResolvedValue({
      id: 'c-1',
      objectKey: 'k/1.png',
    });
    prisma.caseFile.count.mockResolvedValue(0);

    await service.deleteCaseFile({ realizationId: 'r-1' }, 'c-1');

    expect(storage.deleteObject).toHaveBeenCalledWith('k/1.png');
  });

  it('zostawia plik w R2, gdy trzyma go jeszcze inny dowód', async () => {
    // Admin może wkleić ten sam adres do dwóch dowodów.
    const { service, prisma, storage } = createService();
    prisma.caseFile.findFirst.mockResolvedValue({
      id: 'c-1',
      objectKey: 'k/1.png',
    });
    prisma.caseFile.count.mockResolvedValue(1);

    await service.deleteCaseFile({ realizationId: 'r-1' }, 'c-1');

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('nie wywraca usuwania, gdy sprzątanie w R2 zawiedzie', async () => {
    const { service, prisma, storage } = createService();
    prisma.caseFile.findFirst.mockResolvedValue({
      id: 'c-1',
      objectKey: 'k/1.png',
    });
    storage.deleteObject.mockRejectedValue(new Error('R2 niedostępne'));

    await expect(
      service.deleteCaseFile({ realizationId: 'r-1' }, 'c-1'),
    ).resolves.toEqual({ id: 'c-1' });
  });
});

describe('CaseFileService — akta scenariusza', () => {
  it('odrzuca stanowisko, którego nie ma w scenariuszu', async () => {
    const { service } = createService({
      scenario: { findUnique: jest.fn().mockResolvedValue({ id: 'sc-1' }) },
      scenarioStation: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      service.createCaseFile(
        { scenarioId: 'sc-1' },
        { ...TEXT_PAYLOAD, unlockMode: 'after-station', stationId: 'obce' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('zakłada dowód z właścicielem-scenariuszem, nie realizacją', async () => {
    const { service, prisma } = createService({
      scenario: { findUnique: jest.fn().mockResolvedValue({ id: 'sc-1' }) },
    });
    prisma.caseFile.findFirst.mockResolvedValue(null);
    prisma.caseFile.create.mockResolvedValue({
      id: 'c-1',
      kind: 'TEXT',
      unlockMode: 'FROM_START',
      stationId: null,
      station: null,
      order: 0,
      title: 'Notatka',
      body: 'Treść notatki',
      url: null,
      objectKey: null,
      fields: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });

    await service.createCaseFile({ scenarioId: 'sc-1' }, TEXT_PAYLOAD);

    const data = prisma.caseFile.create.mock.calls[0][0].data;
    expect(data.scenarioId).toBe('sc-1');
    expect(data.realizationId).toBeUndefined();
  });
});

describe('CaseFileService.replaceRealizationCaseFilesFromScenario', () => {
  function templateRow(overrides: Record<string, unknown>) {
    return {
      kind: 'TEXT',
      unlockMode: 'FROM_START',
      stationId: null,
      title: 'Dowód',
      body: 'Treść',
      url: null,
      objectKey: null,
      fields: null,
      ...overrides,
    };
  }

  function setup(templateRows: unknown[], previousRows: unknown[] = []) {
    const createMany = jest.fn().mockReturnValue('createMany');
    const deleteMany = jest.fn().mockReturnValue('deleteMany');
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(templateRows)
      .mockResolvedValueOnce(previousRows);
    const { service, prisma, storage } = createService({
      station: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'real-s-1', sourceTemplateId: 'tpl-s-1' }]),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    });
    Object.assign(prisma.caseFile, { findMany, createMany, deleteMany });
    return { service, prisma, storage, createMany };
  }

  it('przepina dowód „po stanowisku” na stanowisko realizacji z tego samego wzoru', async () => {
    const { service, createMany } = setup([
      templateRow({ unlockMode: 'AFTER_STATION', stationId: 'tpl-s-1' }),
    ]);

    const result = await service.replaceRealizationCaseFilesFromScenario(
      'r-1',
      'sc-1',
    );

    expect(result).toEqual({ copied: 1, skipped: 0 });
    const [row] = createMany.mock.calls[0][0].data;
    expect(row).toEqual(
      expect.objectContaining({
        realizationId: 'r-1',
        stationId: 'real-s-1',
        order: 0,
      }),
    );
  });

  it('pomija dowód przypięty do stanowiska, którego w realizacji nie ma', async () => {
    // Odblokowanie od startu zdradziłoby fabułę, a bez stanowiska dowodu nikt
    // by nigdy nie odblokował.
    const { service, createMany } = setup([
      templateRow({ unlockMode: 'AFTER_STATION', stationId: 'tpl-usuniete' }),
      templateRow({ title: 'Zostaje' }),
    ]);

    const result = await service.replaceRealizationCaseFilesFromScenario(
      'r-1',
      'sc-1',
    );

    expect(result).toEqual({ copied: 1, skipped: 1 });
    expect(createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it('nie kasuje pliku, który dalej trzyma dowód scenariusza', async () => {
    const { service, prisma, storage } = setup(
      [templateRow({ kind: 'IMAGE', url: 'u', objectKey: 'k/wspolny.png' })],
      [{ objectKey: 'k/wspolny.png' }],
    );
    prisma.caseFile.count.mockResolvedValue(2);

    await service.replaceRealizationCaseFilesFromScenario('r-1', 'sc-1');

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
