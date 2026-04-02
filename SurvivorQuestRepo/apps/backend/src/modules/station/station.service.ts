import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class StationService {
  constructor(private readonly prisma: PrismaService) {}

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
      await this.prisma.station.create({
        data: {
          id: station.id,
          name: station.name,
          type: toPrismaStationType(station.type),
          description: station.description,
          imageUrl: station.imageUrl,
          points: station.points,
          timeLimitSeconds: station.timeLimitSeconds,
          completionCode: station.completionCode,
          quizData: toPrismaStationQuizData(station.quiz),
          translations: toPrismaStationTranslationsData(station.translations),
          latitude: station.latitude,
          longitude: station.longitude,
          sourceTemplateId: station.id,
        },
      }),
    );
  }

  async replaceTemplateStation(updatedStation: StationEntity) {
    return mapStation(
      await this.prisma.station.update({
        where: { id: updatedStation.id },
        data: {
          name: updatedStation.name,
          type: toPrismaStationType(updatedStation.type),
          description: updatedStation.description,
          imageUrl: updatedStation.imageUrl,
          points: updatedStation.points,
          timeLimitSeconds: updatedStation.timeLimitSeconds,
          completionCode: updatedStation.completionCode,
          quizData: toPrismaStationQuizData(updatedStation.quiz),
          translations: toPrismaStationTranslationsData(
            updatedStation.translations,
          ),
          latitude: updatedStation.latitude,
          longitude: updatedStation.longitude,
        },
      }),
    );
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
          await this.prisma.station.create({
            data: {
              name: source.name,
              type: toPrismaStationType(source.type),
              description: source.description,
              imageUrl: source.imageUrl,
              points: source.points,
              timeLimitSeconds: source.timeLimitSeconds,
              completionCode: source.completionCode,
              quizData: toPrismaStationQuizData(source.quiz),
              translations: toPrismaStationTranslationsData(
                source.translations,
              ),
              latitude: source.latitude,
              longitude: source.longitude,
              sourceTemplateId: source.sourceTemplateId ?? source.id,
              scenarioInstanceId:
                options?.scenarioInstanceId ?? source.scenarioInstanceId,
              realizationId: options?.realizationId ?? source.realizationId,
            },
          }),
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
      await this.prisma.station.create({
        data: {
          id: stationId,
          name: normalized.name,
          type: toPrismaStationType(normalized.type),
          description: normalized.description,
          imageUrl: normalized.imageUrl,
          points: normalized.points,
          timeLimitSeconds: normalized.timeLimitSeconds,
          completionCode: normalized.completionCode,
          quizData: toPrismaStationQuizData(normalized.quiz),
          translations: toPrismaStationTranslationsData(
            normalized.translations,
          ),
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          sourceTemplateId: normalized.sourceTemplateId,
          scenarioInstanceId: context.scenarioInstanceId,
          realizationId: context.realizationId,
        },
      }),
    );
  }

  async updateScenarioStationInstance(id: string, input: StationDraftInput) {
    const current = await this.findStationById(id);
    if (!current) {
      return null;
    }

    const normalized = normalizeStationDraft(input, current.id);
    return mapStation(
      await this.prisma.station.update({
        where: { id },
        data: {
          name: normalized.name,
          type: toPrismaStationType(normalized.type),
          description: normalized.description,
          imageUrl: normalized.imageUrl,
          points: normalized.points,
          timeLimitSeconds: normalized.timeLimitSeconds,
          completionCode: normalized.completionCode,
          quizData: toPrismaStationQuizData(normalized.quiz),
          translations: toPrismaStationTranslationsData(
            normalized.translations,
          ),
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          sourceTemplateId:
            normalized.sourceTemplateId ?? current.sourceTemplateId,
        },
      }),
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
