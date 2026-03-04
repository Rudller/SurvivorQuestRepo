import { Injectable } from '@nestjs/common';
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
  private scenarios: ScenarioEntity[] = this.createInitialScenarios();

  constructor(private readonly stationService: StationService) {}

  listScenarios() {
    return this.scenarios;
  }

  findScenarioById(id: string) {
    return this.scenarios.find((scenario) => scenario.id === id) || null;
  }

  addScenario(scenario: ScenarioEntity) {
    this.scenarios = [scenario, ...this.scenarios];
    return scenario;
  }

  replaceScenario(updatedScenario: ScenarioEntity) {
    this.scenarios = this.scenarios.map((scenario) =>
      scenario.id === updatedScenario.id ? updatedScenario : scenario,
    );
    return updatedScenario;
  }

  removeScenario(id: string) {
    this.scenarios = this.scenarios.filter((scenario) => scenario.id !== id);
  }

  cloneScenario(
    sourceId: string,
    options?: { realizationId?: string },
  ): ScenarioEntity | null {
    const source = this.findScenarioById(sourceId);

    if (!source) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const clonedScenarioId = crypto.randomUUID();
    const clonedStations = this.stationService.cloneStationsForScenario(
      source.stationIds,
      {
        scenarioInstanceId: clonedScenarioId,
        realizationId: options?.realizationId,
      },
    );

    const cloned: ScenarioEntity = {
      id: clonedScenarioId,
      name: source.name,
      description: source.description,
      stationIds: clonedStations.map((station) => station.id),
      sourceTemplateId: source.sourceTemplateId ?? source.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.scenarios = [cloned, ...this.scenarios];
    return cloned;
  }

  private createInitialScenarios() {
    const now = new Date().toISOString();

    return [
      {
        id: 's-1',
        name: 'Scenariusz integracyjny',
        description:
          'Wariant bazowy z trzema stanowiskami terenowymi i jednym quizem końcowym.',
        stationIds: ['g-1', 'g-2', 'g-4'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 's-2',
        name: 'Scenariusz nocny',
        description:
          'Krótki scenariusz dla mniejszej grupy, nacisk na reakcję kryzysową.',
        stationIds: ['g-4', 'g-5'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 's-3',
        name: 'Scenariusz terenowy',
        description:
          'Dłuższy wariant terenowy z orientacją i zadaniami współpracy.',
        stationIds: ['g-2', 'g-3'],
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
