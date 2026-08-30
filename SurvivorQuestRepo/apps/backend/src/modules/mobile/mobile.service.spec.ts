import { Prisma, TaskStatus, TeamStatus } from '@prisma/client';
import { MobileService } from './mobile.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { resolveRealizationLanguageContext } from './domain/mobile-language.helpers';
import type { StationEntity } from '../station/station.service';

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

describe('MobileService remote station launch', () => {
  function createService() {
    const prisma = {
      team: { findUnique: jest.fn() },
      pendingStationLaunch: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const stationService = { findStationById: jest.fn() };
    const service = new MobileService(
      prisma as never,
      {} as never,
      stationService as never,
      {} as never,
    );
    return { service, prisma, stationService };
  }

  it('replaces an undelivered launch for the team', async () => {
    const { service, prisma, stationService } = createService();
    jest
      .spyOn(service as never, 'resolveMobileAdminRealizationOrThrow')
      .mockResolvedValue({
        id: 'realization-1',
        stationIds: ['station-1'],
      });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      name: 'Quiz',
      type: 'quiz',
    });
    prisma.pendingStationLaunch.upsert.mockResolvedValue({
      id: 'launch-1',
      teamId: 'team-1',
      stationId: 'station-1',
    });

    await service.triggerRemoteStationLaunch({
      realizationId: 'realization-1',
      teamId: 'team-1',
      stationId: 'station-1',
    });

    expect(prisma.pendingStationLaunch.upsert).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
      create: { teamId: 'team-1', stationId: 'station-1' },
      update: { stationId: 'station-1', createdAt: expect.any(Date) },
    });
  });

  it('delivers and atomically consumes a pending station launch', async () => {
    const { service, prisma, stationService } = createService();
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      team: { id: 'team-1' },
      realization: { id: 'realization-1', stationIds: ['station-1'] },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    prisma.pendingStationLaunch.findUnique.mockResolvedValue({
      id: 'launch-1',
      teamId: 'team-1',
      stationId: 'station-1',
    });
    prisma.pendingStationLaunch.deleteMany.mockResolvedValue({ count: 1 });
    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      name: 'Quiz',
      type: 'quiz',
    });

    await expect(service.pollPendingStationLaunch('token')).resolves.toEqual({
      launch: {
        stationId: 'station-1',
        stationName: 'Quiz',
        stationType: 'quiz',
      },
    });
    expect(prisma.pendingStationLaunch.deleteMany).toHaveBeenCalledWith({
      where: { id: 'launch-1', teamId: 'team-1' },
    });
  });

  it('does not deliver a launch consumed concurrently', async () => {
    const { service, prisma } = createService();
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      team: { id: 'team-1' },
      realization: { id: 'realization-1', stationIds: ['station-1'] },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    prisma.pendingStationLaunch.findUnique.mockResolvedValue({
      id: 'launch-1',
      teamId: 'team-1',
      stationId: 'station-1',
    });
    prisma.pendingStationLaunch.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.pollPendingStationLaunch('token')).resolves.toEqual({
      launch: null,
    });
  });
});

