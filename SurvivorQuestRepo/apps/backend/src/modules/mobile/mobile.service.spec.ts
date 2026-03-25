import { EventActorType, TeamStatus } from '@prisma/client';
import { MobileService } from './mobile.service';

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

    const service = new MobileService(prisma as never, {} as never, {} as never);
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
    prisma.teamAssignment.findMany.mockResolvedValue([{ id: 'assignment-old' }]);
    prisma.team.findMany.mockResolvedValue([{ color: 'orange' }]);

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
    expect(result.team.color).toBe('red');
  });

  it('auto-assigns color in claim when payload color is missing', async () => {
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

    prisma.team.findMany
      .mockResolvedValueOnce([
        { id: 'peer-1', name: 'Inna', color: 'orange' },
      ])
      .mockResolvedValueOnce([{ color: 'orange' }]);
    prisma.team.update.mockResolvedValue({});

    const result = await service.claimMobileTeam({
      sessionToken: 'token',
      name: 'Nowa Drużyna',
      color: '',
      badgeKey: 'fox-01',
    });

    expect(result.color).toBe('red');
    expect(prisma.team.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'team-1' },
      data: { color: 'red' },
    });
    expect(prisma.team.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'team-1' },
      data: {
        name: 'Nowa Drużyna',
        color: 'red',
        badgeKey: 'fox-01',
        badgeImageUrl: null,
        status: TeamStatus.ACTIVE,
      },
    });
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: {
        realizationId: 'realization-1',
        teamId: 'team-1',
        actorType: EventActorType.MOBILE_DEVICE,
        actorId: 'device-1',
        eventType: 'team_profile_updated',
        payload: { changedFields: ['name', 'color', 'badge'] },
      },
    });
  });
});
