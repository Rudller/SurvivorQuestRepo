import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseFileKind, CaseFileUnlockMode, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  StationStorageService,
  type CaseFileStorageOwner,
} from '../station/station-storage.service';
import {
  parseCaseFilePayload,
  type CaseFileDto,
  type CaseFileFieldInput,
  type CaseFileKindInput,
  type CaseFileUnlockModeInput,
  type ValidatedCaseFilePayload,
} from './dto/case-file.dto';

/**
 * Dowody w aktach sprawy — CRUD dla panelu admina.
 *
 * Osobny serwis, nie kolejne sto linii w RealizationService: ten ma już ponad
 * siedemset i obsługuje cały cykl życia realizacji.
 *
 * Właścicielem dowodu jest realizacja ALBO scenariusz. Akta scenariusza to
 * wzór: przy tworzeniu realizacji (i przy „pobierz od nowa ze scenariusza”)
 * rekordy są kopiowane do realizacji, a ta edytuje już własną kopię. Pliki w
 * R2 nie są kopiowane — oba rekordy wskazują ten sam obiekt, a sprzątanie
 * (deleteOrphanedObject) usuwa go dopiero, gdy nie trzyma go żaden dowód.
 *
 * Konwencja bezpieczeństwa przejęta z PointsQrCode w module mobile: każda
 * operacja na pojedynczym rekordzie idzie przez `deleteMany`/`updateMany` z
 * właścicielem (`realizationId` albo `scenarioId`) w `where`, nigdy przez
 * `delete({ where: { id } })`. Dzięki temu zgadnięte id z obcej realizacji
 * albo scenariusza nie daje dostępu do cudzego rekordu —
 * scoping jest wymuszony przez zapytanie, a nie przez osobne sprawdzenie,
 * które da się przeoczyć.
 */

type CaseFileRow = Prisma.CaseFileGetPayload<{
  include: { station: { select: { name: true } } };
}>;

const KIND_TO_PRISMA: Record<CaseFileKindInput, CaseFileKind> = {
  text: CaseFileKind.TEXT,
  image: CaseFileKind.IMAGE,
  audio: CaseFileKind.AUDIO,
  dossier: CaseFileKind.DOSSIER,
};

const KIND_FROM_PRISMA: Record<CaseFileKind, CaseFileKindInput> = {
  [CaseFileKind.TEXT]: 'text',
  [CaseFileKind.IMAGE]: 'image',
  [CaseFileKind.AUDIO]: 'audio',
  [CaseFileKind.DOSSIER]: 'dossier',
};

const UNLOCK_TO_PRISMA: Record<CaseFileUnlockModeInput, CaseFileUnlockMode> = {
  'from-start': CaseFileUnlockMode.FROM_START,
  'after-station': CaseFileUnlockMode.AFTER_STATION,
};

const UNLOCK_FROM_PRISMA: Record<CaseFileUnlockMode, CaseFileUnlockModeInput> =
  {
    [CaseFileUnlockMode.FROM_START]: 'from-start',
    [CaseFileUnlockMode.AFTER_STATION]: 'after-station',
  };

const INCLUDE_STATION = { station: { select: { name: true } } } as const;
const ORDER_BY: Prisma.CaseFileOrderByWithRelationInput[] = [
  { order: 'asc' },
  { createdAt: 'asc' },
];

export type CaseFileEntry = ReturnType<CaseFileService['toEntry']>;

export type CaseFileOwner = CaseFileStorageOwner;

/** Warunek `where` zawężający do właściciela — jedno miejsce, bez pomyłek. */
function ownerWhere(owner: CaseFileOwner) {
  return 'realizationId' in owner
    ? { realizationId: owner.realizationId }
    : { scenarioId: owner.scenarioId };
}

