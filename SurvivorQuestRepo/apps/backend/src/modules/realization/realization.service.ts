import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventActorType,
  RealizationStatus as PrismaRealizationStatus,
  RealizationType as PrismaRealizationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

export type RealizationStatus = 'planned' | 'in-progress' | 'done';
export type RealizationType =
  | 'outdoor-games'
  | 'hotel-games'
  | 'workshops'
  | 'evening-attractions'
  | 'dj'
  | 'recreation';

export type RealizationLog = {
  id: string;
  changedBy: string;
  changedAt: string;
  action: 'created' | 'updated';
  description: string;
};

export type RealizationEntity = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  stationIds: string[];
  scenarioStations: StationEntity[];
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: RealizationLog[];
};

export type CreateRealizationPayload = {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: unknown;
  type?: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId?: string;
  teamCount?: number;
  peopleCount?: number;
  positionsCount?: number;
  status?: RealizationStatus;
  scheduledAt?: string;
  changedBy?: string;
  scenarioStations?: unknown;
};

export type UpdateRealizationPayload = CreateRealizationPayload & {
  id?: string;
};

type ScenarioStationDraftPayload = {
  id?: string;
  name?: string;
  type?: StationType;
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
  sourceTemplateId?: string;
};

const REALIZATION_TYPES: RealizationType[] = [
  'outdoor-games',
  'hotel-games',
  'workshops',
  'evening-attractions',
  'dj',
  'recreation',
];

