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
  type DeleteRealizationDto,
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
  fromPrismaRealizationStatus,
  mapRealizationLogs,
  resolveRealizationStatus,
  toPrismaRealizationLanguage,
  toPrismaRealizationStatus,
  toPrismaRealizationTranslationsData,
  toPrismaRealizationType,
} from './mappers/realization.mapper';
import {
  ScenarioService,
  type ScenarioEntity,
} from '../scenario/scenario.service';
import { StationService, type StationEntity } from '../station/station.service';
import { StationStorageService } from '../station/station-storage.service';
import { TranslationService } from '../translation/translation.service';
import { RiskQuizService } from '../risk-quiz/risk-quiz.service';
import { RealizationJoinCodeService } from './domain/realization.join-code';
import {
  normalizeScenarioStationDrafts,
  type ParseTimeLimitResult,
} from './normalizers/realization-station-draft.normalizer';

export type {
  RealizationEntity,
  RealizationLanguage,
  RealizationStatus,
  RealizationTranslations,
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
    private readonly riskQuizService: RiskQuizService,
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
    const isRiskQuizType = validated.type === 'risk-quiz';

    // Ryzykanci realizations don't use the Scenario/Station system at all —
    // their gameplay is entirely card-driven (RiskCard/RiskAttempt), so they
    // simply don't get a scenario.
    let clonedScenario: ScenarioEntity | null = null;
    let finalStations: StationEntity[] = [];

    if (!isRiskQuizType) {
      clonedScenario = await this.scenarioService.cloneScenario(
        validated.scenarioId,
        { realizationId },
      );

      if (!clonedScenario) {
        throw new BadRequestException('Scenario not found');
      }

      finalStations = await this.syncScenarioStations(
        realizationId,
        clonedScenario,
        validated.stationDrafts,
      );
    }

    await this.prisma.realization.create({
      data: {
        id: realizationId,
        companyName: validated.companyName,
        location: validated.location,
        language: toPrismaRealizationLanguage(validated.language),
        customLanguage: validated.customLanguage,
        introText: validated.introText,
        gameRules: validated.gameRules,
        translations: toPrismaRealizationTranslationsData(
          validated.translations,
        ),
        contactPerson: validated.contactPerson,
        contactPhone: validated.contactPhone,
        contactEmail: validated.contactEmail,
        instructors: validated.instructors,
        notes: validated.notes,
        type: toPrismaRealizationType(validated.type),
        logoUrl: validated.logoUrl,
        hideMap: validated.hideMap,
        mapImageUrl: validated.mapImageUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: clonedScenario?.id ?? null,
        riskSchemeId: validated.riskSchemeId || null,
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
        hideLeaderboardMinutesBeforeEnd:
          validated.hideLeaderboardMinutesBeforeEnd,
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

    if (isRiskQuizType) {
      // Give the realization its OWN copy of the chosen deck, exactly like a
      // non-risk realization gets its own cloned Scenario + Stations above. The
      // realization is created pointing at the template; this repoints it at the
      // clone. Must run before card generation so the cards are minted against
      // the realization's own categories.
      await this.riskQuizService.ensureRealizationOwnedScheme(realizationId);

      // Provisions the (deterministic, per-category) card set right away, so
      // an operator never has to remember to click "Wygeneruj brakujące
      // karty" before printing — riskSchemeId is guaranteed set here, DTO
      // validation already rejects a risk-quiz payload without one.
      await this.riskQuizService.generateMissingCards(realizationId);
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
    const isRiskQuizType = validated.type === 'risk-quiz';

    const currentScenario = current.scenarioId
      ? await this.scenarioService.findScenarioById(current.scenarioId)
      : null;
    const currentScenarioOwnedByThisRealization =
      !!currentScenario && currentScenario.realizationId === realizationId;

    // scenarioInstanceIdToRemove tracks a realization-owned scenario instance
    // that's being replaced or dropped — it can only be deleted once
    // Realization.scenarioId stops referencing it (FK), so removal happens
    // after the update below, whichever branch set it.
    let scenario: ScenarioEntity | null = null;
    let finalStations: StationEntity[] = [];
    let scenarioInstanceIdToRemove: string | null = null;

    if (isRiskQuizType) {
      // Ryzykanci realizations don't use the Scenario/Station system — drop
      // whatever scenario instance this realization previously owned (e.g.
      // switching from another realization type) and don't create a new one.
      if (currentScenarioOwnedByThisRealization) {
        await this.stationService.removeStationsByIds(
          currentScenario.stationIds,
        );
        scenarioInstanceIdToRemove = currentScenario.id;
      }
    } else {
      const requestedScenario = await this.scenarioService.findScenarioById(
        validated.scenarioId,
      );
      if (!requestedScenario) {
        throw new BadRequestException('Scenario not found');
      }
      const currentScenarioTemplateId =
        currentScenario?.sourceTemplateId ?? currentScenario?.id;
      const isReusingCurrentScenarioInstance =
        requestedScenario.id === current.scenarioId ||
        (currentScenarioTemplateId === requestedScenario.id &&
          !!currentScenario);
      const isDiscardingCurrentScenarioInstance =
        !isReusingCurrentScenarioInstance &&
        currentScenarioOwnedByThisRealization;

      if (isDiscardingCurrentScenarioInstance) {
        // Remove the old scenario instance's stations *before* cloning the
        // new one, so the clone's preferred (template) qrEntryCodes can't
        // collide with the soon-to-be-replaced rows within this realizationId.
        await this.stationService.removeStationsByIds(
          currentScenario.stationIds,
        );
        scenarioInstanceIdToRemove = currentScenario.id;
      }

      scenario = isReusingCurrentScenarioInstance
        ? (requestedScenario.id === current.scenarioId
            ? requestedScenario
            : currentScenario)!
        : await this.scenarioService.cloneScenario(requestedScenario.id, {
            realizationId,
          });

      if (!scenario) {
        throw new BadRequestException('Scenario not found');
      }

      finalStations = await this.syncScenarioStations(
        realizationId,
        scenario,
        validated.stationDrafts,
      );
    }

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
        translations: Object.prototype.hasOwnProperty.call(
          payload,
          'translations',
        )
          ? toPrismaRealizationTranslationsData(validated.translations)
          : undefined,
        contactPerson: validated.contactPerson,
        contactPhone: validated.contactPhone,
        contactEmail: validated.contactEmail,
        instructors: validated.instructors,
        notes: validated.notes,
        type: toPrismaRealizationType(validated.type),
        logoUrl: validated.logoUrl,
        hideMap: validated.hideMap,
        mapImageUrl: validated.mapImageUrl,
        offerPdfUrl: validated.offerPdfUrl,
        offerPdfName: validated.offerPdfName,
        scenarioId: scenario?.id ?? null,
        riskSchemeId: validated.riskSchemeId || null,
        teamCount: validated.teamCount,
        requiredDevicesCount: calculateRequiredDevices(validated.teamCount),
        peopleCount: validated.peopleCount,
        positionsCount: finalStations.length,
        durationMinutes: validated.durationMinutes,
        showLeaderboard: validated.showLeaderboard,
        showLeaderboardDuringGame: validated.showLeaderboardDuringGame,
        showLeaderboardOnFinish: validated.showLeaderboardOnFinish,
        hideLeaderboardMinutesBeforeEnd:
          validated.hideLeaderboardMinutesBeforeEnd,
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

    if (scenarioInstanceIdToRemove) {
      await this.scenarioService.removeScenario(scenarioInstanceIdToRemove);
    }

    if (isRiskQuizType) {
      // Picking a different deck in the editor sets riskSchemeId back to a
      // template id, so re-clone here. A no-op when the realization is already
      // pointing at its own clone. The previous clone is deliberately left in
      // place rather than deleted — it may still be referenced by RiskAttempt
      // rows, and losing played history to a dropdown change would be worse
      // than an orphaned row.
      await this.riskQuizService.ensureRealizationOwnedScheme(realizationId);

      // Same auto-provisioning as createRealization — also covers switching
      // an existing realization to risk-quiz, or changing its scheme.
      await this.riskQuizService.generateMissingCards(realizationId);
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

  async deleteRealization(dto: DeleteRealizationDto) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: dto.id },
    });
    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    const effectiveStatus = resolveRealizationStatus(
      fromPrismaRealizationStatus(realization.status),
      realization.scheduledAt.toISOString(),
      realization.durationMinutes,
    );
    if (effectiveStatus === 'in-progress') {
      throw new BadRequestException(
        'Cannot delete a realization that is in progress',
      );
    }

    if (realization.companyName !== dto.confirmName) {
      throw new BadRequestException(
        'Realization name confirmation does not match',
      );
    }

    const scenario = realization.scenarioId
      ? await this.scenarioService.findScenarioById(realization.scenarioId)
      : null;

    if (scenario) {
      await this.stationService.removeStationsByIds(scenario.stationIds);
    }

    await this.prisma.realization.delete({ where: { id: dto.id } });

    if (scenario && scenario.realizationId === dto.id) {
      await this.scenarioService.removeScenario(scenario.id);
    }

    return { id: dto.id };
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
    const currentStationsById = new Map(
      currentStations.map((item) => [item.id, item]),
    );
    // On a brand-new realization, `drafts[].id` is the *template* station id
    // (the form is built from the scenario template, before cloning), while
    // `currentStations` here are the just-cloned scenario-instance rows with
    // freshly generated ids — so a direct id match always misses. Fall back
    // to matching by sourceTemplateId (queued per template so repeated use
    // of the same template in one scenario still pairs up 1:1 in order).
    // Without this, every station falls into the "create" branch below and
    // collides with the clone it duplicates, silently losing its qrEntryCode
    // to the random-code fallback (see createStationRow).
    const stationsBySourceTemplateId = new Map<string, StationEntity[]>();
    for (const station of currentStations) {
      if (!station.sourceTemplateId) {
        continue;
      }
      const queue = stationsBySourceTemplateId.get(station.sourceTemplateId);
      if (queue) {
        queue.push(station);
      } else {
        stationsBySourceTemplateId.set(station.sourceTemplateId, [station]);
      }
    }
    const nextStations: StationEntity[] = [];
    const reusedExistingIds = new Set<string>();

    for (let index = 0; index < normalizedDrafts.length; index += 1) {
      // Match by the draft's own id (not array position) — reordering
      // stations sends the same ids back in a new order, and position-based
      // matching would update the wrong DB row for each moved station,
      // corrupting anything unique-per-row (e.g. qrEntryCode collisions
      // silently falling back to a random code).
      const draftId = drafts?.[index]?.id;
      let existing = draftId ? currentStationsById.get(draftId) : undefined;
      if (!existing && draftId) {
        const queue = stationsBySourceTemplateId.get(draftId);
        while (queue && queue.length > 0) {
          const candidate = queue.shift();
          if (candidate && !reusedExistingIds.has(candidate.id)) {
            existing = candidate;
            break;
          }
        }
      }
      if (existing) {
        reusedExistingIds.add(existing.id);
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
      .filter((item) => !reusedExistingIds.has(item.id))
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

    const scenario = realization.scenarioId
      ? await this.scenarioService.findScenarioById(realization.scenarioId)
      : null;
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
