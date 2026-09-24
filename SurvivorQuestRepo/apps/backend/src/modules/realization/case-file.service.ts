import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseFileKind, CaseFileUnlockMode, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StationStorageService } from '../station/station-storage.service';
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
 * Konwencja bezpieczeństwa przejęta z PointsQrCode w module mobile: każda
 * operacja na pojedynczym rekordzie idzie przez `deleteMany`/`updateMany` z
 * `realizationId` w `where`, nigdy przez `delete({ where: { id } })`. Dzięki
 * temu zgadnięte id z obcej realizacji nie daje dostępu do cudzego rekordu —
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

const UNLOCK_FROM_PRISMA: Record<CaseFileUnlockMode, CaseFileUnlockModeInput> = {
  [CaseFileUnlockMode.FROM_START]: 'from-start',
  [CaseFileUnlockMode.AFTER_STATION]: 'after-station',
};

const INCLUDE_STATION = { station: { select: { name: true } } } as const;
const ORDER_BY: Prisma.CaseFileOrderByWithRelationInput[] = [
  { order: 'asc' },
  { createdAt: 'asc' },
];

export type CaseFileEntry = ReturnType<CaseFileService['toEntry']>;

@Injectable()
export class CaseFileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stationStorageService: StationStorageService,
  ) {}

  async listCaseFiles(realizationId: string) {
    await this.requireRealization(realizationId);

    const rows = await this.prisma.caseFile.findMany({
      where: { realizationId },
      orderBy: ORDER_BY,
      include: INCLUDE_STATION,
    });

    return { realizationId, entries: rows.map((row) => this.toEntry(row)) };
  }

  async createCaseFile(realizationId: string, payload: CaseFileDto | undefined) {
    await this.requireRealization(realizationId);

    const validated = parseCaseFilePayload(payload);
    await this.assertStationBelongsToRealization(realizationId, validated.stationId);

    // Nowy dowód ląduje na końcu. `order` nie ma unikatu, bo wzorzec jest
    // per-element — unikat waliłby konfliktami przy przestawianiu kolejności.
    const last = await this.prisma.caseFile.findFirst({
      where: { realizationId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const row = await this.prisma.caseFile.create({
      data: {
        realizationId,
        order: (last?.order ?? -1) + 1,
        ...this.toPrismaData(validated),
      },
      include: INCLUDE_STATION,
    });

    return this.toEntry(row);
  }

  async updateCaseFile(
    realizationId: string,
    caseFileId: string,
    payload: CaseFileDto | undefined,
  ) {
    const existing = await this.requireCaseFile(realizationId, caseFileId);

    const validated = parseCaseFilePayload(payload);
    await this.assertStationBelongsToRealization(realizationId, validated.stationId);

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
    realizationId: string,
    caseFileId: string,
    direction: 'up' | 'down',
  ) {
    const current = await this.requireCaseFile(realizationId, caseFileId);

    const neighbour = await this.prisma.caseFile.findFirst({
      where: {
        realizationId,
        order: direction === 'up' ? { lt: current.order } : { gt: current.order },
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

  async deleteCaseFile(realizationId: string, caseFileId: string) {
    const existing = await this.requireCaseFile(realizationId, caseFileId);

    const result = await this.prisma.caseFile.deleteMany({
      where: { id: caseFileId, realizationId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Case file not found');
    }

    if (existing.objectKey) {
      await this.deleteOrphanedObject(existing.objectKey);
    }

    return { id: caseFileId };
  }

  async uploadImage(realizationId: string, file: Express.Multer.File) {
    await this.requireRealization(realizationId);

    return this.stationStorageService.uploadCaseFileImage(file, { realizationId });
  }

  async uploadAudio(realizationId: string, file: Express.Multer.File) {
    await this.requireRealization(realizationId);

    return this.stationStorageService.uploadCaseFileAudio(file, { realizationId });
  }

  private async requireRealization(realizationId: string) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
      select: { id: true },
    });

    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    return realization;
  }

  private async requireCaseFile(realizationId: string, caseFileId: string) {
    const existing = await this.prisma.caseFile.findFirst({
      where: { id: caseFileId, realizationId },
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
  private async assertStationBelongsToRealization(
    realizationId: string,
    stationId: string | null,
  ) {
    if (!stationId) {
      return;
    }

    const station = await this.prisma.station.findFirst({
      where: { id: stationId, realizationId },
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
    const stillUsed = await this.prisma.caseFile.count({ where: { objectKey } });

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