describe('MobileService team customization conflicts', () => {
  function createService() {
    const prisma = {
      team: {
        findMany: jest.fn(),
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

  it('maps unique color constraint races to a conflict response', async () => {
    const { service, prisma } = createService();

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: {
        id: 'assignment-1',
        deviceId: 'device-1',
      },
      team: {
        id: 'team-1',
        color: 'amber',
        badgeKey: '🦊',
      },
      realization: {
        id: 'realization-1',
      },
    });
    prisma.team.findMany.mockResolvedValue([]);
    prisma.team.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['realizationId', 'color'] },
      }),
    );

    await expect(
      service.updateMobileTeamCustomization({
        sessionToken: 'token',
        color: 'green',
      }),
    ).rejects.toThrow(new ConflictException('Team color already taken'));
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

describe('MobileService bootstrap', () => {
  function createService() {
    const prisma = {
      realization: {
        findMany: jest.fn(),
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

  it('does not expose realization join codes publicly', async () => {
    const { service, prisma, realizationService } = createService();

    realizationService.listRealizations.mockResolvedValue([
      {
        id: 'realization-1',
        companyName: 'Firma',
        language: 'polish',
        customLanguage: null,
        selectedLanguage: 'polish',
        availableLanguages: [{ value: 'polish', label: 'Polski' }],
        introText: null,
        gameRules: null,
        status: 'planned',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 120,
        joinCode: 'SECRET01',
        locationRequired: true,
        showLeaderboard: true,
        showLeaderboardDuringGame: true,
        showLeaderboardOnFinish: true,
        hideLeaderboardMinutesBeforeEnd: 0,
        teamStationNumberingEnabled: true,
        teamCount: 2,
        stationIds: ['station-1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    prisma.realization.findMany.mockResolvedValue([
      {
        id: 'realization-1',
        locationRequired: true,
        showLeaderboard: true,
        showLeaderboardDuringGame: true,
        showLeaderboardOnFinish: true,
        hideLeaderboardMinutesBeforeEnd: 0,
        teamStationNumberingEnabled: true,
      },
    ]);

    const result = await service.getMobileBootstrap();

    expect(result.realizations[0]).not.toHaveProperty('joinCode');
  });

  it('passes through a non-zero hideLeaderboardMinutesBeforeEnd unchanged', async () => {
    const { service, prisma, realizationService } = createService();

    realizationService.listRealizations.mockResolvedValue([
      {
        id: 'realization-2',
        companyName: 'Firma',
        language: 'polish',
        customLanguage: null,
        selectedLanguage: 'polish',
        availableLanguages: [{ value: 'polish', label: 'Polski' }],
        introText: null,
        gameRules: null,
        status: 'planned',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 120,
        joinCode: 'SECRET02',
        locationRequired: true,
        showLeaderboard: true,
        showLeaderboardDuringGame: true,
        showLeaderboardOnFinish: true,
        hideLeaderboardMinutesBeforeEnd: 5,
        teamStationNumberingEnabled: true,
        teamCount: 2,
        stationIds: ['station-1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    prisma.realization.findMany.mockResolvedValue([
      {
        id: 'realization-2',
        locationRequired: true,
        showLeaderboard: true,
        showLeaderboardDuringGame: true,
        showLeaderboardOnFinish: true,
        hideLeaderboardMinutesBeforeEnd: 5,
        teamStationNumberingEnabled: true,
      },
    ]);

    const result = await service.getMobileBootstrap();

    expect(result.realizations[0]).toHaveProperty(
      'hideLeaderboardMinutesBeforeEnd',
      5,
    );
  });
});

describe('MobileService task scoring', () => {
  function createService() {
    const prisma = {
      teamTaskProgress: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      teamStationScan: {
        create: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      team: {
        update: jest.fn(),
      },
      eventLog: {
        create: jest.fn(),
      },
    };
    const stationService = {
      findStationById: jest.fn(),
    };

    const service = new MobileService(
      prisma as never,
      {} as never,
      stationService as never,
    );

    return { service, prisma, stationService };
  }

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('scores timed tasks using mobile completion timestamps', async () => {
    const { service, prisma, stationService } = createService();
    const serverFinishedAt = new Date('2026-05-10T10:00:05.000Z');
    const mobileFinishedAt = new Date('2026-05-10T10:01:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(serverFinishedAt);

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: {
        deviceId: 'device-1',
      },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(40);

    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'time',
      completionCode: 'DONE1',
      points: 100,
      timeLimitSeconds: 100,
    });
    prisma.teamTaskProgress.findUnique.mockResolvedValue({
      id: 'progress-1',
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date('2026-05-10T10:00:00.000Z'),
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
      completionCode: 'DONE1',
      startedAt: '2026-05-10T10:00:59.000Z',
      finishedAt: '2026-05-10T10:01:00.000Z',
    });

    expect(result.pointsAwarded).toBe(40);
    expect(prisma.teamTaskProgress.update).toHaveBeenCalledWith({
      where: { id: 'progress-1' },
      data: expect.objectContaining({
        pointsAwarded: 40,
        finishedAt: mobileFinishedAt,
      }),
    });
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payload: expect.objectContaining({
          startedAt: '2026-05-10T10:00:00.000Z',
          finishedAt: '2026-05-10T10:01:00.000Z',
          scoring: expect.objectContaining({ elapsedSeconds: 60 }),
        }),
      }),
    });
  });

  it('scores any time-limited task when timed point decay is enabled', async () => {
    const { service, prisma, stationService } = createService();
    const serverFinishedAt = new Date('2026-05-10T10:00:25.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(serverFinishedAt);

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: true,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(75);

    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'quiz',
      completionCode: null,
      points: 100,
      timeLimitSeconds: 100,
    });
    prisma.teamTaskProgress.findUnique.mockResolvedValue({
      id: 'progress-1',
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date('2026-05-10T10:00:00.000Z'),
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(result.pointsAwarded).toBe(75);
    expect(result.taskStatus).toBe('done');
    expect(prisma.teamTaskProgress.update).toHaveBeenCalledWith({
      where: { id: 'progress-1' },
      data: expect.objectContaining({ pointsAwarded: 75 }),
    });
  });

  it('fails time-limited tasks after the limit when timed point decay is enabled', async () => {
    const { service, prisma, stationService } = createService();
    const serverFinishedAt = new Date('2026-05-10T10:01:40.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(serverFinishedAt);

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: true,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(0);

    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'quiz',
      completionCode: null,
      points: 100,
      timeLimitSeconds: 100,
    });
    prisma.teamTaskProgress.findUnique.mockResolvedValue({
      id: 'progress-1',
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date('2026-05-10T10:00:00.000Z'),
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(result.pointsAwarded).toBe(0);
    expect(result.taskStatus).toBe('failed');
    expect(prisma.teamTaskProgress.update).toHaveBeenCalledWith({
      where: { id: 'progress-1' },
      data: expect.objectContaining({ pointsAwarded: 0 }),
    });
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'task_failed',
        payload: expect.objectContaining({
          reason: 'time_limit_expired',
          scoring: expect.objectContaining({ mode: 'time-linear-expired' }),
        }),
      }),
    });
  });

  function mockBonusEligibleCompletion(
    prisma: ReturnType<typeof createService>['prisma'],
    stationService: ReturnType<typeof createService>['stationService'],
    service: ReturnType<typeof createService>['service'],
    overrides: {
      completionStopwatchEnabled?: boolean;
      timeLimitSeconds?: number;
      fastestCompletionBonusPoints?: number;
      otherTeamAlreadyDone?: boolean;
    } = {},
  ) {
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(0);

    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'boggle',
      completionCode: null,
      points: 50,
      timeLimitSeconds: overrides.timeLimitSeconds ?? 0,
      completionStopwatchEnabled: overrides.completionStopwatchEnabled ?? true,
      fastestCompletionBonusPoints:
        overrides.fastestCompletionBonusPoints ?? 15,
    });
    prisma.teamTaskProgress.findUnique.mockResolvedValue(null);
    prisma.teamTaskProgress.findFirst.mockResolvedValue(
      overrides.otherTeamAlreadyDone ? { id: 'other-progress' } : null,
    );
  }

  it('awards the fastest-completion bonus to the first team completing a stopwatch station', async () => {
    const { service, prisma, stationService } = createService();
    mockBonusEligibleCompletion(prisma, stationService, service);

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(prisma.teamTaskProgress.findFirst).toHaveBeenCalledWith({
      where: {
        realizationId: 'realization-1',
        stationId: 'station-1',
        status: TaskStatus.DONE,
        teamId: { not: 'team-1' },
      },
      select: { id: true },
    });
    expect(result.fastestBonusPoints).toBe(15);
    expect(result.pointsAwarded).toBe(65);
    expect(prisma.teamTaskProgress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pointsAwarded: 65 }),
      }),
    );
  });

  it('does not award the bonus to the second team completing the same stopwatch station', async () => {
    const { service, prisma, stationService } = createService();
    mockBonusEligibleCompletion(prisma, stationService, service, {
      otherTeamAlreadyDone: true,
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(result.fastestBonusPoints).toBe(0);
    expect(result.pointsAwarded).toBe(50);
  });

  it('does not award the bonus when completionStopwatchEnabled is false', async () => {
    const { service, prisma, stationService } = createService();
    mockBonusEligibleCompletion(prisma, stationService, service, {
      completionStopwatchEnabled: false,
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(prisma.teamTaskProgress.findFirst).not.toHaveBeenCalled();
    expect(result.fastestBonusPoints).toBe(0);
    expect(result.pointsAwarded).toBe(50);
  });

  it('does not award the bonus when fastestCompletionBonusPoints is 0', async () => {
    const { service, prisma, stationService } = createService();
    mockBonusEligibleCompletion(prisma, stationService, service, {
      fastestCompletionBonusPoints: 0,
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(prisma.teamTaskProgress.findFirst).not.toHaveBeenCalled();
    expect(result.fastestBonusPoints).toBe(0);
    expect(result.pointsAwarded).toBe(50);
  });

  it('does not award the bonus when timeLimitSeconds > 0 even if completionStopwatchEnabled is true', async () => {
    const { service, prisma, stationService } = createService();
    mockBonusEligibleCompletion(prisma, stationService, service, {
      timeLimitSeconds: 30,
    });

    const result = await service.completeMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(prisma.teamTaskProgress.findFirst).not.toHaveBeenCalled();
    expect(result.fastestBonusPoints).toBe(0);
    expect(result.pointsAwarded).toBe(50);
  });

  function mockQrHuntStation(
    prisma: ReturnType<typeof createService>['prisma'],
    stationService: ReturnType<typeof createService>['stationService'],
    service: ReturnType<typeof createService>['service'],
    overrides: {
      qrScanCodes?: string[];
      existingProgress?: {
        id: string;
        status: TaskStatus;
        startedAt: Date | null;
      } | null;
      scannedCountAfterInsert?: number;
    } = {},
  ) {
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(0);

    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'qr-hunt',
      completionCode: null,
      points: 50,
      timeLimitSeconds: 0,
      completionStopwatchEnabled: false,
      fastestCompletionBonusPoints: 0,
      qrScanCodes: overrides.qrScanCodes ?? ['CODE-A', 'CODE-B'],
    });

    prisma.teamTaskProgress.findUnique.mockResolvedValue(
      overrides.existingProgress === undefined
        ? null
        : overrides.existingProgress,
    );
    prisma.teamStationScan.create.mockResolvedValue({});
    prisma.teamTaskProgress.upsert.mockResolvedValue({
      id: 'progress-1',
      startedAt:
        overrides.existingProgress?.startedAt ??
        new Date('2026-05-10T10:00:00.000Z'),
    });
    prisma.teamStationScan.count.mockResolvedValue(
      overrides.scannedCountAfterInsert ?? 1,
    );
  }

  it('records the first valid QR scan and keeps the task in progress', async () => {
    const { service, prisma, stationService } = createService();
    mockQrHuntStation(prisma, stationService, service, {
      scannedCountAfterInsert: 1,
    });

    const result = await service.submitStationQrScan({
      sessionToken: 'session-token',
      stationId: 'station-1',
      code: 'code-a',
    });

    expect(prisma.teamStationScan.create).toHaveBeenCalledWith({
      data: {
        realizationId: 'realization-1',
        teamId: 'team-1',
        stationId: 'station-1',
        code: 'CODE-A',
      },
    });
    expect(result.taskStatus).toBe('in-progress');
    expect(result.scannedCount).toBe(1);
    expect(result.requiredCount).toBe(2);
    expect(result.duplicate).toBe(false);
    expect(prisma.teamTaskProgress.update).not.toHaveBeenCalled();
  });

  it('treats re-scanning an already-scanned code as an idempotent no-op', async () => {
    const { service, prisma, stationService } = createService();
    mockQrHuntStation(prisma, stationService, service, {
      scannedCountAfterInsert: 1,
    });
    prisma.teamStationScan.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['realizationId', 'teamId', 'stationId', 'code'] },
      }),
    );

    const result = await service.submitStationQrScan({
      sessionToken: 'session-token',
      stationId: 'station-1',
      code: 'CODE-A',
    });

    expect(result.taskStatus).toBe('in-progress');
    expect(result.scannedCount).toBe(1);
    expect(result.duplicate).toBe(true);
  });

  it('rejects a QR code that is not configured for the station', async () => {
    const { service, prisma, stationService } = createService();
    mockQrHuntStation(prisma, stationService, service);

    await expect(
      service.submitStationQrScan({
        sessionToken: 'session-token',
        stationId: 'station-1',
        code: 'WRONG-CODE',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.teamStationScan.create).not.toHaveBeenCalled();
  });

  it('completes a QR-hunt task once the last required code is scanned', async () => {
    const { service, prisma, stationService } = createService();
    mockQrHuntStation(prisma, stationService, service, {
      qrScanCodes: ['CODE-A'],
      scannedCountAfterInsert: 1,
    });

    const result = await service.submitStationQrScan({
      sessionToken: 'session-token',
      stationId: 'station-1',
      code: 'CODE-A',
    });

    expect(result.taskStatus).toBe('done');
    expect(result.pointsAwarded).toBe(50);
    expect(prisma.teamTaskProgress.update).toHaveBeenCalledWith({
      where: { id: 'progress-1' },
      data: expect.objectContaining({
        status: TaskStatus.DONE,
        pointsAwarded: 50,
      }),
    });
  });

  it('rejects task/complete calls made directly against a qr-hunt station', async () => {
    const { service, prisma, stationService } = createService();
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'qr-hunt',
      completionCode: null,
      points: 50,
      timeLimitSeconds: 0,
      qrScanCodes: ['CODE-A'],
    });

    await expect(
      service.completeMobileTask({
        sessionToken: 'session-token',
        stationId: 'station-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.teamTaskProgress.findUnique).not.toHaveBeenCalled();
  });

  it('rejects task/scan-code calls made against a non-qr-hunt station', async () => {
    const { service, stationService } = createService();
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'quiz',
      completionCode: null,
      points: 50,
      timeLimitSeconds: 0,
    });

    await expect(
      service.submitStationQrScan({
        sessionToken: 'session-token',
        stationId: 'station-1',
        code: 'CODE-A',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears qr-hunt scan history when an admin resets a task', async () => {
    const { service, prisma } = createService();

    jest
      .spyOn(service as never, 'resolveMobileAdminTeamTaskContext')
      .mockResolvedValue({
        realization: { id: 'realization-1', stationIds: ['station-1'] },
        team: { id: 'team-1' },
        station: { id: 'station-1', type: 'qr-hunt' },
        existingProgress: {
          id: 'progress-1',
          status: TaskStatus.IN_PROGRESS,
          pointsAwarded: 0,
        },
        stationId: 'station-1',
      });
    jest
      .spyOn(service as never, 'getFailedTaskStationIds')
      .mockResolvedValue(new Set());
    jest.spyOn(service as never, 'emitEvent').mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(0);

    const result = await service.resetMobileAdminTeamTask({
      realizationId: 'realization-1',
      teamId: 'team-1',
      stationId: 'station-1',
    });

    // qrScanCompletedCount is derived by counting TeamStationScan rows (see
    // session/state building), not stored on TeamTaskProgress — without this
    // deleteMany, a reset task kept showing its pre-reset scan count.
    expect(prisma.teamStationScan.deleteMany).toHaveBeenCalledWith({
      where: {
        realizationId: 'realization-1',
        teamId: 'team-1',
        stationId: 'station-1',
      },
    });
    expect(result.taskStatus).toBe('todo');
  });

  it('records the dedicated failure event when an admin rejects a photo', async () => {
    const { service, prisma } = createService();

    jest
      .spyOn(service as never, 'resolveMobileAdminTeamTaskContext')
      .mockResolvedValue({
        realization: { id: 'realization-1' },
        team: { id: 'team-1' },
        station: { id: 'station-1', type: 'photo-task' },
        existingProgress: {
          id: 'progress-1',
          status: TaskStatus.IN_PROGRESS,
          pointsAwarded: 0,
          startedAt: new Date('2026-05-10T10:00:00.000Z'),
        },
        stationId: 'station-1',
      });
    const emitEvent = jest
      .spyOn(service as never, 'emitEvent')
      .mockResolvedValue(undefined);
    jest.spyOn(service as never, 'recalculateTeamPoints').mockResolvedValue(0);

    const result = await service.failMobileAdminTeamTask({
      realizationId: 'realization-1',
      teamId: 'team-1',
      stationId: 'station-1',
      reason: 'photo_rejected_by_admin',
    });

    expect(prisma.teamTaskProgress.update).toHaveBeenCalledWith({
      where: { id: 'progress-1' },
      data: expect.objectContaining({
        status: TaskStatus.DONE,
        pointsAwarded: 0,
      }),
    });
    expect(emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'task_failed',
        payload: expect.objectContaining({
          reason: 'photo_rejected_by_admin',
          reasonLabel: 'Zdjęcie odrzucone przez organizatora',
        }),
      }),
    );
    expect(result.taskStatus).toBe('failed');
  });

  it('requires a location update before starting tasks when realization requires location', async () => {
    const { service, prisma } = createService();

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: {
        deviceId: 'device-1',
      },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: null,
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: true,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);

    await expect(
      service.startMobileTask({
        sessionToken: 'session-token',
        stationId: 'station-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.teamTaskProgress.findUnique).not.toHaveBeenCalled();
  });

  it('rejects starting a task when another team is already in progress and concurrent teams are not allowed', async () => {
    const { service, prisma, stationService } = createService();

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'quiz',
      completionCode: null,
      points: 50,
      timeLimitSeconds: 0,
      allowConcurrentTeams: false,
    });
    prisma.teamTaskProgress.findUnique.mockResolvedValue(null);
    prisma.teamTaskProgress.findFirst.mockResolvedValue({
      id: 'other-team-progress',
    });

    await expect(
      service.startMobileTask({
        sessionToken: 'session-token',
        stationId: 'station-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.teamTaskProgress.create).not.toHaveBeenCalled();
  });

  it('allows starting a task on a station with allowConcurrentTeams even while another team is in progress', async () => {
    const { service, prisma, stationService } = createService();

    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: {
        id: 'team-1',
        points: 0,
        lastLocationAt: new Date('2026-05-10T09:59:00.000Z'),
      },
      realization: {
        id: 'realization-1',
        status: 'in-progress',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        durationMinutes: 120,
        stationIds: ['station-1'],
        locationRequired: false,
        timedStationPointsDecayEnabled: false,
        updatedAt: '2026-05-10T09:00:00.000Z',
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    stationService.findStationById.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'quiz',
      completionCode: null,
      points: 50,
      timeLimitSeconds: 0,
      allowConcurrentTeams: true,
    });
    prisma.teamTaskProgress.findUnique.mockResolvedValue(null);
    prisma.teamTaskProgress.findFirst.mockResolvedValue({
      id: 'other-team-progress',
    });

    const result = await service.startMobileTask({
      sessionToken: 'session-token',
      stationId: 'station-1',
    });

    expect(result.taskStatus).toBe('in-progress');
    expect(prisma.teamTaskProgress.findFirst).not.toHaveBeenCalled();
    expect(prisma.teamTaskProgress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-1',
          stationId: 'station-1',
        }),
      }),
    );
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

  it('clears failed outcome for station after admin task reset', async () => {
    const { service, prisma } = createService();
    prisma.eventLog.findMany.mockResolvedValue([
      {
        eventType: 'task_reset_by_admin',
        payload: { stationId: 'station-1' },
      },
      {
        eventType: 'task_failed',
        payload: { stationId: 'station-1' },
      },
      {
        eventType: 'task_failed',
        payload: { stationId: 'station-2' },
      },
    ]);

    const failedStationIds = await (service as never).getFailedTaskStationIds({
      realizationId: 'realization-1',
      teamId: 'team-1',
    });

    expect([...failedStationIds]).toEqual(['station-2']);
    expect(prisma.eventLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              eventType: {
                in: ['task_failed', 'task_completed', 'task_reset_by_admin'],
              },
            }),
          ]),
        }),
      }),
    );
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

