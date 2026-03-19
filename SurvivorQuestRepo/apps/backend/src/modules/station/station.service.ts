import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StationType as PrismaStationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type StationType = 'quiz' | 'time' | 'points';
export type StationQuiz = {
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: number;
};

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
  completionCode?: string;
  quiz?: StationQuiz;
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
  completionCode?: string;
  quiz?: StationQuiz;
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

const COMPLETION_CODE_REGEX = /^[A-Z0-9-]{3,32}$/;
const QUIZ_ANSWER_COUNT = 4;

function toPrismaStationQuizData(quiz: StationQuiz | undefined) {
  if (!quiz) {
    return Prisma.DbNull;
  }

  return {
    question: quiz.question,
    answers: quiz.answers,
    correctAnswerIndex: quiz.correctAnswerIndex,
  } as Prisma.InputJsonValue;
}

function parseStationQuizData(
  quizData: Prisma.JsonValue | null,
): StationQuiz | undefined {
  if (!quizData || typeof quizData !== 'object' || Array.isArray(quizData)) {
    return undefined;
  }

  const payload = quizData as Record<string, unknown>;
  const question = payload.question;
  const answers = payload.answers;
  const correctAnswerIndex = payload.correctAnswerIndex;

  if (
    typeof question !== 'string' ||
    !Array.isArray(answers) ||
    answers.length !== QUIZ_ANSWER_COUNT ||
    !answers.every((answer) => typeof answer === 'string') ||
    typeof correctAnswerIndex !== 'number'
  ) {
    return undefined;
  }

  const normalizedQuestion = question.trim();
  const normalizedAnswers = answers.map((answer) => answer.trim());
  const normalizedCorrectAnswerIndex = Math.round(correctAnswerIndex);

  if (
    !normalizedQuestion ||
    normalizedAnswers.some((answer) => !answer) ||
    !Number.isInteger(normalizedCorrectAnswerIndex) ||
    normalizedCorrectAnswerIndex < 0 ||
    normalizedCorrectAnswerIndex >= QUIZ_ANSWER_COUNT
  ) {
    return undefined;
  }

  return {
    question: normalizedQuestion,
    answers: [
      normalizedAnswers[0],
      normalizedAnswers[1],
      normalizedAnswers[2],
      normalizedAnswers[3],
    ],
    correctAnswerIndex: normalizedCorrectAnswerIndex,
  };
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
  completionCode: string | null;
  quizData: Prisma.JsonValue | null;
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
    completionCode: input.completionCode || undefined,
    quiz: parseStationQuizData(input.quizData),
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
        completionCode: station.completionCode,
        quizData: toPrismaStationQuizData(station.quiz),
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
        completionCode: updatedStation.completionCode,
        quizData: toPrismaStationQuizData(updatedStation.quiz),
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
          completionCode: source.completionCode,
          quizData: toPrismaStationQuizData(source.quiz),
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
    const stationId = crypto.randomUUID();
    const normalized = this.normalizeStationDraft(input, stationId);

    const created = await this.prisma.station.create({
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
        completionCode: normalized.completionCode,
        quizData: toPrismaStationQuizData(normalized.quiz),
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
    const normalizedCompletionCode = this.normalizeCompletionCode(
      input.completionCode,
      input.type,
    );
    const normalizedQuiz = this.normalizeStationQuiz(input.quiz, input.type);

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
      completionCode: normalizedCompletionCode,
      quiz: normalizedQuiz,
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

  private normalizeStationQuiz(
    quiz: StationQuiz | undefined,
    stationType: StationType,
  ): StationQuiz | undefined {
    if (stationType !== 'quiz') {
      return undefined;
    }

    if (!quiz) {
      throw new BadRequestException('Invalid payload');
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
      throw new BadRequestException('Invalid payload');
    }

    return {
      question,
      answers: [answers[0], answers[1], answers[2], answers[3]],
      correctAnswerIndex,
    };
  }

  private normalizeCompletionCode(
    completionCode: string | undefined,
    stationType: StationType,
  ) {
    if (stationType === 'quiz') {
      return undefined;
    }

    const normalized = completionCode?.trim().toUpperCase() ?? '';
    if (!COMPLETION_CODE_REGEX.test(normalized)) {
      throw new BadRequestException('Invalid payload');
    }

    return normalized;
  }
}
