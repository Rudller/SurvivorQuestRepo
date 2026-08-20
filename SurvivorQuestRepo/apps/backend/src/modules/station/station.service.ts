import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateRandomCode } from '../../shared/lib/random-code';
import { isUniqueConstraintError } from '../../shared/lib/prisma-errors';
import {
  mapStation,
  toPrismaStationQuizData,
  toPrismaStationTranslationsData,
  toPrismaStationType,
} from './mappers/station.mapper';
import { normalizeStationDraft } from './normalizers/station.normalizer';
import type {
  ParseTimeLimitResult,
  StationDraftInput,
  StationEntity,
} from './domain/station.types';

const QR_ENTRY_CODE_LENGTH = 8;
const QR_ENTRY_CODE_MAX_ATTEMPTS = 5;

@Injectable()
export class StationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a Station row, assigning a qrEntryCode. If `preferredQrEntryCode`
   * is given (cloning, or an admin-typed code), it's tried first so the
   * clone keeps the same physical QR sticker as its source; only on a
   * collision (e.g. the same template used twice within one realization)
   * does it fall back to a freshly generated code. When no preferred code is
   * given at all, the row is created with `qrEntryCode: null` instead of
   * inventing a random one — a missing code should be a visible admin
   * decision (via the "Wygeneruj"/"Zaciągnij ze stanowiska" buttons), not a
   * silent default that can mask a lost/expected code.
   */
  private async createStationRow(
    buildData: (qrEntryCode: string | null) => Prisma.StationCreateInput,
    preferredQrEntryCode?: string,
  ) {
    if (!preferredQrEntryCode) {
      return await this.prisma.station.create({
        data: buildData(null),
      });
    }

    const candidateCodes = [
      preferredQrEntryCode,
      ...Array.from({ length: QR_ENTRY_CODE_MAX_ATTEMPTS }, () =>
        generateRandomCode(QR_ENTRY_CODE_LENGTH),
      ),
    ];

    for (const qrEntryCode of candidateCodes) {
      try {
        return await this.prisma.station.create({
          data: buildData(qrEntryCode),
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new Error('Failed to generate a unique station QR entry code');
  }

  parseTimeLimitSeconds(value: unknown): ParseTimeLimitResult {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 600
    ) {
      return { ok: false, value: null };
    }

    return { ok: true, value: Math.round(value) };
  }

  async listTemplateStations() {
    const stations = await this.prisma.station.findMany({
      where: {
        scenarioInstanceId: null,
        realizationId: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return stations.map((station) => mapStation(station));
  }

  async findStationById(id: string) {
    const station = await this.prisma.station.findUnique({ where: { id } });
    return station ? mapStation(station) : null;
  }

  async findStationByRealizationAndQrEntryCode(
    realizationId: string,
    qrEntryCode: string,
  ) {
    const station = await this.prisma.station.findFirst({
      where: { realizationId, qrEntryCode },
    });
    return station ? mapStation(station) : null;
  }

  async findStationsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const stations = await this.prisma.station.findMany({
      where: { id: { in: ids } },
    });

    const stationMap = new Map(
      stations.map((station) => [station.id, mapStation(station)]),
    );
    return ids
      .map((id) => stationMap.get(id))
      .filter((station): station is StationEntity => Boolean(station));
  }

  isTemplateStation(station: StationEntity) {
    return station.kind === 'template';
  }

  async addTemplateStation(
    station: Omit<
      StationEntity,
      | 'sourceTemplateId'
      | 'scenarioInstanceId'
      | 'realizationId'
      | 'kind'
      | 'isTemplate'
    >,
  ) {
    return mapStation(
      await this.createStationRow(
        (qrEntryCode) => ({
          id: station.id,
          name: station.name,
          type: toPrismaStationType(station.type),
          categories: station.categories,
          description: station.description,
          imageUrl: station.imageUrl,
          points: station.points,
          timeLimitSeconds: station.timeLimitSeconds,
          completionCode: station.completionCode,
          qrEntryCode,
          quizData: toPrismaStationQuizData(station.quiz),
          translations: toPrismaStationTranslationsData(station.translations),
          challengeDifficultyMode: station.challengeDifficultyMode,
          challengeDifficulty: station.challengeDifficulty,
          completionStopwatchEnabled: station.completionStopwatchEnabled,
          allowConcurrentTeams: station.allowConcurrentTeams,
          fastestCompletionBonusPoints: station.fastestCompletionBonusPoints,
          qrScanCodes: station.qrScanCodes,
          color: station.color,
          latitude: station.latitude,
          longitude: station.longitude,
          sourceTemplateId: station.id,
        }),
        station.qrEntryCode,
      ),
    );
  }

  async replaceTemplateStation(updatedStation: StationEntity) {
    try {
      return mapStation(
        await this.prisma.station.update({
          where: { id: updatedStation.id },
          data: {
            name: updatedStation.name,
            type: toPrismaStationType(updatedStation.type),
            categories: updatedStation.categories,
            description: updatedStation.description,
            imageUrl: updatedStation.imageUrl,
            points: updatedStation.points,
            timeLimitSeconds: updatedStation.timeLimitSeconds,
            completionCode: updatedStation.completionCode,
            qrEntryCode: updatedStation.qrEntryCode,
            quizData: toPrismaStationQuizData(updatedStation.quiz),
            translations: toPrismaStationTranslationsData(
              updatedStation.translations,
            ),
            challengeDifficultyMode: updatedStation.challengeDifficultyMode,
            challengeDifficulty: updatedStation.challengeDifficulty,
            completionStopwatchEnabled:
              updatedStation.completionStopwatchEnabled,
            allowConcurrentTeams: updatedStation.allowConcurrentTeams,
            fastestCompletionBonusPoints:
              updatedStation.fastestCompletionBonusPoints,
            qrScanCodes: updatedStation.qrScanCodes,
            color: updatedStation.color,
            latitude: updatedStation.latitude,
            longitude: updatedStation.longitude,
          },
        }),
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ten kod QR jest już używany przez inne stanowisko w tej realizacji.',
        );
      }
      throw error;
    }
  }

  async removeStationById(id: string) {
    try {
      await this.prisma.station.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Station not found');
      }

      throw error;
    }
  }

  async removeStationsByIds(ids: string[]) {
    await this.prisma.station.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async cloneStationsForScenario(
    sourceStationIds: string[],
    options?: { scenarioInstanceId?: string; realizationId?: string },
  ) {
    const sourceStations = await this.findStationsByIds(sourceStationIds);
    const cloned: StationEntity[] = [];

    for (const source of sourceStations) {
      cloned.push(
        mapStation(
          await this.createStationRow(
            (qrEntryCode) => ({
              name: source.name,
              type: toPrismaStationType(source.type),
              categories: source.categories,
              description: source.description,
              imageUrl: source.imageUrl,
              points: source.points,
              timeLimitSeconds: source.timeLimitSeconds,
              completionCode: source.completionCode,
              qrEntryCode,
              quizData: toPrismaStationQuizData(source.quiz),
              translations: toPrismaStationTranslationsData(
                source.translations,
              ),
              challengeDifficultyMode: source.challengeDifficultyMode,
              challengeDifficulty: source.challengeDifficulty,
              completionStopwatchEnabled: source.completionStopwatchEnabled,
              allowConcurrentTeams: source.allowConcurrentTeams,
              fastestCompletionBonusPoints: source.fastestCompletionBonusPoints,
              qrScanCodes: source.qrScanCodes,
              color: source.color,
              latitude: source.latitude,
              longitude: source.longitude,
              sourceTemplateId: source.sourceTemplateId ?? source.id,
              scenarioInstanceId:
                options?.scenarioInstanceId ?? source.scenarioInstanceId,
              realizationId: options?.realizationId ?? source.realizationId,
            }),
            source.qrEntryCode,
          ),
        ),
      );
    }

    return cloned;
  }

  async createScenarioStationInstance(
    input: StationDraftInput,
    context: { scenarioInstanceId: string; realizationId?: string },
  ) {
    const stationId = crypto.randomUUID();
    const normalized = normalizeStationDraft(input, stationId);

    return mapStation(
      await this.createStationRow(
        (qrEntryCode) => ({
          id: stationId,
          name: normalized.name,
          type: toPrismaStationType(normalized.type),
          categories: normalized.categories ?? [],
          description: normalized.description,
          imageUrl: normalized.imageUrl,
          points: normalized.points,
          timeLimitSeconds: normalized.timeLimitSeconds,
          completionCode: normalized.completionCode,
          qrEntryCode,
          quizData: toPrismaStationQuizData(normalized.quiz),
          translations: toPrismaStationTranslationsData(
            normalized.translations,
          ),
          challengeDifficultyMode: normalized.challengeDifficultyMode,
          challengeDifficulty: normalized.challengeDifficulty,
          completionStopwatchEnabled: normalized.completionStopwatchEnabled,
          allowConcurrentTeams: normalized.allowConcurrentTeams,
          fastestCompletionBonusPoints: normalized.fastestCompletionBonusPoints,
          qrScanCodes: normalized.qrScanCodes,
          color: normalized.color,
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          sourceTemplateId: normalized.sourceTemplateId,
          scenarioInstanceId: context.scenarioInstanceId,
          realizationId: context.realizationId,
        }),
        normalized.qrEntryCode,
      ),
    );
  }

  async updateScenarioStationInstance(id: string, input: StationDraftInput) {
    const current = await this.findStationById(id);
    if (!current) {
      return null;
    }

    const normalized = normalizeStationDraft(input, current.id);
    const buildData = (
      qrEntryCode?: string,
    ): Prisma.StationUncheckedUpdateInput => ({
      name: normalized.name,
      type: toPrismaStationType(normalized.type),
      categories: normalized.categories ?? current.categories,
      description: normalized.description,
      imageUrl: normalized.imageUrl,
      points: normalized.points,
      timeLimitSeconds: normalized.timeLimitSeconds,
      completionCode: normalized.completionCode,
      qrEntryCode,
      quizData: toPrismaStationQuizData(normalized.quiz),
      translations: toPrismaStationTranslationsData(normalized.translations),
      challengeDifficultyMode: normalized.challengeDifficultyMode,
      challengeDifficulty: normalized.challengeDifficulty,
      completionStopwatchEnabled: normalized.completionStopwatchEnabled,
      allowConcurrentTeams: normalized.allowConcurrentTeams,
      fastestCompletionBonusPoints: normalized.fastestCompletionBonusPoints,
      qrScanCodes: normalized.qrScanCodes,
      color: normalized.color,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      sourceTemplateId: normalized.sourceTemplateId ?? current.sourceTemplateId,
    });

    if (!normalized.qrEntryCode) {
      return mapStation(
        await this.prisma.station.update({
          where: { id },
          data: buildData(undefined),
        }),
      );
    }

    const candidateCodes = [
      normalized.qrEntryCode,
      ...Array.from({ length: QR_ENTRY_CODE_MAX_ATTEMPTS }, () =>
        generateRandomCode(QR_ENTRY_CODE_LENGTH),
      ),
    ];

    for (const qrEntryCode of candidateCodes) {
      try {
        return mapStation(
          await this.prisma.station.update({
            where: { id },
            data: buildData(qrEntryCode),
          }),
        );
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Ten kod QR jest już używany przez inne stanowisko w tej realizacji.',
    );
  }
}

export type {
  ParseTimeLimitResult,
  StationDraftInput,
  StationEntity,
  StationKind,
  StationQuiz,
  StationTranslation,
  StationTranslations,
  StationType,
} from './domain/station.types';
