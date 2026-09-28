import type { PrismaService } from '../../prisma/prisma.service';
import type { StationService } from '../station/station.service';
import { ScenarioService } from './scenario.service';

function scenarioRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'scenario-1',
    name: 'Sprawa Lokatora',
    description: '',
    introText: null,
    gameRules: null,
    categories: ['Kryminalny'],
    sourceTemplateId: null,
    realizationId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    scenarioStations: [{ stationId: 'station-1' }],
    ...overrides,
  };
}

describe('ScenarioService — categories', () => {
  it('zwraca tagi scenariusza na liście', async () => {
    const prisma = {
      scenario: { findMany: jest.fn().mockResolvedValue([scenarioRow()]) },
    };
    const service = new ScenarioService(
      prisma as unknown as PrismaService,
      {} as StationService,
    );

    const [scenario] = await service.listScenarios();

    expect(scenario.categories).toEqual(['Kryminalny']);
  });

  it('przenosi tagi na kopię scenariusza w realizacji', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      scenario: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(scenarioRow())
          .mockResolvedValueOnce(
            scenarioRow({ id: 'clone', realizationId: 'realization-1' }),
          ),
        create,
      },
    };
    const stationService = {
      cloneStationsForScenario: jest
        .fn()
        .mockResolvedValue([{ id: 'cloned-station-1' }]),
    };
    const service = new ScenarioService(
      prisma as unknown as PrismaService,
      stationService as unknown as StationService,
    );

    await service.cloneScenario('scenario-1', {
      realizationId: 'realization-1',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categories: ['Kryminalny'] }),
      }),
    );
  });
});
