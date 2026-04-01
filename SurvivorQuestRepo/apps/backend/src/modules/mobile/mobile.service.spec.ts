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