describe('MobileService station payload mapper', () => {
  it('includes quiz audioUrl with fallback to base station quiz', () => {
    const service = new MobileService({} as never, {} as never, {} as never);
    const languageContext = resolveRealizationLanguageContext({
      language: 'other',
      customLanguage: 'english',
      selectedLanguage: 'english',
    });

    const station: StationEntity = {
      id: 'station-audio-1',
      name: 'Stanowisko audio',
      type: 'audio-quiz',
      categories: [],
      description: 'Opis stanowiska',
      imageUrl: 'https://example.com/image.png',
      points: 10,
      timeLimitSeconds: 60,
      challengeDifficultyMode: 'admin',
      challengeDifficulty: 'medium',
      completionStopwatchEnabled: false,
      color: '#06b6d4',
      quiz: {
        question: 'Pytanie bazowe',
        answers: ['A', 'B', 'C', 'D'],
        correctAnswerIndex: 1,
        audioUrl: '  https://example.com/base-audio.mp3  ',
      },
      translations: {
        english: {
          quiz: {
            question: 'Question in English',
            answers: ['A', 'B', 'C', 'D'],
            correctAnswerIndex: 2,
          },
        },
      },
      kind: 'template',
      isTemplate: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const payload = (service as never).toMobileStationPayload(
      station,
      languageContext,
    );

    expect(payload.quiz).toEqual({
      question: 'Question in English',
      answers: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 2,
      audioUrl: 'https://example.com/base-audio.mp3',
    });
  });

  it('shows the live base station content, not a stale translations[] snapshot, when the player views the realization in its own base language', () => {
    const service = new MobileService({} as never, {} as never, {} as never);
    const languageContext = resolveRealizationLanguageContext({
      language: 'polish',
      selectedLanguage: 'polish',
    });

    const station: StationEntity = {
      id: 'station-boggle-1',
      name: 'Słownik procesów',
      type: 'boggle',
      categories: ['AURA'],
      description: 'Znajdź cztery słowa związane z systemem.',
      imageUrl: undefined,
      points: 50,
      timeLimitSeconds: 0,
      challengeDifficultyMode: 'admin',
      challengeDifficulty: 'medium',
      completionStopwatchEnabled: false,
      color: '#f59e0b',
      quiz: {
        question: '',
        answers: ['DANE', '', '', ''],
        correctAnswerIndex: 0,
      },
      // Stale snapshot from an auto-translate run that predates the admin's
      // most recent direct edit of the base (Polish) fields above.
      translations: {
        polish: {
          name: 'Słownik korzeniowy',
          description: 'Podejście cztery założenia z systemu.',
          quiz: {
            question: '',
            answers: ['KORZENIE', '', '', ''],
            correctAnswerIndex: 0,
          },
        },
      },
      kind: 'template',
      isTemplate: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const payload = (service as never).toMobileStationPayload(
      station,
      languageContext,
    );

    expect(payload.name).toBe('Słownik procesów');
    expect(payload.description).toBe(
      'Znajdź cztery słowa związane z systemem.',
    );
    expect(payload.quiz).toEqual(
      expect.objectContaining({ answers: ['DANE', '', '', ''] }),
    );
  });
});

describe('MobileService admin station QR export', () => {
  function createService() {
    const prisma = {
      realization: {
        findMany: jest.fn(),
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

  it('includes qrScanCodes for qr-hunt stations and an empty array for other types', async () => {
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
        stationIds: ['station-qr-hunt', 'station-quiz'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        scenarioStations: [
          {
            id: 'station-qr-hunt',
            name: 'Polowanie na kody',
            type: 'qr-hunt',
            completionCode: null,
            qrEntryCode: 'K3M9QXZ7',
            qrScanCodes: ['SKRZYNKA-01', 'SKRZYNKA-02'],
          },
          {
            id: 'station-quiz',
            name: 'Quiz',
            type: 'quiz',
            completionCode: null,
            qrEntryCode: 'AB3K9XQ2',
            qrScanCodes: [],
          },
        ],
      },
    ]);
    prisma.realization.findMany.mockResolvedValue([
      { id: 'realization-1', locationRequired: true },
    ]);

    const result = await service.getMobileAdminStationQrs('realization-1');

    const qrHuntEntry = result.entries.find(
      (entry) => entry.stationId === 'station-qr-hunt',
    );
    const quizEntry = result.entries.find(
      (entry) => entry.stationId === 'station-quiz',
    );

    expect(qrHuntEntry?.qrScanCodes).toEqual(['SKRZYNKA-01', 'SKRZYNKA-02']);
    expect(quizEntry?.qrScanCodes).toEqual([]);
    expect(qrHuntEntry?.qrEntryCode).toBe('K3M9QXZ7');
    expect(qrHuntEntry?.entryUrl).toContain('K3M9QXZ7');
    expect(quizEntry?.qrEntryCode).toBe('AB3K9XQ2');
  });

  it('returns no entries for a risk-quiz realization, hiding the technical placeholder station', async () => {
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
        type: 'risk-quiz',
        stationIds: ['station-placeholder'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        scenarioStations: [
          {
            id: 'station-placeholder',
            name: 'Ryzykanci — pole techniczne',
            type: 'points',
            completionCode: null,
            qrEntryCode: null,
            qrScanCodes: [],
          },
        ],
      },
    ]);
    prisma.realization.findMany.mockResolvedValue([
      { id: 'realization-1', locationRequired: true },
    ]);

    const result = await service.getMobileAdminStationQrs('realization-1');

    expect(result).toEqual({ realizationId: 'realization-1', entries: [] });
  });
});

describe('MobileService realization reset', () => {
  function createService() {
    const prisma = {
      realization: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'team-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      teamAssignment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      teamTaskProgress: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      eventLog: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(),
      },
      teamStationScan: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      riskAttempt: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      riskPendingDraw: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      pendingStationLaunch: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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

  it('clears risk-quiz attempts so a reset realization has no pre-attempted cards', async () => {
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
        teamCount: 0,
        stationIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        scenarioStations: [],
      },
    ]);
    prisma.realization.findMany.mockResolvedValue([
      { id: 'realization-1', locationRequired: true },
    ]);
    prisma.realization.update.mockResolvedValue({ id: 'realization-1' });

    await service.resetMobileAdminRealization('realization-1');

    expect(prisma.riskAttempt.deleteMany).toHaveBeenCalledWith({
      where: { realizationId: 'realization-1' },
    });
    expect(prisma.riskPendingDraw.deleteMany).toHaveBeenCalledWith({
      where: { team: { realizationId: 'realization-1' } },
    });
    expect(prisma.pendingStationLaunch.deleteMany).toHaveBeenCalledWith({
      where: { team: { realizationId: 'realization-1' } },
    });
  });
});