const REALIZATION_STATUSES: RealizationStatus[] = [
  'planned',
  'in-progress',
  'done',
];

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

  async createRealization(payload: CreateRealizationPayload) {
    const validated = this.validatePayload(payload);
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
        type: this.toPrismaType(validated.type),
        logoUrl: validated.logoUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: clonedScenario.id,
        teamCount: validated.teamCount,
        requiredDevicesCount: this.calculateRequiredDevices(
          validated.teamCount,
        ),
        peopleCount: validated.peopleCount,
        positionsCount: validated.positionsCount,
        status: this.toPrismaStatus(
          this.resolveRealizationStatus(
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

  async updateRealization(payload: UpdateRealizationPayload) {
    const realizationId = payload.id?.trim();
    if (!realizationId) {
      throw new BadRequestException('Invalid payload');
    }

    const current = await this.prisma.realization.findUnique({
      where: { id: realizationId },
    });
    if (!current) {
      throw new NotFoundException('Realization not found');
    }

    const validated = this.validatePayload(payload);
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
        type: this.toPrismaType(validated.type),
        logoUrl: validated.logoUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: scenario.id,
        teamCount: validated.teamCount,
        requiredDevicesCount: this.calculateRequiredDevices(
          validated.teamCount,
        ),
        peopleCount: validated.peopleCount,
        positionsCount: validated.positionsCount,
        status: this.toPrismaStatus(
          this.resolveRealizationStatus(
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
      if (
        !draft.name?.trim() ||
        !draft.description?.trim() ||
        !this.isValidStationType(draft.type) ||
        typeof draft.points !== 'number' ||
        draft.points <= 0 ||
        !parsedTimeLimit.ok
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

    return {
      id: realization.id,
      companyName: realization.companyName,
      contactPerson: realization.contactPerson,
      contactPhone: realization.contactPhone || undefined,
      contactEmail: realization.contactEmail || undefined,
      instructors: Array.isArray(realization.instructors)
        ? realization.instructors.filter(
            (item): item is string => typeof item === 'string',
          )
        : [],
      type: this.fromPrismaType(realization.type),
      logoUrl: realization.logoUrl || undefined,
      offerPdfUrl: realization.offerPdfUrl || undefined,
      offerPdfName: realization.offerPdfName || undefined,
      scenarioId: realization.scenarioId,
      stationIds: stations.map((item) => item.id),
      scenarioStations: stations,
      teamCount: realization.teamCount,
      requiredDevicesCount: realization.requiredDevicesCount,
      peopleCount: realization.peopleCount,
      positionsCount: realization.positionsCount,
      status: this.resolveRealizationStatus(
        this.fromPrismaStatus(realization.status),
        realization.scheduledAt.toISOString(),
      ),
      scheduledAt: realization.scheduledAt.toISOString(),
      createdAt: realization.createdAt.toISOString(),
      updatedAt: realization.updatedAt.toISOString(),
      logs: logsRaw.map((log) => {
        const payload = (log.payload || {}) as Record<string, unknown>;
        const changedBy =
          typeof payload.changedBy === 'string' && payload.changedBy.trim()
            ? payload.changedBy
            : log.actorId;
        const action = payload.action === 'created' ? 'created' : 'updated';
        const description =
          typeof payload.description === 'string' ? payload.description : '';

        return {
          id: log.id,
          changedBy,
          changedAt: log.createdAt.toISOString(),
          action,
          description,
        };
      }),
    } satisfies RealizationEntity;
  }

  private validatePayload(payload: CreateRealizationPayload) {
    const companyName = payload.companyName?.trim() || '';
    const contactPerson = payload.contactPerson?.trim() || '';
    const contactPhone = payload.contactPhone?.trim() || '';
    const contactEmail = payload.contactEmail?.trim() || '';
    const instructors = this.sanitizeInstructors(payload.instructors);
    const teamCount = Math.round(Number(payload.teamCount));
    const peopleCount = Math.round(Number(payload.peopleCount));
    const positionsCount = Math.round(Number(payload.positionsCount));
    const scenarioId = payload.scenarioId?.trim() || '';
    const scheduledAtDate = payload.scheduledAt
      ? new Date(payload.scheduledAt)
      : null;
    const scheduledAt =
      scheduledAtDate && Number.isFinite(scheduledAtDate.getTime())
        ? scheduledAtDate.toISOString()
        : '';

    if (
      !companyName ||
      !contactPerson ||
      (!contactPhone && !contactEmail) ||
      !this.isValidRealizationType(payload.type) ||
      !this.isValidRealizationStatus(payload.status) ||
      !scenarioId ||
      !Number.isFinite(teamCount) ||
      teamCount < 1 ||
      !Number.isFinite(peopleCount) ||
      peopleCount < 1 ||
      !Number.isFinite(positionsCount) ||
      positionsCount < 1 ||
      !scheduledAt
    ) {
      throw new BadRequestException('Invalid payload');
    }

    let stationDrafts: ScenarioStationDraftPayload[] | undefined;
    if (typeof payload.scenarioStations !== 'undefined') {
      if (!Array.isArray(payload.scenarioStations)) {
        throw new BadRequestException('Invalid payload');
      }
      stationDrafts = payload.scenarioStations.map(
        (item) => (item || {}) as ScenarioStationDraftPayload,
      );
    }

    return {
      companyName,
      contactPerson,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      instructors,
      type: payload.type,
      logoUrl: payload.logoUrl?.trim() || undefined,
      offerPdfUrl: payload.offerPdfUrl?.trim() || undefined,
      offerPdfName: payload.offerPdfName?.trim() || undefined,
      scenarioId,
      teamCount,
      peopleCount,
      positionsCount,
      status: payload.status,
      scheduledAt,
      changedBy: payload.changedBy?.trim() || 'admin@local',
      stationDrafts,
    };
  }

  private sanitizeInstructors(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as string[];
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
  }

  private resolveRealizationStatus(
    status: RealizationStatus,
    scheduledAt: string,
  ) {
    const scheduledTimestamp = new Date(scheduledAt).getTime();

    if (
      Number.isFinite(scheduledTimestamp) &&
      scheduledTimestamp < Date.now()
    ) {
      return 'done' as const;
    }

    return status;
  }

  private calculateRequiredDevices(teamCount: number) {
    return teamCount + 2;
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

  private isValidRealizationType(value: unknown): value is RealizationType {
    return (
      typeof value === 'string' &&
      REALIZATION_TYPES.includes(value as RealizationType)
    );
  }

  private isValidRealizationStatus(value: unknown): value is RealizationStatus {
    return (
      typeof value === 'string' &&
      REALIZATION_STATUSES.includes(value as RealizationStatus)
    );
  }

  private toPrismaType(type: RealizationType) {
    if (type === 'outdoor-games') return PrismaRealizationType.OUTDOOR_GAMES;
    if (type === 'hotel-games') return PrismaRealizationType.HOTEL_GAMES;
    if (type === 'workshops') return PrismaRealizationType.WORKSHOPS;
    if (type === 'evening-attractions')
      return PrismaRealizationType.EVENING_ATTRACTIONS;
    if (type === 'dj') return PrismaRealizationType.DJ;
    return PrismaRealizationType.RECREATION;
  }

  private fromPrismaType(type: PrismaRealizationType): RealizationType {
    if (type === PrismaRealizationType.OUTDOOR_GAMES) return 'outdoor-games';
    if (type === PrismaRealizationType.HOTEL_GAMES) return 'hotel-games';
    if (type === PrismaRealizationType.WORKSHOPS) return 'workshops';
    if (type === PrismaRealizationType.EVENING_ATTRACTIONS)
      return 'evening-attractions';
    if (type === PrismaRealizationType.DJ) return 'dj';
    return 'recreation';
  }

  private toPrismaStatus(status: RealizationStatus) {
    if (status === 'planned') return PrismaRealizationStatus.PLANNED;
    if (status === 'in-progress') return PrismaRealizationStatus.IN_PROGRESS;
    return PrismaRealizationStatus.DONE;
  }

  private fromPrismaStatus(status: PrismaRealizationStatus): RealizationStatus {
    if (status === PrismaRealizationStatus.PLANNED) return 'planned';
    if (status === PrismaRealizationStatus.IN_PROGRESS) return 'in-progress';
    return 'done';
  }
}
