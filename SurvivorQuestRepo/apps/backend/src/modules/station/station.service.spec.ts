import { Prisma } from '@prisma/client';
import { StationService } from './station.service';

function createService() {
  const prisma = {
    station: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const service = new StationService(prisma as never);
  return { service, prisma };
}

const baseSourceRow = {
  id: 'source-1',
  name: 'Stanowisko',
  type: 'QUIZ',
  categories: [],
  description: 'Opis',
  imageUrl: null,
  points: 100,
  timeLimitSeconds: 0,
  completionCode: null,
  qrEntryCode: 'K3M9QXZ7',
  qrScanCodes: [],
  quizData: null,
  translations: null,
  challengeDifficultyMode: 'admin',
  challengeDifficulty: 'medium',
  completionStopwatchEnabled: false,
  fastestCompletionBonusPoints: 0,
  color: '#f59e0b',
  latitude: null,
  longitude: null,
  sourceTemplateId: null,
  scenarioInstanceId: null,
  realizationId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('StationService.cloneStationsForScenario', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('copies the source qrEntryCode forward onto the cloned row, unchanged', async () => {
    const { service, prisma } = createService();
    prisma.station.findMany.mockResolvedValue([baseSourceRow]);
    prisma.station.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseSourceRow, id: 'cloned-1', ...data }),
    );

    const [cloned] = await service.cloneStationsForScenario(['source-1'], {
      scenarioInstanceId: 'scenario-instance-1',
      realizationId: 'realization-1',
    });

    expect(prisma.station.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qrEntryCode: 'K3M9QXZ7' }),
      }),
    );
    expect(cloned.qrEntryCode).toBe('K3M9QXZ7');
  });

  it('falls back to a freshly generated code when the copied one collides within the same realization', async () => {
    const { service, prisma } = createService();
    prisma.station.findMany.mockResolvedValue([baseSourceRow]);

    let callCount = 0;
    prisma.station.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              {
                code: 'P2002',
                clientVersion: 'test',
                meta: { target: ['realizationId', 'qrEntryCode'] },
              },
            ),
          );
        }
        return Promise.resolve({ ...baseSourceRow, id: 'cloned-1', ...data });
      },
    );

    const [cloned] = await service.cloneStationsForScenario(['source-1'], {
      realizationId: 'realization-1',
    });

    expect(prisma.station.create).toHaveBeenCalledTimes(2);
    expect(cloned.qrEntryCode).not.toBe('K3M9QXZ7');
    expect(cloned.qrEntryCode).toMatch(
      /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/,
    );
  });

  it('clones a codeless template as codeless, without inventing a random code', async () => {
    const { service, prisma } = createService();
    prisma.station.findMany.mockResolvedValue([
      { ...baseSourceRow, qrEntryCode: null },
    ]);
    prisma.station.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseSourceRow, id: 'cloned-1', ...data }),
    );

    const [cloned] = await service.cloneStationsForScenario(['source-1'], {
      scenarioInstanceId: 'scenario-instance-1',
      realizationId: 'realization-1',
    });

    expect(prisma.station.create).toHaveBeenCalledTimes(1);
    expect(prisma.station.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qrEntryCode: null }),
      }),
    );
    expect(cloned.qrEntryCode).toBeUndefined();
  });
});

describe('StationService.createScenarioStationInstance', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('honors an admin-provided qrEntryCode as the preferred code', async () => {
    const { service, prisma } = createService();
    prisma.station.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseSourceRow, id: 'new-1', ...data }),
    );

    const created = await service.createScenarioStationInstance(
      {
        name: 'Nowe stanowisko',
        type: 'photo-task',
        description: 'Opis',
        points: 100,
        timeLimitSeconds: 0,
        qrEntryCode: 'custom-code',
      },
      {
        scenarioInstanceId: 'scenario-instance-1',
        realizationId: 'realization-1',
      },
    );

    expect(prisma.station.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qrEntryCode: 'CUSTOM-CODE' }),
      }),
    );
    expect(created.qrEntryCode).toBe('CUSTOM-CODE');
  });

  it('leaves qrEntryCode null instead of inventing one when none is provided', async () => {
    const { service, prisma } = createService();
    prisma.station.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseSourceRow, id: 'new-1', ...data }),
    );

    const created = await service.createScenarioStationInstance(
      {
        name: 'Nowe stanowisko',
        type: 'photo-task',
        description: 'Opis',
        points: 100,
        timeLimitSeconds: 0,
      },
      {
        scenarioInstanceId: 'scenario-instance-1',
        realizationId: 'realization-1',
      },
    );

    expect(prisma.station.create).toHaveBeenCalledTimes(1);
    expect(prisma.station.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qrEntryCode: null }),
      }),
    );
    expect(created.qrEntryCode).toBeUndefined();
  });
});

