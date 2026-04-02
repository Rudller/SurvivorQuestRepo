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
  type TranslateRealizationStationDto,
  type UpdateRealizationDto,
} from './dto/realization.dto';
import type { ScenarioStationDraftPayload } from './entities/realization.entity';
import {
  buildRealizationEntity,
  calculateRequiredDevices,
  mapRealizationLogs,
  resolveRealizationStatus,
  toPrismaRealizationLanguage,
  toPrismaRealizationStatus,
  toPrismaRealizationType,
} from './mappers/realization.mapper';
import {
  ScenarioService,
  type ScenarioEntity,
} from '../scenario/scenario.service';
import { StationService, type StationEntity } from '../station/station.service';
import { RealizationJoinCodeService } from './domain/realization.join-code';
import {
  normalizeScenarioStationDrafts,
  type ParseTimeLimitResult,
} from './normalizers/realization-station-draft.normalizer';

export type {
  RealizationEntity,
  RealizationLanguage,
  RealizationStatus,
  RealizationType,
} from './entities/realization.entity';

function isStationEntity(value: unknown): value is StationEntity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string'
  );
}

@Injectable()
export class RealizationService {
  private readonly joinCodeService = new RealizationJoinCodeService();

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
    return mapped.filter((item) => item !== null);
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
        location: validated.location,
        language: toPrismaRealizationLanguage(validated.language),
        customLanguage: validated.customLanguage,
        introText: validated.introText,
        gameRules: validated.gameRules,
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
        requiredDevicesCount: calculateRequiredDevices(validated.teamCount),
        peopleCount: validated.peopleCount,
        positionsCount: finalStations.length,
        durationMinutes: validated.durationMinutes,
        status: toPrismaRealizationStatus(
          resolveRealizationStatus(
            validated.status,
            validated.scheduledAt,
            validated.durationMinutes,
          ),
        ),
        scheduledAt: new Date(validated.scheduledAt),
        locationRequired: true,
        joinCode: (
          await this.joinCodeService.createUniqueJoinCode(realizationId, {
            findExistingByStoredOrLegacy: async (
              storedCode: string,
              publicCode: string,
              hashedCode: string,
            ) =>
              (await this.prisma.realization.findFirst({
                where: {
                  OR: [
                    { joinCode: storedCode },
                    { joinCode: publicCode },
                    { joinCode: hashedCode },
                    { joinCode: { endsWith: `:${hashedCode}` } },
                  ],
                },
                select: { id: true },
              })) ?? null,
          })
        ).storedCode,
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
    const currentScenario = await this.scenarioService.findScenarioById(
      current.scenarioId,
    );
    const currentScenarioTemplateId =
      currentScenario?.sourceTemplateId ?? currentScenario?.id;

    const scenario =
      requestedScenario.id === current.scenarioId
        ? requestedScenario
        : currentScenarioTemplateId === requestedScenario.id && currentScenario
          ? currentScenario
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
        location: validated.location,
        language: toPrismaRealizationLanguage(validated.language),
        customLanguage: validated.customLanguage,
        introText: Object.prototype.hasOwnProperty.call(payload, 'introText')
          ? (validated.introText ?? null)
          : undefined,
        gameRules: Object.prototype.hasOwnProperty.call(payload, 'gameRules')
          ? (validated.gameRules ?? null)
          : undefined,
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
        requiredDevicesCount: calculateRequiredDevices(validated.teamCount),
        peopleCount: validated.peopleCount,
        positionsCount: finalStations.length,
        durationMinutes: validated.durationMinutes,
        status: toPrismaRealizationStatus(
          resolveRealizationStatus(
            validated.status,
            validated.scheduledAt,
            validated.durationMinutes,
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

  translateStation(payload: TranslateRealizationStationDto) {
    void payload;
    throw new BadRequestException('Auto-translate is not implemented yet.');
  }

  private async syncScenarioStations(
    realizationId: string,
    scenario: ScenarioEntity,
    drafts: ScenarioStationDraftPayload[] | undefined,
  ) {
    const normalizedDrafts = normalizeScenarioStationDrafts(
      drafts,
      (value): ParseTimeLimitResult =>
        this.stationService.parseTimeLimitSeconds(value),
    );

    if (!normalizedDrafts) {
      return this.stationService.findStationsByIds(scenario.stationIds);
    }

    const currentStations = await this.stationService.findStationsByIds(
      scenario.stationIds,
    );
    const nextStations: StationEntity[] = [];

    for (let index = 0; index < normalizedDrafts.length; index += 1) {
      const existing = currentStations[index];
      if (existing) {
        const maybeUpdated: unknown =
          await this.stationService.updateScenarioStationInstance(
            existing.id,
            normalizedDrafts[index],
          );
        const updated = isStationEntity(maybeUpdated) ? maybeUpdated : null;
        if (!isStationEntity(updated)) {
          throw new BadRequestException('Station not found');
        }
        nextStations.push(updated);
      } else {
        const maybeCreated: unknown =
          await this.stationService.createScenarioStationInstance(
            normalizedDrafts[index],
            {
              scenarioInstanceId: scenario.id,
              realizationId,
            },
          );
        const created = isStationEntity(maybeCreated) ? maybeCreated : null;
        if (!isStationEntity(created)) {
          throw new BadRequestException('Station not found');
        }
        nextStations.push(created);
      }
    }

    const toRemove = currentStations
      .slice(normalizedDrafts.length)
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
    const scenarioTemplateId = scenario?.sourceTemplateId ?? scenario?.id;
    const scenarioTemplate =
      scenarioTemplateId && scenarioTemplateId !== scenario?.id
        ? await this.scenarioService.findScenarioById(scenarioTemplateId)
        : scenario;
    const scenarioTemplateName = scenarioTemplate?.name;
    const stations =
      stationsFromSync ||
      (scenario
        ? await this.stationService.findStationsByIds(scenario.stationIds)
        : []);
    const logsRaw = await this.prisma.eventLog.findMany({
      where: { realizationId },
      orderBy: { createdAt: 'asc' },
    });
    const publicJoinCode = this.joinCodeService.resolvePublicJoinCode(
      realization.id,
      realization.joinCode,
    );

    return buildRealizationEntity({
      realization: {
        ...realization,
        scenarioTemplateId,
        scenarioTemplateName,
        joinCode: publicJoinCode,
      },
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
}
