import { EventActorType, TeamStatus } from '@prisma/client';
import { MobileService } from './mobile.service';
import { BadRequestException } from '@nestjs/common';

describe('MobileService team selection', () => {
  function createService() {
    const prisma = {
      team: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      teamAssignment: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      eventLog: {
        create: jest.fn(),
      },
    };

    const service = new MobileService(
      prisma as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  it('replaces another active device assignment when selecting the same team', async () => {
    const { service, prisma } = createService();

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: {
        id: 'assignment-self',
        deviceId: 'device-new',
      },
      team: {
        id: 'team-1',
        slotNumber: 1,
        color: 'red',
      },
      realization: {
        id: 'realization-1',
      },
    });

    prisma.team.findFirst.mockResolvedValue({
      id: 'team-2',
      slotNumber: 2,
      name: 'Drużyna 2',
      color: null,
      badgeKey: null,
      points: 0,
    });
    prisma.teamAssignment.findMany.mockResolvedValue([
      { id: 'assignment-old' },
    ]);
    prisma.team.findMany.mockResolvedValueOnce([
      { slotNumber: 1, color: 'red', badgeKey: 'beaver-01' },
      { slotNumber: 2, color: null, badgeKey: null },
    ]);

    const result = await service.selectMobileTeam({
      sessionToken: 'token',
      slotNumber: 2,
    });

    expect(prisma.teamAssignment.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['assignment-old'] } },
    });
    expect(prisma.teamAssignment.update).toHaveBeenCalled();
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { status: TeamStatus.UNASSIGNED },
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-2' },
      data: { status: TeamStatus.ACTIVE },
    });
    expect(result.reassignment).toEqual({
      replacedExistingAssignment: true,
      replacedAssignments: 1,
      message:
        'Team was already selected on another device. Assignment was switched to this device.',
    });
    expect(result.team.color).toBeNull();
    expect(result.customizationOccupancy).toEqual({
      colors: { red: 1 },
      icons: { '🦫': 1 },
    });
  });

  it('rejects claim when payload color is missing', async () => {
    const { service, prisma } = createService();

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: {
        id: 'assignment-self',
        deviceId: 'device-1',
      },
      team: {
        id: 'team-1',
        slotNumber: 1,
        name: null,
        color: null,
        badgeKey: null,
        badgeImageUrl: null,
      },
      realization: {
        id: 'realization-1',
      },
    });

    await expect(
      service.claimMobileTeam({
        sessionToken: 'token',
        name: 'Nowa Drużyna',
        color: '',
        badgeKey: 'fox-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.team.findMany).not.toHaveBeenCalled();
    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(prisma.eventLog.create).not.toHaveBeenCalled();
  });
});