describe('StationService.updateScenarioStationInstance', () => {
  function createServiceWithUpdate() {
    const prisma = {
      station: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const service = new StationService(prisma as never);
    return { service, prisma };
  }

  const baseCurrentRow = {
    ...baseSourceRow,
    id: 'station-1',
    qrEntryCode: 'EXISTING1',
    realizationId: 'realization-1',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves the existing qrEntryCode when the input leaves it blank', async () => {
    const { service, prisma } = createServiceWithUpdate();
    prisma.station.findUnique.mockResolvedValue(baseCurrentRow);
    prisma.station.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        const definedData = Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        );
        return Promise.resolve({ ...baseCurrentRow, ...definedData });
      },
    );

    const updated = await service.updateScenarioStationInstance('station-1', {
      name: 'Stanowisko',
      type: 'photo-task',
      description: 'Opis',
      points: 100,
      timeLimitSeconds: 0,
    });

    expect(
      prisma.station.update.mock.calls[0][0].data.qrEntryCode,
    ).toBeUndefined();
    expect(updated?.qrEntryCode).toBe('EXISTING1');
  });

  it('falls back to a freshly generated code when the requested one collides, instead of throwing', async () => {
    const { service, prisma } = createServiceWithUpdate();
    prisma.station.findUnique.mockResolvedValue(baseCurrentRow);
    prisma.station.update
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['realizationId', 'qrEntryCode'] },
        }),
      )
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseCurrentRow, ...data }),
      );

    const updated = await service.updateScenarioStationInstance('station-1', {
      name: 'Stanowisko',
      type: 'photo-task',
      description: 'Opis',
      points: 100,
      timeLimitSeconds: 0,
      qrEntryCode: 'DUPLICATE',
    });

    expect(prisma.station.update).toHaveBeenCalledTimes(2);
    expect(updated?.qrEntryCode).not.toBe('DUPLICATE');
  });

  it('throws a friendly conflict error when the new code is already used in the same realization', async () => {
    const { service, prisma } = createServiceWithUpdate();
    prisma.station.findUnique.mockResolvedValue(baseCurrentRow);
    prisma.station.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['realizationId', 'qrEntryCode'] },
      }),
    );

    await expect(
      service.updateScenarioStationInstance('station-1', {
        name: 'Stanowisko',
        type: 'photo-task',
        description: 'Opis',
        points: 100,
        timeLimitSeconds: 0,
        qrEntryCode: 'DUPLICATE',
      }),
    ).rejects.toThrow(
      'Ten kod QR jest już używany przez inne stanowisko w tej realizacji.',
    );
  });
});

// PUT /station is the only route that can rewrite a Ryzykanci pool task: a
// realization's deck clones live outside the template library, so refusing them
// here left the deck editor's "Edytuj" saving into a 404.
describe('StationService.isEditableStation', () => {
  const station = {
    id: 'station-1',
    kind: 'template' as const,
    scenarioInstanceId: undefined,
    realizationId: undefined,
  };

  it('accepts a template station', () => {
    const { service } = createService();
    expect(service.isEditableStation(station as never)).toBe(true);
  });

  it("accepts a realization's risk-pool clone (no scenarioInstanceId)", () => {
    const { service } = createService();
    expect(
      service.isEditableStation({
        ...station,
        kind: 'realization-instance',
        realizationId: 'realization-1',
      } as never),
    ).toBe(true);
  });

  it('still refuses a scenario instance, which the realization save path owns', () => {
    const { service } = createService();
    expect(
      service.isEditableStation({
        ...station,
        kind: 'realization-instance',
        realizationId: 'realization-1',
        scenarioInstanceId: 'scenario-instance-1',
      } as never),
    ).toBe(false);
  });
});