describe('MobileService resolveMobileStationQr', () => {
  function createService() {
    const prisma = {
      teamTaskProgress: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      pointsQrCode: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      pointsQrCodeClaim: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      eventLog: {
        create: jest.fn(),
      },
    };
    const stationService = {
      findStationByRealizationAndQrEntryCode: jest.fn(),
    };

    const service = new MobileService(
      prisma as never,
      {} as never,
      stationService as never,
    );

    return { service, prisma, stationService };
  }

  function stubSession(service: MobileService, realizationId: string) {
    jest.spyOn(service as never, 'requireSession').mockResolvedValue({
      assignment: { deviceId: 'device-1' },
      team: { id: 'team-1', points: 100 },
      realization: {
        id: realizationId,
        language: 'polish',
        customLanguage: null,
        locationRequired: false,
      },
    });
    jest
      .spyOn(service as never, 'assertGameplayAllowed')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as never, 'getFailedTaskStationIds')
      .mockResolvedValue(new Set());
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves a station when the code matches one in the device realization', async () => {
    const { service, stationService } = createService();
    stubSession(service, 'realization-1');

    stationService.findStationByRealizationAndQrEntryCode.mockResolvedValue({
      id: 'station-1',
      realizationId: 'realization-1',
      type: 'quiz',
      name: 'Stanowisko',
    });

    const result = await service.resolveMobileStationQr({
      sessionToken: 'session-token',
      token: 'k3m9qxz7',
    });

    expect(
      stationService.findStationByRealizationAndQrEntryCode,
    ).toHaveBeenCalledWith('realization-1', 'K3M9QXZ7');
    expect(result.kind).toBe('station');
    if (result.kind !== 'station') {
      throw new Error('expected a station result');
    }
    expect(result.station.id).toBe('station-1');
  });

  it('rejects a code that does not belong to any station in the device realization', async () => {
    const { service, stationService } = createService();
    stubSession(service, 'realization-2');

    stationService.findStationByRealizationAndQrEntryCode.mockResolvedValue(
      null,
    );

    await expect(
      service.resolveMobileStationQr({
        sessionToken: 'session-token',
        token: 'K3M9QXZ7',
      }),
    ).rejects.toThrow('Station not found');

    expect(
      stationService.findStationByRealizationAndQrEntryCode,
    ).toHaveBeenCalledWith('realization-2', 'K3M9QXZ7');
  });

  it('rejects an empty code', async () => {
    const { service, stationService } = createService();
    stubSession(service, 'realization-1');

    await expect(
      service.resolveMobileStationQr({
        sessionToken: 'session-token',
        token: '   ',
      }),
    ).rejects.toThrow('Invalid payload');

    expect(
      stationService.findStationByRealizationAndQrEntryCode,
    ).not.toHaveBeenCalled();
  });

  it('awards points and creates a claim when the code matches a PER_TEAM points QR code', async () => {
    const { service, prisma, stationService } = createService();
    stubSession(service, 'realization-1');
    stationService.findStationByRealizationAndQrEntryCode.mockResolvedValue(
      null,
    );
    prisma.pointsQrCode.findUnique.mockResolvedValue({
      id: 'points-qr-1',
      realizationId: 'realization-1',
      code: 'BONUS01',
      points: 25,
      claimMode: 'PER_TEAM',
    });
    jest
      .spyOn(service as never, 'recalculateTeamPoints')
      .mockResolvedValue(125);

    const result = await service.resolveMobileStationQr({
      sessionToken: 'session-token',
      token: 'bonus01',
    });

    expect(result).toEqual({
      kind: 'points',
      realizationId: 'realization-1',
      pointsAwarded: 25,
      teamPoints: 125,
    });
    expect(prisma.pointsQrCodeClaim.create).toHaveBeenCalledWith({
      data: {
        pointsQrCodeId: 'points-qr-1',
        teamId: 'team-1',
        realizationId: 'realization-1',
      },
    });
  });

  it('treats re-scanning an already-claimed points QR code as an idempotent no-op', async () => {
    const { service, prisma, stationService } = createService();
    stubSession(service, 'realization-1');
    stationService.findStationByRealizationAndQrEntryCode.mockResolvedValue(
      null,
    );
    prisma.pointsQrCode.findUnique.mockResolvedValue({
      id: 'points-qr-1',
      realizationId: 'realization-1',
      code: 'BONUS01',
      points: 25,
      claimMode: 'PER_TEAM',
    });
    prisma.pointsQrCodeClaim.findUnique.mockResolvedValue({ id: 'claim-1' });

    const result = await service.resolveMobileStationQr({
      sessionToken: 'session-token',
      token: 'BONUS01',
    });

    expect(result).toEqual({
      kind: 'points',
      realizationId: 'realization-1',
      pointsAwarded: 0,
      teamPoints: 100,
      alreadyClaimed: true,
    });
    expect(prisma.pointsQrCodeClaim.create).not.toHaveBeenCalled();
  });

  it('rejects a FIRST_TEAM points QR code already claimed by a different team', async () => {
    const { service, prisma, stationService } = createService();
    stubSession(service, 'realization-1');
    stationService.findStationByRealizationAndQrEntryCode.mockResolvedValue(
      null,
    );
    prisma.pointsQrCode.findUnique.mockResolvedValue({
      id: 'points-qr-1',
      realizationId: 'realization-1',
      code: 'BONUS01',
      points: 25,
      claimMode: 'FIRST_TEAM',
    });
    prisma.pointsQrCodeClaim.findUnique.mockResolvedValue(null);
    prisma.pointsQrCodeClaim.findFirst.mockResolvedValue({
      id: 'claim-other-team',
    });

    const result = await service.resolveMobileStationQr({
      sessionToken: 'session-token',
      token: 'BONUS01',
    });

    expect(result).toEqual({
      kind: 'points',
      realizationId: 'realization-1',
      pointsAwarded: 0,
      teamPoints: 100,
      alreadyClaimedByOtherTeam: true,
    });
    expect(prisma.pointsQrCodeClaim.create).not.toHaveBeenCalled();
  });

  it('rejects a code that matches neither a station nor a points QR code', async () => {
    const { service, stationService } = createService();
    stubSession(service, 'realization-1');
    stationService.findStationByRealizationAndQrEntryCode.mockResolvedValue(
      null,
    );

    await expect(
      service.resolveMobileStationQr({
        sessionToken: 'session-token',
        token: 'UNKNOWN01',
      }),
    ).rejects.toThrow('Station not found');
  });
});

