import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StationService } from '../station/station.service';

export type ScenarioEntity = {
  id: string;
  name: string;
  description: string;
  stationIds: string[];
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};

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

    return scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      stationIds: scenario.scenarioStations.map((item) => item.stationId),
      sourceTemplateId: scenario.sourceTemplateId || undefined,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    }));
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

    return {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      stationIds: scenario.scenarioStations.map((item) => item.stationId),
      sourceTemplateId: scenario.sourceTemplateId || undefined,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    };
  }

  async addScenario(scenario: ScenarioEntity) {
    await this.prisma.scenario.create({
      data: {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        sourceTemplateId: scenario.sourceTemplateId,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
