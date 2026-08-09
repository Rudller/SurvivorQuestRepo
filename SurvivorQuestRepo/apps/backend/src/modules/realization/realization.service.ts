import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventActorType, PointsQrClaimMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { generateRandomCode } from '../../shared/lib/random-code';
import { isUniqueConstraintError } from '../../shared/lib/prisma-errors';
import {
  requireRealizationId,
  validateRealizationPayload,
  validateTranslateRealizationTextsPayload,
  type CreateRealizationDto,
  type TranslateRealizationTextsDto,
  type UpdateRealizationDto,
} from './dto/realization.dto';
import type {
  PointsQrCodeDraftPayload,
  ScenarioStationDraftPayload,
} from './entities/realization.entity';
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
import { StationStorageService } from '../station/station-storage.service';
import { TranslationService } from '../translation/translation.service';
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
    private readonly stationStorageService: StationStorageService,
    private readonly translationService: TranslationService,
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
        hideMap: validated.hideMap,
        mapImageUrl: validated.mapImageUrl,
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
        showLeaderboard: validated.showLeaderboard,
        showLeaderboardDuringGame: validated.showLeaderboardDuringGame,
        showLeaderboardOnFinish: validated.showLeaderboardOnFinish,
        teamStationNumberingEnabled: validated.teamStationNumberingEnabled,
        timedStationPointsDecayEnabled:
          validated.timedStationPointsDecayEnabled,
        hideTaskList: validated.hideTaskList,
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

    if (validated.pointsQrCodeDrafts?.length) {
      await this.createPointsQrCodes(
        realizationId,
        validated.pointsQrCodeDrafts,
      );
    }

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
    const isReusingCurrentScenarioInstance =
      requestedScenario.id === current.scenarioId ||
      (currentScenarioTemplateId === requestedScenario.id && !!currentScenario);
    const isDiscardingCurrentScenarioInstance =
      !isReusingCurrentScenarioInstance &&
      !!currentScenario &&
      currentScenario.realizationId === realizationId;

    if (isDiscardingCurrentScenarioInstance) {
      // Remove the old scenario instance's stations *before* cloning the new
      // one, so the clone's preferred (template) qrEntryCodes can't collide
      // with the soon-to-be-replaced rows within this same realizationId.
      // The Scenario row itself can only be deleted once Realization.scenarioId
      // stops referencing it (FK), so that happens later, after the update below.
      await this.stationService.removeStationsByIds(currentScenario.stationIds);
    }

    const scenario = isReusingCurrentScenarioInstance
      ? (requestedScenario.id === current.scenarioId
          ? requestedScenario
          : currentScenario)!
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
        hideMap: validated.hideMap,
        mapImageUrl: validated.mapImageUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: scenario.id,
        teamCount: validated.teamCount,
        requiredDevicesCount: calculateRequiredDevices(validated.teamCount),
        peopleCount: validated.peopleCount,
        positionsCount: finalStations.length,
        durationMinutes: validated.durationMinutes,
        showLeaderboard: validated.showLeaderboard,
        showLeaderboardDuringGame: validated.showLeaderboardDuringGame,
        showLeaderboardOnFinish: validated.showLeaderboardOnFinish,
        teamStationNumberingEnabled: validated.teamStationNumberingEnabled,
        timedStationPointsDecayEnabled:
          validated.timedStationPointsDecayEnabled,
        hideTaskList: validated.hideTaskList,
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

    if (isDiscardingCurrentScenarioInstance) {
      await this.scenarioService.removeScenario(currentScenario.id);
    }

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

  async translateTexts(payload: TranslateRealizationTextsDto) {
    const validated = validateTranslateRealizationTextsPayload(payload);
    const texts = await this.translationService.translateBatch(
      validated.texts,
      validated.sourceLanguage,
      validated.targetLanguage,
    );
    return { texts };
  }

  async listMediaLibrary() {
    const [logos, mapImages] = await Promise.all([
      this.stationStorageService.listObjectsByPrefix('realizations/logos'),
      this.stationStorageService.listObjectsByPrefix('realizations/map-images'),
    ]);

    return { logos, mapImages };
  }

  async deleteMediaAsset(url: string) {
    await this.prisma.realization.updateMany({
      where: { logoUrl: url },
      data: { logoUrl: null },
    });
    await this.prisma.realization.updateMany({
      where: { mapImageUrl: url },
      data: { mapImageUrl: null },
    });

    const key = this.stationStorageService.getObjectKeyFromUrl(url);
    if (key) {
      await this.stationStorageService.deleteObject(key);
    }
  }

  /**
   * Bulk-creates points-only QR codes queued as local drafts while a
   * realization was still being created (mirrors the station-drafts flow —
   * `PointsQrCode.realizationId` is a real FK, so this must run after the
   * Realization row exists, unlike scenario stations which tolerate a
   * not-yet-created parent since their `realizationId` column has no FK).
   */
  private async createPointsQrCodes(
    realizationId: string,
    drafts: PointsQrCodeDraftPayload[],
  ) {
    for (const draft of drafts) {
      const points = Math.round(Number(draft.points));
      if (!Number.isFinite(points) || points <= 0) {
        continue;
      }

      const claimMode =
        draft.claimMode === PointsQrClaimMode.FIRST_TEAM
          ? PointsQrClaimMode.FIRST_TEAM
          : PointsQrClaimMode.PER_TEAM;
      const label = draft.label?.trim() || null;
      const preferredCode = draft.code?.trim().toUpperCase() || undefined;
      const candidateCodes = [
        ...(preferredCode ? [preferredCode] : []),
        ...Array.from({ length: 5 }, () => generateRandomCode(8)),
      ];

      for (const code of candidateCodes) {
        try {
          await this.prisma.pointsQrCode.create({
            data: { realizationId, code, points, label, claimMode },
          });
          break;
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            throw error;
          }
        }
      }
    }
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
        timedStationPointsDecayEnabled:
          'timedStationPointsDecayEnabled' in realization
            ? realization.timedStationPointsDecayEnabled
            : false,
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