describe('MobileService resolveEffectiveTaskStatus', () => {
  function createService() {
    return new MobileService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  it('treats an in-progress task whose time limit has elapsed as failed, even without a task/fail report', () => {
    const service = createService() as never as {
      resolveEffectiveTaskStatus: (
        status: TaskStatus | null | undefined,
        failed: boolean,
        startedAt: Date | null | undefined,
        timeLimitSeconds: number | null | undefined,
      ) => string;
    };

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-10T10:05:01.000Z'));

    const result = service.resolveEffectiveTaskStatus(
      TaskStatus.IN_PROGRESS,
      false,
      new Date('2026-05-10T10:00:00.000Z'),
      300,
    );

    expect(result).toBe('failed');
  });

  it('keeps an in-progress task in-progress while its time limit has not elapsed yet', () => {
    const service = createService() as never as {
      resolveEffectiveTaskStatus: (
        status: TaskStatus | null | undefined,
        failed: boolean,
        startedAt: Date | null | undefined,
        timeLimitSeconds: number | null | undefined,
      ) => string;
    };

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-10T10:04:59.000Z'));

    const result = service.resolveEffectiveTaskStatus(
      TaskStatus.IN_PROGRESS,
      false,
      new Date('2026-05-10T10:00:00.000Z'),
      300,
    );

    expect(result).toBe('in-progress');
  });

  it('leaves untimed (timeLimitSeconds <= 0) in-progress tasks alone regardless of elapsed time', () => {
    const service = createService() as never as {
      resolveEffectiveTaskStatus: (
        status: TaskStatus | null | undefined,
        failed: boolean,
        startedAt: Date | null | undefined,
        timeLimitSeconds: number | null | undefined,
      ) => string;
    };

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-10T12:00:00.000Z'));

    const result = service.resolveEffectiveTaskStatus(
      TaskStatus.IN_PROGRESS,
      false,
      new Date('2026-05-10T10:00:00.000Z'),
      0,
    );

    expect(result).toBe('in-progress');
  });
});

// The organiser's "Uruchom" button lands here, not on RealizationService's
// form save — and the tablets' pre-game countdown is measured from the stamp
// this path writes. It was missed once already: the method had a local
// `startedAt` that only reached the event log, so every device skipped the
// countdown and dropped straight into the game.
describe('MobileService admin start', () => {
  function createService() {
    const prisma = {
      realization: { update: jest.fn().mockResolvedValue(undefined) },
      eventLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = new MobileService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  function stubRealization(service: MobileService, status: string) {
    jest
      .spyOn(service as never, 'resolveMobileAdminRealizationOrThrow')
      .mockResolvedValue({
        id: 'realization-1',
        status,
        scheduledAt: new Date().toISOString(),
        durationMinutes: 120,
      });
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stamps startedAt so the tablets have something to count down from', async () => {
    const { service, prisma } = createService();
    stubRealization(service, 'planned');

    await service.startMobileAdminRealization('realization-1');

    const [[{ data }]] = prisma.realization.update.mock.calls as [
      [{ data: Record<string, unknown> }],
    ];
    expect(data.startedAt).toBeInstanceOf(Date);
    expect(data.status).toBe('IN_PROGRESS');
  });

  // Pressing start twice must not restart a countdown for teams already playing.
  it('touches nothing when the realization is already running', async () => {
    const { service, prisma } = createService();
    stubRealization(service, 'in-progress');

    await service.startMobileAdminRealization('realization-1');

    expect(prisma.realization.update).not.toHaveBeenCalled();
  });
});

// The Game Master's review queue is fed by two different shapes: a photo task
// (a TeamPhoto row) and a reviewed-answer card (the text lives on the
// RiskAttempt itself, with no photo anywhere). Both have to come out of this one
// call, because the admin panel polls exactly one list.
describe('MobileService.listPendingPhotoReviews', () => {
  const reviewedAnswerStation = {
    id: 'station-reviewed',
    name: 'Przyczyny rozbicia',
    description: 'Odpowiedzcie własnymi słowami.',
    quizData: {
      question: 'Wymieńcie trzy przyczyny rozbicia dzielnicowego.',
      answers: ['Wymieńcie trzy przyczyny rozbicia dzielnicowego.', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['testament Krzywoustego', 'brak pryncypatu'],
    },
  };
  const photoStation = {
    id: 'station-photo',
    name: 'Zdjęcie drużyny',
    description: 'Zróbcie zdjęcie.',
    quizData: null,
  };

  function createService() {
    const prisma = {
      teamPhoto: { findMany: jest.fn().mockResolvedValue([]) },
      teamTaskProgress: { findMany: jest.fn().mockResolvedValue([]) },
      team: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'team-1', name: 'Wilki', slotNumber: 1 },
        ]),
      },
      riskPoolStation: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { stationId: reviewedAnswerStation.id, station: reviewedAnswerStation },
            { stationId: photoStation.id, station: photoStation },
          ]),
      },
      riskAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const stationService = { findStationsByIds: jest.fn().mockResolvedValue([]) };

    const service = new MobileService(
      prisma as never,
      {} as never,
      stationService as never,
      {} as never,
    );
    jest
      .spyOn(service as never, 'resolveMobileAdminRealizationOrThrow')
      .mockResolvedValue({ id: 'realization-1', stationIds: [] } as never);

    return { service, prisma };
  }

  it('lists a reviewed-answer card with the question and the answer key', async () => {
    const { service, prisma } = createService();
    prisma.riskAttempt.findMany.mockResolvedValue([
      {
        teamId: 'team-1',
        stationId: reviewedAnswerStation.id,
        answerText: 'Testament Krzywoustego i brak pryncypatu.',
        createdAt: new Date('2026-08-30T10:00:00.000Z'),
      },
    ]);

    const reviews = await service.listPendingPhotoReviews('realization-1');

    expect(reviews).toEqual([
      {
        kind: 'text',
        teamId: 'team-1',
        teamName: 'Wilki',
        stationId: reviewedAnswerStation.id,
        stationName: 'Przyczyny rozbicia',
        stationDescription: 'Odpowiedzcie własnymi słowami.',
        photoUrl: '',
        question: 'Wymieńcie trzy przyczyny rozbicia dzielnicowego.',
        answerText: 'Testament Krzywoustego i brak pryncypatu.',
        answerKeys: ['testament Krzywoustego', 'brak pryncypatu'],
        submittedAt: '2026-08-30T10:00:00.000Z',
      },
    ]);
  });

  it('does not invent a text item for an undecided photo card', async () => {
    const { service, prisma } = createService();
    // A photo card's attempt is undecided too, but its proof is a TeamPhoto row
    // and answerText stays null — it must not surface as an empty text review.
    prisma.riskAttempt.findMany.mockResolvedValue([
      {
        teamId: 'team-1',
        stationId: photoStation.id,
        answerText: null,
        createdAt: new Date('2026-08-30T10:00:00.000Z'),
      },
    ]);
    prisma.teamPhoto.findMany.mockResolvedValue([
      {
        teamId: 'team-1',
        stationId: photoStation.id,
        url: 'https://cdn/photo.jpg',
        createdAt: new Date('2026-08-30T10:05:00.000Z'),
      },
    ]);

    const reviews = await service.listPendingPhotoReviews('realization-1');

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual(
      expect.objectContaining({
        kind: 'photo',
        stationId: photoStation.id,
        photoUrl: 'https://cdn/photo.jpg',
        answerText: '',
        answerKeys: [],
      }),
    );
  });

  it('orders the queue oldest first across both kinds', async () => {
    const { service, prisma } = createService();
    prisma.riskAttempt.findMany.mockResolvedValue([
      {
        teamId: 'team-1',
        stationId: reviewedAnswerStation.id,
        answerText: 'Odpowiedź tekstowa',
        createdAt: new Date('2026-08-30T09:00:00.000Z'),
      },
      {
        teamId: 'team-1',
        stationId: photoStation.id,
        answerText: null,
        createdAt: new Date('2026-08-30T11:00:00.000Z'),
      },
    ]);
    prisma.teamPhoto.findMany.mockResolvedValue([
      {
        teamId: 'team-1',
        stationId: photoStation.id,
        url: 'https://cdn/photo.jpg',
        createdAt: new Date('2026-08-30T11:00:00.000Z'),
      },
    ]);

    const reviews = await service.listPendingPhotoReviews('realization-1');

    expect(reviews.map((review) => review.kind)).toEqual(['text', 'photo']);
  });
});
