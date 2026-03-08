import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StationService } from '../station/station.service';

export type ScenarioKind = 'template' | 'realization-instance';

export type ScenarioEntity = {
  id: string;
  name: string;
  description: string;
  stationIds: string[];
  sourceTemplateId?: string;
  realizationId?: string;
  kind: ScenarioKind;
  isTemplate: boolean;
  isInstance: boolean;
  createdAt: string;
  updatedAt: string;
};

function deriveScenarioKind(input: {
  sourceTemplateId: string | null;
  realizationId: string | null;
}): ScenarioKind {
  if (input.realizationId || input.sourceTemplateId) {
    return 'realization-instance';
  }

  return 'template';
}

function mapScenario(input: {
  id: string;
  name: string;
  description: string;
  sourceTemplateId: string | null;
  realizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  scenarioStations: Array<{ stationId: string }>;
}): ScenarioEntity {
  const kind = deriveScenarioKind(input);

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    stationIds: input.scenarioStations.map((item) => item.stationId),
    sourceTemplateId: input.sourceTemplateId || undefined,
    realizationId: input.realizationId || undefined,
    kind,
    isTemplate: kind === 'template',
    isInstance: kind !== 'template',
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

@Injectable()
export class ScenarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stationService: StationService,
  ) {}

  async listScenarios() {
    const scenarios = await this.prisma.scenario.findMany({
      include: {
        scenarioStations: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return scenarios.map((scenario) => mapScenario(scenario));
  }

  async findScenarioById(id: string) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id },
      include: {
        scenarioStations: { orderBy: { order: 'asc' } },
      },
    });

    if (!scenario) {
      return null;
    }

    return mapScenario(scenario);
  }

  async addScenario(scenario: ScenarioEntity) {
    await this.prisma.scenario.create({
      data: {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        sourceTemplateId: scenario.sourceTemplateId,
        realizationId: scenario.realizationId,
        scenarioStations: {
          create: scenario.stationIds.map((stationId, index) => ({
            stationId,
            order: index + 1,
          })),
        },
      },
    });

    const created = await this.findScenarioById(scenario.id);
    if (!created) {
      throw new Error('Failed to create scenario');
    }

    return created;
  }

  async replaceScenario(updatedScenario: ScenarioEntity) {
    await this.prisma.$transaction([
      this.prisma.scenario.update({
        where: { id: updatedScenario.id },
        data: {
          name: updatedScenario.name,
          description: updatedScenario.description,
          sourceTemplateId: updatedScenario.sourceTemplateId,
        },
      }),
      this.prisma.scenarioStation.deleteMany({
        where: { scenarioId: updatedScenario.id },
      }),
      this.prisma.scenarioStation.createMany({
        data: updatedScenario.stationIds.map((stationId, index) => ({
          scenarioId: updatedScenario.id,
          stationId,
          order: index + 1,
        })),
      }),
    ]);

    const updated = await this.findScenarioById(updatedScenario.id);
    if (!updated) {
      throw new Error('Failed to update scenario');
    }

    return updated;
  }

  async removeScenario(id: string) {
    await this.prisma.scenario.delete({ where: { id } });
  }

  async cloneScenario(
    sourceId: string,
    options?: { realizationId?: string },
  ): Promise<ScenarioEntity | null> {
    const source = await this.findScenarioById(sourceId);

    if (!source) {
      return null;
    }

    const clonedScenarioId = crypto.randomUUID();
    const clonedStations = await this.stationService.cloneStationsForScenario(
      source.stationIds,
      {
        scenarioInstanceId: clonedScenarioId,
        realizationId: options?.realizationId,
      },
    );

    return this.addScenario({
      id: clonedScenarioId,
      name: source.name,
      description: source.description,
      stationIds: clonedStations.map((station) => station.id),
      sourceTemplateId: source.sourceTemplateId ?? source.id,
      realizationId: options?.realizationId,
      kind: 'realization-instance',
      isTemplate: false,
      isInstance: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