describe('MobileService join session', () => {
  function createService() {
    const prisma = {
      realization: {
        findMany: jest.fn(),
      },
      team: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      teamAssignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      eventLog: {
        create: jest.fn(),
      },
    };

    const realizationService = {
      listRealizations: jest.fn(),
    };

    const service = new MobileService(
      prisma as never,
      realizationService as never,
      {} as never,
    );
    return { service, prisma, realizationService };
  }

  it('reuses previously assigned team for the same device after assignment expiry', async () => {
    const { service, prisma, realizationService } = createService();

    realizationService.listRealizations.mockResolvedValue([
      {
        id: 'realization-1',
        companyName: 'Firma',
        introText: null,
        gameRules: null,
        status: 'in-progress',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 120,
        locationRequired: true,
        joinCode: 'JOIN01',
        teamCount: 2,
        stationIds: ['s-1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    prisma.realization.findMany.mockResolvedValue([
      {
        id: 'realization-1',
        locationRequired: true,
      },
    ]);

    jest
      .spyOn(service as never, 'ensureTeamsForRealization')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as never, 'getCustomizationOccupancyByRealization')
      .mockResolvedValue({ colors: {}, icons: {} });
    jest
      .spyOn(service as never, 'generateSessionToken')
      .mockReturnValue('mob_test_token');

    prisma.teamAssignment.findFirst.mockResolvedValue({
      id: 'expired-assignment',
      teamId: 'team-2',
      realizationId: 'realization-1',
      deviceId: 'device-1',
      expiresAt: new Date(Date.now() - 60_000),
      team: {
        id: 'team-2',
        slotNumber: 2,
        name: 'Drużyna 2',
        color: 'amber',
        badgeKey: '🦊',
        points: 30,
      },
    });

    prisma.team.findMany.mockResolvedValue([
      {
        id: 'team-1',
        slotNumber: 1,
        name: 'Drużyna 1',
        color: null,
        badgeKey: null,
        points: 0,
      },
      {
        id: 'team-2',
        slotNumber: 2,
        name: 'Drużyna 2',
        color: 'amber',
        badgeKey: '🦊',
        points: 30,
      },
    ]);
    prisma.teamAssignment.findMany.mockResolvedValue([]);
    prisma.teamAssignment.deleteMany.mockResolvedValue({ count: 1 });
    prisma.teamAssignment.create.mockResolvedValue({
      id: 'new-assignment',
      memberName: 'Użytkownik mobilny',
    });

    const result = await service.joinMobileSession({
      joinCode: 'JOIN01',
      deviceId: 'device-1',
      memberName: 'Użytkownik mobilny',
    });

    expect(prisma.teamAssignment.deleteMany).toHaveBeenCalledWith({
      where: {
        realizationId: 'realization-1',
        deviceId: 'device-1',
      },
    });
    expect(prisma.teamAssignment.create).toHaveBeenCalled();
    const createPayload = prisma.teamAssignment.create.mock.calls[0][0];
    expect(createPayload.data.teamId).toBe('team-2');
    expect(result.team.slotNumber).toBe(2);
  });
});

describe('MobileService failed task snapshots', () => {
  function createService() {
    const prisma = {
      eventLog: {
        findMany: jest.fn(),
      },
    };

    const service = new MobileService(
      prisma as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  it('ignores outcomes older than completed tasks reset', async () => {
    const { service, prisma } = createService();
    prisma.eventLog.findMany.mockResolvedValue([
      {
        eventType: 'task_failed',
        payload: { stationId: 'station-after-reset' },
      },
      {
        eventType: 'completed_tasks_reset',
        payload: { resetCount: 3 },
      },
      {
        eventType: 'task_failed',
        payload: { stationId: 'station-before-reset' },
      },
    ]);

    const failedStationIds = await (service as never).getFailedTaskStationIds({
      realizationId: 'realization-1',
      teamId: 'team-1',
    });

    expect([...failedStationIds]).toEqual(['station-after-reset']);
    expect(prisma.eventLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          realizationId: 'realization-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ teamId: 'team-1' }),
            expect.objectContaining({ teamId: null }),
          ]),
        }),
      }),
    );
  });

  it('clears failed outcomes after realization reset', async () => {
    const { service, prisma } = createService();
    prisma.eventLog.findMany.mockResolvedValue([
      {
        eventType: 'realization_reset',
        payload: { resetAt: new Date().toISOString() },
      },
      {
        eventType: 'task_failed',
        payload: { stationId: 'station-before-reset' },
      },
    ]);

    const failedStationIds = await (service as never).getFailedTaskStationIds({
      realizationId: 'realization-1',
      teamId: 'team-1',
    });

    expect([...failedStationIds]).toEqual([]);
  });
});

describe('MobileService current realization resolver', () => {
  function createService() {
    return new MobileService({} as never, {} as never, {} as never);
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefers in-progress realization over planned ones', () => {
    const service = createService();
    const now = new Date('2026-04-08T12:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const result = (service as never).resolveCurrentMobileRealization([
      {
        id: 'planned-1',
        status: 'planned',
        scheduledAt: '2026-04-08T13:00:00.000Z',
      },
      {
        id: 'in-progress-1',
        status: 'in-progress',
        scheduledAt: '2026-04-07T10:00:00.000Z',
      },
      {
        id: 'planned-2',
        status: 'planned',
        scheduledAt: '2026-04-08T14:00:00.000Z',
      },
    ]);

    expect(result?.id).toBe('in-progress-1');
  });

  it('selects nearest upcoming planned realization when none is in progress', () => {
    const service = createService();
    const now = new Date('2026-04-08T12:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const result = (service as never).resolveCurrentMobileRealization([
      {
        id: 'planned-far-future',
        status: 'planned',
        scheduledAt: '2026-04-10T12:00:00.000Z',
      },
      {
        id: 'planned-nearest-upcoming',
        status: 'planned',
        scheduledAt: '2026-04-08T13:00:00.000Z',
      },
      {
        id: 'planned-past',
        status: 'planned',
        scheduledAt: '2026-04-08T08:00:00.000Z',
      },
    ]);

    expect(result?.id).toBe('planned-nearest-upcoming');
  });

  it('selects latest past planned realization when all planned are in the past', () => {
    const service = createService();
    const now = new Date('2026-04-08T12:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const result = (service as never).resolveCurrentMobileRealization([
      {
        id: 'planned-old',
        status: 'planned',
        scheduledAt: '2026-04-06T08:00:00.000Z',
      },
      {
        id: 'planned-most-recent-past',
        status: 'planned',
        scheduledAt: '2026-04-08T11:00:00.000Z',
      },
      {
        id: 'planned-mid',
        status: 'planned',
        scheduledAt: '2026-04-07T09:00:00.000Z',
      },
    ]);

    expect(result?.id).toBe('planned-most-recent-past');
  });
});
