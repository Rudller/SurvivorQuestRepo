import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventActorType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  requireRealizationId,
  validateRealizationPayload,
  type CreateRealizationDto,
  type UpdateRealizationDto,
} from './dto/realization.dto';
import type {
  RealizationEntity,
  RealizationStatus,
  RealizationType,
  ScenarioStationDraftPayload,
} from './entities/realization.entity';
import {
  buildRealizationEntity,
  calculateRequiredDevices,
  fromPrismaRealizationStatus,
  mapRealizationLogs,
  resolveRealizationStatus,
  toPrismaRealizationStatus,
  toPrismaRealizationType,
} from './mappers/realization.mapper';
import {
  ScenarioService,
  type ScenarioEntity,
} from '../scenario/scenario.service';
import {
  StationService,
  type StationDraftInput,
  type StationEntity,
  type StationType,
} from '../station/station.service';

export type { RealizationEntity, RealizationStatus, RealizationType } from './entities/realization.entity';

@Injectable()
export class RealizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scenarioService: ScenarioService,
    private readonly stationService: StationService,
  ) {}

  async listRealizations() {
    const realizations = await this.prisma.realization.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const mapped = await Promise.all(
      realizations.map((item) => this.toEntity(item.id)),
    );
    return mapped.filter((item) => item !== null) as RealizationEntity[];
  }

  async createRealization(payload: CreateRealizationDto) {
    const validated = validateRealizationPayload(payload);
    const realizationId = crypto.randomUUID();
    const clonedScenario = await this.scenarioService.cloneScenario(
      validated.scenarioId,
      {
        realizationId,
      },
    );

    if (!clonedScenario) {
      throw new BadRequestException('Scenario not found');
    }

    const finalStations = await this.syncScenarioStations(
      realizationId,
      clonedScenario,
      validated.stationDrafts,
    );

    await this.prisma.realization.create({
      data: {
        id: realizationId,
        companyName: validated.companyName,
        contactPerson: validated.contactPerson,
        contactPhone: validated.contactPhone,
        contactEmail: validated.contactEmail,
        instructors: validated.instructors,
        type: toPrismaRealizationType(validated.type),
        logoUrl: validated.logoUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: clonedScenario.id,
        teamCount: validated.teamCount,
        requiredDevicesCount: calculateRequiredDevices(
          validated.teamCount,
        ),
        peopleCount: validated.peopleCount,
        positionsCount: validated.positionsCount,
        status: toPrismaRealizationStatus(
          resolveRealizationStatus(
            validated.status,
            validated.scheduledAt,
          ),
        ),
        scheduledAt: new Date(validated.scheduledAt),
        locationRequired: true,
        joinCode: await this.createUniqueJoinCode(
          validated.companyName,
          realizationId,
        ),
      },
    });

    await this.createLog(
      realizationId,
      validated.changedBy,
      'created',
      'Utworzono realizację.',
    );

    const entity = await this.toEntity(realizationId, finalStations);
    if (!entity) {
      throw new BadRequestException('Realization not found');
    }

    return entity;
  }

  async updateRealization(payload: UpdateRealizationDto) {
    const realizationId = requireRealizationId(payload);

    const current = await this.prisma.realization.findUnique({
      where: { id: realizationId },
    });
    if (!current) {
      throw new NotFoundException('Realization not found');
    }

    const validated = validateRealizationPayload(payload);
    const requestedScenario = await this.scenarioService.findScenarioById(
      validated.scenarioId,
    );
    if (!requestedScenario) {
      throw new BadRequestException('Scenario not found');
    }

    const scenario =
      requestedScenario.id === current.scenarioId
        ? requestedScenario
        : await this.scenarioService.cloneScenario(requestedScenario.id, {
            realizationId,
          });

    if (!scenario) {
      throw new BadRequestException('Scenario not found');
    }

    const finalStations = await this.syncScenarioStations(
      realizationId,
      scenario,
      validated.stationDrafts,
    );

    await this.prisma.realization.update({
      where: { id: realizationId },
      data: {
        companyName: validated.companyName,
        contactPerson: validated.contactPerson,
        contactPhone: validated.contactPhone,
        contactEmail: validated.contactEmail,
        instructors: validated.instructors,
        type: toPrismaRealizationType(validated.type),
        logoUrl: validated.logoUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: scenario.id,
        teamCount: validated.teamCount,
        requiredDevicesCount: calculateRequiredDevices(
          validated.teamCount,
        ),
        peopleCount: validated.peopleCount,
        positionsCount: validated.positionsCount,
        status: toPrismaRealizationStatus(
          resolveRealizationStatus(
            validated.status,
            validated.scheduledAt,
          ),
        ),
        scheduledAt: new Date(validated.scheduledAt),
      },
    });

    await this.createLog(
      realizationId,
      validated.changedBy,
      'updated',
      'Zaktualizowano realizację.',
    );

    const entity = await this.toEntity(realizationId, finalStations);
    if (!entity) {
      throw new NotFoundException('Realization not found');
    }

    return entity;
  }

  private async syncScenarioStations(
    realizationId: string,
    scenario: ScenarioEntity,
    drafts: ScenarioStationDraftPayload[] | undefined,
  ) {
    if (!drafts) {
      return this.stationService.findStationsByIds(scenario.stationIds);
    }

    if (drafts.length === 0) {
      throw new BadRequestException(
        'Realization must include at least one station',
      );
    }

    const normalized: StationDraftInput[] = drafts.map((draft) => {
      const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
        draft.timeLimitSeconds,
      );
      const hasLatitude = typeof draft.latitude === 'number';
      const hasLongitude = typeof draft.longitude === 'number';
      const hasCoordinates = hasLatitude || hasLongitude;

      if (
        !draft.name?.trim() ||
        !draft.description?.trim() ||
        !this.isValidStationType(draft.type) ||
        typeof draft.points !== 'number' ||
        draft.points <= 0 ||
        !parsedTimeLimit.ok ||
        (hasCoordinates &&
          !this.isValidStationCoordinate(draft.latitude, draft.longitude))
      ) {
        throw new BadRequestException('Invalid payload');
      }

      return {
        name: draft.name.trim(),
        type: draft.type,
        description: draft.description.trim(),
        imageUrl: draft.imageUrl?.trim() || undefined,
        points: Math.round(draft.points),
        timeLimitSeconds: parsedTimeLimit.value,
        latitude: hasCoordinates ? draft.latitude : undefined,
        longitude: hasCoordinates ? draft.longitude : undefined,
        sourceTemplateId: draft.sourceTemplateId?.trim() || undefined,
      };
    });

    const currentStations = await this.stationService.findStationsByIds(
      scenario.stationIds,
    );
    const nextStations: StationEntity[] = [];

    for (let index = 0; index < normalized.length; index += 1) {
      const existing = currentStations[index];
      if (existing) {
        const updated = await this.stationService.updateScenarioStationInstance(
          existing.id,
          normalized[index],
        );
        if (!updated) {
          throw new BadRequestException('Station not found');
        }
        nextStations.push(updated);
      } else {
        const created = await this.stationService.createScenarioStationInstance(
          normalized[index],
          {
            scenarioInstanceId: scenario.id,
            realizationId,
          },
        );
        nextStations.push(created);
      }
    }

    const toRemove = currentStations
      .slice(normalized.length)
      .map((item) => item.id);
    if (toRemove.length > 0) {
      await this.stationService.removeStationsByIds(toRemove);
    }

    await this.scenarioService.replaceScenario({
      ...scenario,
      stationIds: nextStations.map((item) => item.id),
      updatedAt: new Date().toISOString(),
    });

    return nextStations;
  }

  private async toEntity(
    realizationId: string,
    stationsFromSync?: StationEntity[],
  ) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
    });
    if (!realization) {
      return null;
    }

    const scenario = await this.scenarioService.findScenarioById(
      realization.scenarioId,
    );
    const stations =
      stationsFromSync ||
      (scenario
        ? await this.stationService.findStationsByIds(scenario.stationIds)
        : []);
    const logsRaw = await this.prisma.eventLog.findMany({
      where: { realizationId },
      orderBy: { createdAt: 'asc' },
    });

    return buildRealizationEntity({
      realization,
      stationIds: stations.map((item) => item.id),
      scenarioStations: stations,
      logs: mapRealizationLogs(logsRaw),
    });
  }

  private async createLog(
    realizationId: string,
    changedBy: string,
    action: 'created' | 'updated',
    description: string,
  ) {
    await this.prisma.eventLog.create({
      data: {
        realizationId,
        actorType: EventActorType.ADMIN,
        actorId: changedBy,
        eventType: `realization.${action}`,
        payload: {
          action,
          changedBy,
          description,
        },
      },
    });
  }

  private generateJoinCode(companyName: string, realizationId: string) {
    const letters = companyName
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8);
    const suffix = realizationId.replace(/-/g, '').toUpperCase().slice(0, 4);
    return `${letters}${suffix}`.slice(0, 12) || `SQ${suffix}`;
  }

  private async createUniqueJoinCode(
    companyName: string,
    realizationId: string,
  ) {
    const base = this.generateJoinCode(companyName, realizationId);
    let candidate = base;
    let index = 0;

    while (index < 100) {
      const existing = await this.prisma.realization.findUnique({
        where: { joinCode: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      index += 1;
      candidate = `${base.slice(0, 10)}${String(index).padStart(2, '0')}`;
    }

    return `${realizationId.replace(/-/g, '').toUpperCase().slice(0, 12)}`;
  }

  private isValidStationType(value: unknown): value is StationType {
    return value === 'quiz' || value === 'time' || value === 'points';
  }

  private isValidStationCoordinate(latitude: unknown, longitude: unknown) {
    return (
      typeof latitude === 'number' &&
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      typeof longitude === 'number' &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180
    );
  }
}