@Injectable()
export class CaseFileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stationStorageService: StationStorageService,
  ) {}

  async listCaseFiles(owner: CaseFileOwner) {
    await this.requireOwner(owner);

    const rows = await this.prisma.caseFile.findMany({
      where: ownerWhere(owner),
      orderBy: ORDER_BY,
      include: INCLUDE_STATION,
    });

    return { ...owner, entries: rows.map((row) => this.toEntry(row)) };
  }

  async createCaseFile(owner: CaseFileOwner, payload: CaseFileDto | undefined) {
    await this.requireOwner(owner);

    const validated = parseCaseFilePayload(payload);
    await this.assertStationBelongsToOwner(owner, validated.stationId);

    // Nowy dowód ląduje na końcu. `order` nie ma unikatu, bo wzorzec jest
    // per-element — unikat waliłby konfliktami przy przestawianiu kolejności.
    const last = await this.prisma.caseFile.findFirst({
      where: ownerWhere(owner),
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const row = await this.prisma.caseFile.create({
      data: {
        ...ownerWhere(owner),
        order: (last?.order ?? -1) + 1,
        ...this.toPrismaData(validated),
      },
      include: INCLUDE_STATION,
    });

    return this.toEntry(row);
  }

  async updateCaseFile(
    owner: CaseFileOwner,
    caseFileId: string,
    payload: CaseFileDto | undefined,
  ) {
    const existing = await this.requireCaseFile(owner, caseFileId);

    const validated = parseCaseFilePayload(payload);
    await this.assertStationBelongsToOwner(owner, validated.stationId);

    const row = await this.prisma.caseFile.update({
      where: { id: existing.id },
      data: this.toPrismaData(validated),
      include: INCLUDE_STATION,
    });

    // Podmiana pliku osierociła poprzedni obiekt w R2.
    if (existing.objectKey && existing.objectKey !== row.objectKey) {
      await this.deleteOrphanedObject(existing.objectKey);
    }

    return this.toEntry(row);
  }

  /**
   * Przesunięcie o jedno miejsce przez zamianę `order` z sąsiadem.
   *
   * Osobna operacja zamiast przesyłania całego dowodu z nowym `order`: ta
   * druga droga przepuszczałaby treść i plik przez walidację i ścieżkę
   * sprzątania R2 przy czynności, która nie dotyka ani treści, ani pliku.
   */
  async moveCaseFile(
    owner: CaseFileOwner,
    caseFileId: string,
    direction: 'up' | 'down',
  ) {
    const current = await this.requireCaseFile(owner, caseFileId);

    const neighbour = await this.prisma.caseFile.findFirst({
      where: {
        ...ownerWhere(owner),
        order:
          direction === 'up' ? { lt: current.order } : { gt: current.order },
      },
      orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
    });

    // Skrajny element — cisza zamiast błędu, bo admin po prostu kliknął
    // strzałkę, której nie miał gdzie użyć.
    if (!neighbour) {
      return { id: caseFileId, order: current.order };
    }

    await this.prisma.$transaction([
      this.prisma.caseFile.update({
        where: { id: current.id },
        data: { order: neighbour.order },
      }),
      this.prisma.caseFile.update({
        where: { id: neighbour.id },
        data: { order: current.order },
      }),
    ]);

    return { id: caseFileId, order: neighbour.order };
  }

  async deleteCaseFile(owner: CaseFileOwner, caseFileId: string) {
    const existing = await this.requireCaseFile(owner, caseFileId);

    const result = await this.prisma.caseFile.deleteMany({
      where: { id: caseFileId, ...ownerWhere(owner) },
    });

    if (result.count === 0) {
      throw new NotFoundException('Case file not found');
    }

    if (existing.objectKey) {
      await this.deleteOrphanedObject(existing.objectKey);
    }

    return { id: caseFileId };
  }

  async uploadImage(owner: CaseFileOwner, file: Express.Multer.File) {
    await this.requireOwner(owner);

    return this.stationStorageService.uploadCaseFileImage(file, owner);
  }

  async uploadAudio(owner: CaseFileOwner, file: Express.Multer.File) {
    await this.requireOwner(owner);

    return this.stationStorageService.uploadCaseFileAudio(file, owner);
  }

  /**
   * Podmienia akta realizacji na kopię akt scenariusza-wzoru.
   *
   * Dowód przypięty do stanowiska scenariusza dostaje stanowisko realizacji,
   * które z niego powstało (`sourceTemplateId`). Gdy takiego nie ma — bo
   * stanowisko wypadło z realizacji — dowód jest pomijany: bez stanowiska nikt
   * by go nigdy nie odblokował, a odblokowanie od startu zdradziłoby fabułę.
   *
   * Stare pliki sprzątamy PO skopiowaniu, więc obiekty wspólne z akt
   * scenariusza zostają (licznik odwołań nie spada do zera).
   */
  async replaceRealizationCaseFilesFromScenario(
    realizationId: string,
    templateScenarioId: string,
  ) {
    const [templateRows, previousRows, stations] = await Promise.all([
      this.prisma.caseFile.findMany({
        where: { scenarioId: templateScenarioId },
        orderBy: ORDER_BY,
      }),
      this.prisma.caseFile.findMany({
        where: { realizationId },
        select: { objectKey: true },
      }),
      this.prisma.station.findMany({
        where: { realizationId },
        select: { id: true, sourceTemplateId: true },
      }),
    ]);

    const stationIdByTemplateId = new Map<string, string>();
    for (const station of stations) {
      if (
        station.sourceTemplateId &&
        !stationIdByTemplateId.has(station.sourceTemplateId)
      ) {
        stationIdByTemplateId.set(station.sourceTemplateId, station.id);
      }
    }

    let skipped = 0;
    const data: Prisma.CaseFileCreateManyInput[] = [];
    for (const row of templateRows) {
      const stationId = row.stationId
        ? (stationIdByTemplateId.get(row.stationId) ?? null)
        : null;
      if (row.stationId && !stationId) {
        skipped += 1;
        continue;
      }

      data.push({
        realizationId,
        order: data.length,
        kind: row.kind,
        unlockMode: row.unlockMode,
        stationId,
        title: row.title,
        body: row.body,
        url: row.url,
        objectKey: row.objectKey,
        fields: (row.fields as Prisma.InputJsonValue | null) ?? Prisma.DbNull,
      });
    }

    await this.prisma.$transaction([
      this.prisma.caseFile.deleteMany({ where: { realizationId } }),
      this.prisma.caseFile.createMany({ data }),
    ]);

    const previousKeys = new Set(
      previousRows
        .map((row) => row.objectKey)
        .filter((key): key is string => !!key),
    );
    for (const key of previousKeys) {
      await this.deleteOrphanedObject(key);
    }

    return { copied: data.length, skipped };
  }

  private async requireOwner(owner: CaseFileOwner) {
    if ('realizationId' in owner) {
      const realization = await this.prisma.realization.findUnique({
        where: { id: owner.realizationId },
        select: { id: true },
      });
      if (!realization) {
        throw new NotFoundException('Realization not found');
      }
      return;
    }

    const scenario = await this.prisma.scenario.findUnique({
      where: { id: owner.scenarioId },
      select: { id: true },
    });
    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }
  }

  private async requireCaseFile(owner: CaseFileOwner, caseFileId: string) {
    const existing = await this.prisma.caseFile.findFirst({
      where: { id: caseFileId, ...ownerWhere(owner) },
    });

    if (!existing) {
      throw new NotFoundException('Case file not found');
    }

    return existing;
  }

  /**
   * `Station.realizationId` to luźna kolumna bez klucza obcego, więc baza nie
   * obroni się sama. Bez tego sprawdzenia da się przypiąć dowód do stanowiska
   * obcej realizacji — a takiego nikt tutaj nigdy nie ukończy, więc dowód
   * zostałby na zawsze zablokowany, wyglądając przy tym na poprawnie
   * skonfigurowany.
   */
  private async assertStationBelongsToOwner(
    owner: CaseFileOwner,
    stationId: string | null,
  ) {
    if (!stationId) {
      return;
    }

    // Scenariusz nie ma kolumny na stanowiskach — należą do niego przez
    // tabelę łączącą, więc tam sprawdzamy przynależność.
    const station =
      'realizationId' in owner
        ? await this.prisma.station.findFirst({
            where: { id: stationId, realizationId: owner.realizationId },
            select: { id: true },
          })
        : await this.prisma.scenarioStation.findFirst({
            where: { stationId, scenarioId: owner.scenarioId },
            select: { id: true },
          });

    if (!station) {
      throw new BadRequestException('Invalid payload');
    }
  }

  /**
   * Usunięcie obiektu z R2 dopiero, gdy żaden inny dowód go nie trzyma —
   * admin może wkleić ten sam URL do dwóch dowodów. Best effort: nieudane
   * sprzątanie nie może wywrócić operacji, która w bazie już się powiodła.
   */
  private async deleteOrphanedObject(objectKey: string) {
    const stillUsed = await this.prisma.caseFile.count({
      where: { objectKey },
    });

    if (stillUsed > 0) {
      return;
    }

    try {
      await this.stationStorageService.deleteObject(objectKey);
    } catch {
      // Osierocony plik jest mniejszym problemem niż błąd zwrócony adminowi za
      // operację, która się udała.
    }
  }

  private toPrismaData(validated: ValidatedCaseFilePayload) {
    return {
      kind: KIND_TO_PRISMA[validated.kind],
      unlockMode: UNLOCK_TO_PRISMA[validated.unlockMode],
      stationId: validated.stationId,
      title: validated.title,
      body: validated.body,
      url: validated.url,
      objectKey: validated.objectKey,
      fields: validated.fields ?? Prisma.DbNull,
    };
  }

  private toEntry(row: CaseFileRow) {
    return {
      id: row.id,
      kind: KIND_FROM_PRISMA[row.kind],
      unlockMode: UNLOCK_FROM_PRISMA[row.unlockMode],
      stationId: row.stationId,
      stationName: row.station?.name ?? null,
      order: row.order,
      title: row.title,
      body: row.body,
      url: row.url,
      objectKey: row.objectKey,
      fields: (row.fields as CaseFileFieldInput[] | null) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
