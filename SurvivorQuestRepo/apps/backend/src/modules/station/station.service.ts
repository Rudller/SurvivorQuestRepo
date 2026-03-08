import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StationType as PrismaStationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type StationType = 'quiz' | 'time' | 'points';

export type StationKind =
  | 'template'
  | 'scenario-instance'
  | 'realization-instance';

export type StationEntity = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  kind: StationKind;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StationDraftInput = {
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
};

export type ParseTimeLimitResult =
  | { ok: true; value: number }
  | { ok: false; value: null };

function buildStationFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function deriveStationKind(input: {
  scenarioInstanceId: string | null;
  realizationId: string | null;
}): StationKind {
  if (input.realizationId) {
    return 'realization-instance';
  }

  if (input.scenarioInstanceId) {
    return 'scenario-instance';
  }

  return 'template';
}

function toPrismaStationType(type: StationType) {
  if (type === 'quiz') return PrismaStationType.QUIZ;
  if (type === 'time') return PrismaStationType.TIME;
  return PrismaStationType.POINTS;
}

function fromPrismaStationType(type: PrismaStationType): StationType {
  if (type === PrismaStationType.QUIZ) return 'quiz';
  if (type === PrismaStationType.TIME) return 'time';
  return 'points';
}

function mapStation(input: {
  id: string;
  name: string;
  type: PrismaStationType;
  description: string;
  imageUrl: string | null;
  points: number;
  timeLimitSeconds: number;
  latitude: number | null;
  longitude: number | null;
  sourceTemplateId: string | null;
  scenarioInstanceId: string | null;
  realizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): StationEntity {
  const kind = deriveStationKind(input);

  return {
    id: input.id,
    name: input.name,
    type: fromPrismaStationType(input.type),
    description: input.description,
    imageUrl: input.imageUrl || buildStationFallbackImage(input.name),
    points: input.points,
    timeLimitSeconds: input.timeLimitSeconds,
    latitude: typeof input.latitude === 'number' ? input.latitude : undefined,
    longitude: typeof input.longitude === 'number' ? input.longitude : undefined,
    sourceTemplateId: input.sourceTemplateId || undefined,
    scenarioInstanceId: input.scenarioInstanceId || undefined,
    realizationId: input.realizationId || undefined,
    kind,
    isTemplate: kind === 'template',
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

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
    const created = await this.prisma.station.create({
      data: {
        id: station.id,
        name: station.name,
        type: toPrismaStationType(station.type),
        description: station.description,
        imageUrl: station.imageUrl,
        points: station.points,
        timeLimitSeconds: station.timeLimitSeconds,
        latitude: station.latitude,
        longitude: station.longitude,
        sourceTemplateId: station.id,
      },
    });

    return mapStation(created);
  }

  async replaceTemplateStation(updatedStation: StationEntity) {
    const updated = await this.prisma.station.update({
      where: { id: updatedStation.id },
      data: {
        name: updatedStation.name,
        type: toPrismaStationType(updatedStation.type),
        description: updatedStation.description,
        imageUrl: updatedStation.imageUrl,
        points: updatedStation.points,
        timeLimitSeconds: updatedStation.timeLimitSeconds,
        latitude: updatedStation.latitude,
        longitude: updatedStation.longitude,
      },
    });

    return mapStation(updated);
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
      const created = await this.prisma.station.create({
        data: {
          name: source.name,
          type: toPrismaStationType(source.type),
          description: source.description,
          imageUrl: source.imageUrl,
          points: source.points,
          timeLimitSeconds: source.timeLimitSeconds,
          latitude: source.latitude,
          longitude: source.longitude,
          sourceTemplateId: source.sourceTemplateId ?? source.id,
          scenarioInstanceId:
            options?.scenarioInstanceId ?? source.scenarioInstanceId,
          realizationId: options?.realizationId ?? source.realizationId,
        },
      });
      cloned.push(mapStation(created));
    }

    return cloned;
  }

  async createScenarioStationInstance(
    input: StationDraftInput,
    context: { scenarioInstanceId: string; realizationId?: string },
  ) {
    const normalized = this.normalizeStationDraft(input, crypto.randomUUID());

    const created = await this.prisma.station.create({
      data: {
        id: crypto.randomUUID(),
        name: normalized.name,
        type: toPrismaStationType(normalized.type),
        description: normalized.description,
        imageUrl: normalized.imageUrl,
        points: normalized.points,
        timeLimitSeconds: normalized.timeLimitSeconds,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        sourceTemplateId: normalized.sourceTemplateId,
        scenarioInstanceId: context.scenarioInstanceId,
        realizationId: context.realizationId,
      },
    });

    return mapStation(created);
  }

  async updateScenarioStationInstance(id: string, input: StationDraftInput) {
    const current = await this.findStationById(id);
    if (!current) {
      return null;
    }

    const normalized = this.normalizeStationDraft(input, current.id);
    const updated = await this.prisma.station.update({
      where: { id },
      data: {
        name: normalized.name,
        type: toPrismaStationType(normalized.type),
        description: normalized.description,
        imageUrl: normalized.imageUrl,
        points: normalized.points,
        timeLimitSeconds: normalized.timeLimitSeconds,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        sourceTemplateId:
          normalized.sourceTemplateId ?? current.sourceTemplateId,
      },
    });

    return mapStation(updated);
  }

  private resolveImageUrl(imageUrl: string | undefined, seed: string) {
    return imageUrl?.trim() || buildStationFallbackImage(seed);
  }

  private normalizeStationDraft(input: StationDraftInput, currentId: string) {
    const normalizedName = input.name.trim() || 'Untitled station';

    return {
      name: normalizedName,
      type: input.type,
      description: input.description.trim(),
      imageUrl: this.resolveImageUrl(
        input.imageUrl,
        normalizedName || currentId,
      ),
      points: Math.round(input.points),
      timeLimitSeconds: Math.round(input.timeLimitSeconds),
      latitude:
        typeof input.latitude === 'number' && Number.isFinite(input.latitude)
          ? input.latitude
          : undefined,
      longitude:
        typeof input.longitude === 'number' && Number.isFinite(input.longitude)
          ? input.longitude
          : undefined,
      sourceTemplateId: input.sourceTemplateId?.trim() || undefined,
    };
  }
}
