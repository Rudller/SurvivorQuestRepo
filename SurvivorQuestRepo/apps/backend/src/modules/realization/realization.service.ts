import { createHash } from 'node:crypto';
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
import {
  StationService,
  type StationDraftInput,
  type StationEntity,
  type StationQuiz,
  type StationType,
} from '../station/station.service';

export type {
  RealizationEntity,
  RealizationLanguage,
  RealizationStatus,
  RealizationType,
} from './entities/realization.entity';

const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const JOIN_CODE_LENGTH = 6;
const STORED_JOIN_CODE_VERSION_PREFIX = 'v2';
const QUIZ_ANSWER_COUNT = 4;

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
        joinCode: (await this.createUniqueJoinCode(realizationId)).storedCode,
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
        location: validated.location,
        language: toPrismaRealizationLanguage(validated.language),
        customLanguage: validated.customLanguage,
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
      const requiresCompletionCode =
        draft.type === 'time' || draft.type === 'points';
      const normalizedCompletionCode =
        typeof draft.completionCode === 'string'
          ? draft.completionCode.trim().toUpperCase()
          : '';
      const normalizedQuiz = this.normalizeStationQuizDraft(
        draft.quiz,
        draft.type,
      );

      if (
        !draft.name?.trim() ||
        !draft.description?.trim() ||
        !this.isValidStationType(draft.type) ||
        typeof draft.points !== 'number' ||
        draft.points <= 0 ||
        !parsedTimeLimit.ok ||
        (draft.type === 'quiz' && !normalizedQuiz) ||
        (requiresCompletionCode &&
          !/^[A-Z0-9-]{3,32}$/.test(normalizedCompletionCode)) ||
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
        completionCode: requiresCompletionCode
          ? normalizedCompletionCode
          : undefined,
        quiz: normalizedQuiz,
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
    const publicJoinCode = this.resolvePublicJoinCode(
      realization.id,
      realization.joinCode,
    );

    return buildRealizationEntity({
      realization: {
        ...realization,
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

  private generateJoinCode(realizationId: string, attempt: number) {
    const seed = `${realizationId}:${attempt}:${this.getJoinCodePepper()}`;
    const hash = this.hashJoinCode(seed);
    const bytes = Buffer.from(hash, 'hex');
    let code = '';

    for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
      code += JOIN_CODE_ALPHABET[bytes[index] % JOIN_CODE_ALPHABET.length];
    }

    return code;
  }

  private hashJoinCode(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private getJoinCodePepper() {
    return process.env.JOIN_CODE_PEPPER?.trim() || 'survivorquest-join-code';
  }

  private parseStoredJoinCode(stored: string) {
    const normalized = stored.trim();
    const parts = normalized.split(':');

    if (
      parts.length === 3 &&
      parts[0] === STORED_JOIN_CODE_VERSION_PREFIX &&
      /^\d+$/.test(parts[1]) &&
      /^[a-f0-9]{64}$/i.test(parts[2])
    ) {
      return {
        attempt: Number(parts[1]),
        hash: parts[2].toLowerCase(),
      };
    }

    return null;
  }

  private async createUniqueJoinCode(realizationId: string) {
    let attempt = 0;

    while (attempt < 100) {
      const publicCode = this.generateJoinCode(realizationId, attempt);
      const hashedCode = this.hashJoinCode(publicCode);
      const storedCode = `${STORED_JOIN_CODE_VERSION_PREFIX}:${attempt}:${hashedCode}`;

      const existing = await this.prisma.realization.findFirst({
        where: {
          OR: [
            { joinCode: storedCode },
            { joinCode: publicCode },
            { joinCode: hashedCode },
            { joinCode: { endsWith: `:${hashedCode}` } },
          ],
        },
        select: { id: true },
      });

      if (!existing) {
        return {
          publicCode,
          storedCode,
        };
      }

      attempt += 1;
    }

    throw new BadRequestException('Failed to generate unique join code');
  }

  resolvePublicJoinCode(realizationId: string, storedJoinCode: string) {
    const parsed = this.parseStoredJoinCode(storedJoinCode);
    if (!parsed) {
      return storedJoinCode;
    }

    const publicCode = this.generateJoinCode(realizationId, parsed.attempt);
    const publicCodeHash = this.hashJoinCode(publicCode);

    if (publicCodeHash === parsed.hash) {
      return publicCode;
    }

    return '------';
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

  private normalizeStationQuizDraft(
    quiz: StationQuiz | undefined,
    stationType: StationType | undefined,
  ): StationQuiz | undefined {
    if (stationType !== 'quiz') {
      return undefined;
    }

    if (!quiz) {
      return undefined;
    }

    const question = quiz.question?.trim();
    const answers = quiz.answers?.map((answer) => answer.trim());
    const correctAnswerIndex = Math.round(quiz.correctAnswerIndex);

    if (
      typeof question !== 'string' ||
      !question ||
      !Array.isArray(answers) ||
      answers.length !== QUIZ_ANSWER_COUNT ||
      answers.some((answer) => !answer) ||
      !Number.isInteger(correctAnswerIndex) ||
      correctAnswerIndex < 0 ||
      correctAnswerIndex >= QUIZ_ANSWER_COUNT
    ) {
      return undefined;
    }

    return {
      question,
      answers: [answers[0], answers[1], answers[2], answers[3]],
      correctAnswerIndex,
    };
  }
}
