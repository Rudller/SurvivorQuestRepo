import { RealizationService } from './realization.service';
import type { ScenarioEntity } from '../scenario/scenario.service';
import type { StationEntity } from '../station/station.service';
import type { ScenarioStationDraftPayload } from './entities/realization.entity';

type SyncScenarioStations = (
  realizationId: string,
  scenario: ScenarioEntity,
  drafts: ScenarioStationDraftPayload[] | undefined,
) => Promise<StationEntity[]>;

function syncScenarioStations(
  service: RealizationService,
  ...args: Parameters<SyncScenarioStations>
) {
  return (
    service as unknown as { syncScenarioStations: SyncScenarioStations }
  ).syncScenarioStations(...args);
}

function createServiceWithStationDouble(
  currentStations: StationEntity[],
  overrides?: {
    createScenarioStationInstance?: jest.Mock;
    updateScenarioStationInstance?: jest.Mock;
  },
) {
  const stationService = {
    findStationsByIds: jest.fn().mockResolvedValue(currentStations),
    parseTimeLimitSeconds: jest.fn(() => ({ ok: true, value: 0 })),
    createScenarioStationInstance:
      overrides?.createScenarioStationInstance ??
      jest
        .fn()
        .mockImplementation(
          (input: { name: string; type: string; qrEntryCode?: string }) =>
            Promise.resolve({
              id: 'new-station',
              name: input.name,
              type: input.type,
              qrEntryCode: input.qrEntryCode,
            } as StationEntity),
        ),
    updateScenarioStationInstance:
      overrides?.updateScenarioStationInstance ??
      jest
        .fn()
        .mockImplementation(
          (id: string, input: { name: string; type: string }) =>
            Promise.resolve({
              id,
              name: input.name,
              type: input.type,
              qrEntryCode: 'unchanged',
            } as StationEntity),
        ),
    removeStationsByIds: jest.fn().mockResolvedValue(undefined),
  };

  const scenarioService = {
    replaceScenario: jest.fn().mockResolvedValue(undefined),
  };

  const service = new RealizationService(
    {} as never,
    scenarioService as never,
    stationService as never,
    {} as never,
    {} as never,
  );

  return { service, stationService, scenarioService };
}

const baseScenario: ScenarioEntity = {
  id: 'scenario-instance-1',
  name: 'Scenariusz',
  description: '',
  introText: '',
  gameRules: '',
  stationIds: ['cloned-station-1'],
  sourceTemplateId: undefined,
  realizationId: 'realization-1',
  kind: 'realization-instance',
  isTemplate: false,
  isInstance: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('RealizationService.syncScenarioStations', () => {
  it('reuses the freshly cloned station via sourceTemplateId when the draft id is the template id', async () => {
    // On realization creation, drafts come from the scenario TEMPLATE
    // (draft.id = template station id), while `currentStations` are the
    // just-cloned scenario-instance rows with brand-new ids. Matching must
    // fall back to sourceTemplateId so the clone (which already carries the
    // correct qrEntryCode) gets updated in place instead of duplicated.
    const clonedStation = {
      id: 'cloned-station-1',
      sourceTemplateId: 'template-station-1',
      qrEntryCode: 'MODUL-20',
    } as StationEntity;

    const { service, stationService, scenarioService } =
      createServiceWithStationDouble([clonedStation]);

    const drafts: ScenarioStationDraftPayload[] = [
      {
        id: 'template-station-1',
        name: 'Modul 20',
        type: 'photo-task',
        qrEntryCode: 'MODUL-20',
        points: 100,
        timeLimitSeconds: 0,
      },
    ];

    const result = await syncScenarioStations(
      service,
      'realization-1',
      baseScenario,
      drafts,
    );

    expect(stationService.createScenarioStationInstance).not.toHaveBeenCalled();
    expect(stationService.updateScenarioStationInstance).toHaveBeenCalledWith(
      'cloned-station-1',
      expect.objectContaining({ qrEntryCode: 'MODUL-20' }),
    );
    expect(stationService.removeStationsByIds).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(scenarioService.replaceScenario).toHaveBeenCalled();
  });

  it('pairs repeated uses of the same template with cloned stations in order', async () => {
    const clonedStations = [
      {
        id: 'cloned-a',
        sourceTemplateId: 'template-1',
        qrEntryCode: 'CODE-A',
      },
      {
        id: 'cloned-b',
        sourceTemplateId: 'template-1',
        qrEntryCode: 'CODE-B',
      },
    ] as StationEntity[];

    const { service, stationService } =
      createServiceWithStationDouble(clonedStations);

    const drafts: ScenarioStationDraftPayload[] = [
      {
        id: 'template-1',
        name: 'First',
        type: 'photo-task',
        points: 100,
        timeLimitSeconds: 0,
      },
      {
        id: 'template-1',
        name: 'Second',
        type: 'photo-task',
        points: 100,
        timeLimitSeconds: 0,
      },
    ];

    await syncScenarioStations(
      service,
      'realization-1',
      { ...baseScenario, stationIds: ['cloned-a', 'cloned-b'] },
      drafts,
    );

    expect(stationService.createScenarioStationInstance).not.toHaveBeenCalled();
    expect(
      stationService.updateScenarioStationInstance,
    ).toHaveBeenNthCalledWith(1, 'cloned-a', expect.anything());
    expect(
      stationService.updateScenarioStationInstance,
    ).toHaveBeenNthCalledWith(2, 'cloned-b', expect.anything());
  });

  it('still creates a new station when no clone matches by id or sourceTemplateId', async () => {
    const { service, stationService } = createServiceWithStationDouble([]);

    const drafts: ScenarioStationDraftPayload[] = [
      {
        name: 'Brand new',
        type: 'photo-task',
        points: 100,
        timeLimitSeconds: 0,
      },
    ];

    await syncScenarioStations(
      service,
      'realization-1',
      { ...baseScenario, stationIds: [] },
      drafts,
    );

    expect(stationService.createScenarioStationInstance).toHaveBeenCalledTimes(
      1,
    );
    expect(stationService.updateScenarioStationInstance).not.toHaveBeenCalled();
  });
});
