import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventActorType, Prisma, TaskStatus, TeamStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getOpaqueTokenCandidates,
  hashOpaqueToken,
} from '../../shared/lib/opaque-token';
import {
  RealizationService,
  type RealizationStatus,
} from '../realization/realization.service';
import { StationService } from '../station/station.service';

type TeamColor =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'pink'
  | 'slate';

const TEAM_COLORS: TeamColor[] = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'rose',
  'pink',
  'slate',
];

const BADGE_KEYS = [
  'beaver-01',
  'fox-01',
  'owl-01',
  'wolf-01',
  'otter-01',
  'capybara-02',
  'falcon-01',
  'lynx-01',
];

const FUNNY_TEAM_NAMES = [
  'Turbo Bobry',
  'Galaktyczne Kapibary',
  'Leśne Ninja',
  'Błyskawiczne Borsuki',
  'Szturmowe Wiewióry',
  'Kompasowe Czosnki',
  'Dzikie Lampiony',
  'Sokole Klapki',
  'Niewyspani Tropiciele',
  'Biegnące Jeże',
  'Oddział Chrupka',
  'Ekipa Bez GPS',
];

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const TEST_JOIN_CODE = 'TEST';
const LOCATION_DEDUP_MIN_INTERVAL_MS = 4_000;
const LOCATION_DEDUP_MIN_DISTANCE_METERS = 3;
const LOCATION_MAX_ACCURACY_METERS = 10_000;
const LOCATION_MAX_SPEED_MPS = 120;

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realizationService: RealizationService,
    private readonly stationService: StationService,
  ) {}

  async getMobileBootstrap() {
    const realizations = await this.getRealizationsView();

    return {
      serverTime: new Date().toISOString(),
      teamColors: TEAM_COLORS,
      badgeKeys: BADGE_KEYS,
      realizations: realizations.map((realization) => ({
        id: realization.id,
        companyName: realization.companyName,
        status: this.normalizeStatus(
          realization.status,
          realization.scheduledAt,
        ),
        scheduledAt: realization.scheduledAt,
        joinCode: realization.joinCode,
        locationRequired: realization.locationRequired,
        teamCount: realization.teamCount,
        stationIds: realization.stationIds,
        createdAt: realization.createdAt,
        updatedAt: realization.updatedAt,
      })),
    };
  }

  async joinMobileSession(input: {
    joinCode: string;
    deviceId: string;
    memberName?: string;
  }) {
    const joinCode = input.joinCode?.trim();
    const deviceId = input.deviceId?.trim();

    if (!joinCode || !deviceId) {
      throw new BadRequestException('Invalid payload');
    }

    if (joinCode.toUpperCase() === TEST_JOIN_CODE) {
      await this.resetMobileStateFromRealizationSnapshot();
    }

    const realizations = await this.getRealizationsView();
    const realization = this.findRealizationByJoinCode(realizations, joinCode);

    if (!realization) {
      throw new NotFoundException('Invalid join code');
    }

    await this.ensureTeamsForRealization(realization);

    const existingAssignment = await this.prisma.teamAssignment.findFirst({
      where: {
        realizationId: realization.id,
        deviceId,
      },
      orderBy: { createdAt: 'desc' },
      include: { team: true },
    });

    if (
      existingAssignment &&
      !this.isExpired(existingAssignment.expiresAt.toISOString())
    ) {
      const rotatedSessionToken = this.generateSessionToken();
      const refreshed = await this.touchAssignment(
        existingAssignment.id,
        rotatedSessionToken,
      );
      if (!existingAssignment.team) {
        throw new NotFoundException('Team not found');
      }

      return {
        sessionToken: rotatedSessionToken,
        realizationId: realization.id,
        team: {
          id: existingAssignment.team.id,
          slotNumber: existingAssignment.team.slotNumber,
          name: existingAssignment.team.name,
          color: existingAssignment.team.color,
          badgeKey: existingAssignment.team.badgeKey,
          points: existingAssignment.team.points,
        },
        locationRequired: realization.locationRequired,
        refreshedAt: refreshed,
      };
    }

    const teams = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
    });

    let selectedTeam = teams[0];
    for (const candidate of teams) {
      const activeCount = await this.prisma.teamAssignment.count({
        where: {
          teamId: candidate.id,
          expiresAt: { gt: new Date() },
        },
      });
      if (activeCount === 0) {
        selectedTeam = candidate;
        break;
      }
    }

    if (!selectedTeam) {
      throw new ConflictException('No free team slots');
    }

    const now = new Date();
    const sessionToken = this.generateSessionToken();
    const assignment = await this.prisma.teamAssignment.create({
      data: {
        realizationId: realization.id,
        teamId: selectedTeam.id,
        deviceId,
        memberName: input.memberName?.trim() || null,
        sessionToken: hashOpaqueToken(sessionToken),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        lastSeenAt: now,
      },
    });

    await this.prisma.team.update({
      where: { id: selectedTeam.id },
      data: {
        status: TeamStatus.ACTIVE,
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: selectedTeam.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: deviceId,
      eventType: 'team_joined',
      payload: {
        slotNumber: selectedTeam.slotNumber,
        memberName: assignment.memberName,
      },
    });

    return {
      sessionToken,
      realizationId: realization.id,
      team: {
        id: selectedTeam.id,
        slotNumber: selectedTeam.slotNumber,
        name: selectedTeam.name,
        color: selectedTeam.color,
        badgeKey: selectedTeam.badgeKey,
        points: selectedTeam.points,
      },
      locationRequired: realization.locationRequired,
    };
  }

  async getMobileSessionState(sessionToken: string) {
    const { assignment, team, realization } =
      await this.requireSession(sessionToken);
    const taskProgress = await this.prisma.teamTaskProgress.findMany({
      where: {
        realizationId: realization.id,
        teamId: team.id,
      },
    });

    const tasks = realization.stationIds.map((stationId) => {
      const progress = taskProgress.find(
        (item) => item.stationId === stationId,
      );
      return {
        stationId,
        status: this.fromTaskStatus(progress?.status) || 'todo',
        pointsAwarded: progress?.pointsAwarded || 0,
        startedAt: progress?.startedAt?.toISOString() || null,
        finishedAt: progress?.finishedAt?.toISOString() || null,
      };
    });

    const eventLogCount = await this.prisma.eventLog.count({
      where: { realizationId: realization.id },
    });

    return {
      realization: {
        id: realization.id,
        companyName: realization.companyName,
        contactPerson: realization.contactPerson,
        contactPhone: realization.contactPhone,
        contactEmail: realization.contactEmail,
        logoUrl: realization.logoUrl,
        type: realization.type,
        teamCount: realization.teamCount,
        peopleCount: realization.peopleCount,
        positionsCount: realization.positionsCount,
        instructors: realization.instructors,
        status: this.normalizeStatus(
          realization.status,
          realization.scheduledAt,
        ),
        locationRequired: realization.locationRequired,
        scheduledAt: realization.scheduledAt,
        stations: realization.scenarioStations.map((station) => ({
          id: station.id,
          name: station.name,
          type: station.type,
          description: station.description,
          imageUrl: station.imageUrl,
          points: station.points,
          timeLimitSeconds: station.timeLimitSeconds,
          latitude: station.latitude,
          longitude: station.longitude,
        })),
      },
      team: {
        id: team.id,
        slotNumber: team.slotNumber,
        name: team.name,
        color: team.color,
        badgeKey: team.badgeKey,
        points: team.points,
        lastLocation: this.toLastLocation(team),
      },
      tasks,
      meta: {
        sessionExpiresAt: assignment.expiresAt.toISOString(),
        eventLogCount,
      },
    };
  }

  async claimMobileTeam(input: {
    sessionToken: string;
    name: string;
    color: string;
    badgeKey?: string;
    badgeImageUrl?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    const teamName = input.name?.trim();
    const color = this.parseTeamColor(input.color?.trim());

    if (!teamName) {
      throw new BadRequestException('Team name is required');
    }

    const peers = await this.prisma.team.findMany({
      where: {
        realizationId: realization.id,
        id: { not: team.id },
      },
    });

    if (
      peers.some(
        (item) => this.toLowerSafe(item.name) === teamName.toLowerCase(),
      )
    ) {
      throw new ConflictException('Team name already taken');
    }

    if (peers.some((item) => item.color === color)) {
      throw new ConflictException('Team color already taken');
    }

    const changedFields: string[] = [];
    if (team.name !== teamName) changedFields.push('name');
    if (team.color !== color) changedFields.push('color');

    const nextBadgeKey = input.badgeKey?.trim() || null;
    const nextBadgeImageUrl = input.badgeImageUrl?.trim() || null;
    if (
      team.badgeKey !== nextBadgeKey ||
      team.badgeImageUrl !== nextBadgeImageUrl
    ) {
      changedFields.push('badge');
    }

    await this.prisma.team.update({
      where: { id: team.id },
      data: {
        name: teamName,
        color,
        badgeKey: nextBadgeKey,
        badgeImageUrl: nextBadgeImageUrl,
        status: TeamStatus.ACTIVE,
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_profile_updated',
      payload: { changedFields },
    });

    return {
      teamId: team.id,
      name: teamName,
      color,
      badgeKey: nextBadgeKey,
      changedFields,
    };
  }

  async selectMobileTeam(input: { sessionToken: string; slotNumber: number }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    const slotNumber = Number(input.slotNumber);

    if (!Number.isInteger(slotNumber) || slotNumber < 1) {
      throw new BadRequestException('Invalid team slot');
    }

    const requestedTeam = await this.prisma.team.findFirst({
      where: {
        realizationId: realization.id,
        slotNumber,
      },
    });

    if (!requestedTeam) {
      throw new NotFoundException('Team not found');
    }

    if (requestedTeam.id !== team.id) {
      const activeOnRequested = await this.prisma.teamAssignment.count({
        where: {
          teamId: requestedTeam.id,
          expiresAt: { gt: new Date() },
          id: { not: assignment.id },
        },
      });

      if (activeOnRequested > 0) {
        throw new ConflictException('Selected team is not available');
      }

      await this.prisma.teamAssignment.update({
        where: { id: assignment.id },
        data: {
          teamId: requestedTeam.id,
          lastSeenAt: new Date(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });

      await this.prisma.team.update({
        where: { id: team.id },
        data: { status: TeamStatus.UNASSIGNED },
      });

      await this.prisma.team.update({
        where: { id: requestedTeam.id },
        data: { status: TeamStatus.ACTIVE },
      });
    }

    return {
      team: {
        id: requestedTeam.id,
        slotNumber: requestedTeam.slotNumber,
        name: requestedTeam.name,
        color: requestedTeam.color,
        badgeKey: requestedTeam.badgeKey,
        points: requestedTeam.points,
      },
    };
  }

  async randomizeMobileTeam(input: { sessionToken: string }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    const peers = await this.prisma.team.findMany({
      where: {
        realizationId: realization.id,
        id: { not: team.id },
      },
    });

    const usedNames = new Set(
      peers.map((item) => this.toLowerSafe(item.name)).filter(Boolean),
    );
    const availableNames = FUNNY_TEAM_NAMES.filter(
      (name) => !usedNames.has(name.toLowerCase()),
    );

    if (availableNames.length === 0) {
      throw new ConflictException('No unique random names left');
    }

    const randomName =
      availableNames[Math.floor(Math.random() * availableNames.length)];
    const randomBadgeKey =
      BADGE_KEYS[Math.floor(Math.random() * BADGE_KEYS.length)];

    if (!randomName || !randomBadgeKey) {
      throw new ConflictException('Randomization failed');
    }

    const usedColors = new Set(peers.map((item) => item.color).filter(Boolean));
    const availableColors = TEAM_COLORS.filter(
      (color) => !usedColors.has(color),
    );
    const color = team.color || availableColors[0] || null;

    await this.prisma.team.update({
      where: { id: team.id },
      data: {
        name: randomName,
        color,
        badgeKey: randomBadgeKey,
        status: TeamStatus.ACTIVE,
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_name_randomized',
      payload: {
        randomizedName: randomName,
        badgeKey: randomBadgeKey,
      },
    });

    return {
      teamId: team.id,
      name: randomName,
      color,
      badgeKey: randomBadgeKey,
    };
  }

  async updateMobileTeamLocation(input: {
    sessionToken: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    at?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    if (!this.isLatitude(input.lat) || !this.isLongitude(input.lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const accuracy = this.parseOptionalNumberInRange({
      value: input.accuracy,
      min: 0,
      max: LOCATION_MAX_ACCURACY_METERS,
      field: 'accuracy',
    });
    const speed = this.parseOptionalNumberInRange({
      value: input.speed,
      min: 0,
      max: LOCATION_MAX_SPEED_MPS,
      field: 'speed',
    });
    const heading = this.parseOptionalNumberInRange({
      value: input.heading,
      min: 0,
      max: 360,
      field: 'heading',
    });

    const locationAt = this.parseIsoOrNow(input.at);

    if (!locationAt) {
      throw new BadRequestException('Invalid payload');
    }

    const serverReceivedAt = new Date().toISOString();
    const deduplicated = this.shouldSkipLocationUpdate(team, {
      lat: input.lat,
      lng: input.lng,
      at: locationAt,
    });

    if (deduplicated) {
      return {
        ok: true,
        deduplicated: true,
        lastLocationAt: team.lastLocationAt?.toISOString() || locationAt,
        serverReceivedAt,
      };
    }

    await this.prisma.team.update({
      where: { id: team.id },
      data: {
        lastLocationLat: input.lat,
        lastLocationLng: input.lng,
        lastLocationAccuracy: accuracy ?? null,
        lastLocationAt: new Date(locationAt),
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_location_updated',
      payload: {
        lat: input.lat,
        lng: input.lng,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        heading: heading ?? null,
        at: locationAt,
        serverReceivedAt,
      },
    });

    return {
      ok: true,
      deduplicated: false,
      lastLocationAt: locationAt,
      serverReceivedAt,
    };
  }

  async startMobileTask(input: {
    sessionToken: string;
    stationId: string;
    startedAt?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    if (!input.stationId?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    const startedAt = this.parseIsoOrNow(input.startedAt);
    if (!startedAt) {
      throw new BadRequestException('Invalid payload');
    }

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      throw new ConflictException('Task already completed');
    }

    const startedAtIso =
      existingProgress?.startedAt?.toISOString() || new Date(startedAt).toISOString();

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.IN_PROGRESS,
          startedAt: existingProgress.startedAt || new Date(startedAt),
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
          status: TaskStatus.IN_PROGRESS,
          startedAt: new Date(startedAt),
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'task_started',
      payload: {
        stationId: input.stationId,
        stationType: station.type,
        startedAt: startedAtIso,
      },
    });

    return {
      teamId: team.id,
      stationId: input.stationId,
      taskStatus: 'in-progress' as const,
      startedAt: startedAtIso,
    };
  }

  async completeMobileTask(input: {
    sessionToken: string;
    stationId: string;
    completionCode?: string;
    startedAt?: string;
    finishedAt?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    if (!input.stationId?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    if (realization.locationRequired && !team.lastLocationAt) {
      throw new BadRequestException(
        'Location update is required for this realization',
      );
    }

    const finishedAt = this.parseIsoOrNow(input.finishedAt);
    if (!finishedAt) {
      throw new BadRequestException('Invalid payload');
    }

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      throw new ConflictException('Task already completed');
    }

    const requiresCompletionCode = this.isCodeProtectedStationType(station.type);
    if (requiresCompletionCode) {
      const expectedCode = this.parseCompletionCode(station.completionCode);
      const inputCode = this.parseCompletionCode(input.completionCode);
      if (!expectedCode || !inputCode || expectedCode !== inputCode) {
        throw new BadRequestException('Invalid completion code');
      }
    }

    const startedAtIso = this.parseIsoOrNow(input.startedAt);
    if (input.startedAt && !startedAtIso) {
      throw new BadRequestException('Invalid payload');
    }

    const startedAtSource =
      existingProgress?.startedAt?.toISOString() || startedAtIso || null;

    if (station.type === 'time' && !startedAtSource) {
      throw new BadRequestException('Task timer not started');
    }

    const awardedPoints =
      station.type === 'time'
        ? this.computeLinearTimePoints({
            basePoints: station.points,
            timeLimitSeconds: station.timeLimitSeconds,
            startedAtIso: startedAtSource || finishedAt,
            finishedAtIso: finishedAt,
          })
        : Math.max(0, Math.round(station.points));

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.DONE,
          pointsAwarded: awardedPoints,
          startedAt: existingProgress.startedAt
            ? existingProgress.startedAt
            : startedAtSource
              ? new Date(startedAtSource)
              : null,
          finishedAt: new Date(finishedAt),
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
          status: TaskStatus.DONE,
          pointsAwarded: awardedPoints,
          startedAt: startedAtSource ? new Date(startedAtSource) : null,
          finishedAt: new Date(finishedAt),
        },
      });
    }

    const scoringMeta =
      station.type === 'time'
        ? {
            mode: 'time-linear',
            basePoints: station.points,
            timeLimitSeconds: station.timeLimitSeconds,
            elapsedSeconds: Math.max(
              0,
              Math.round(
                (new Date(finishedAt).getTime() -
                  new Date(startedAtSource || finishedAt).getTime()) /
                  1000,
              ),
            ),
          }
        : {
            mode: 'fixed',
            basePoints: station.points,
          };

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'task_completed',
      payload: {
        stationId: input.stationId,
        stationType: station.type,
        pointsAwarded: awardedPoints,
        startedAt: startedAtSource,
        finishedAt,
        scoring: scoringMeta,
      },
    });

    const pointsTotal = await this.recalculateTeamPoints(
      team.id,
      realization.id,
    );

    return {
      teamId: team.id,
      stationId: input.stationId,
      pointsTotal,
      pointsAwarded: awardedPoints,
      taskStatus: 'done' as const,
    };
  }

  async getMobileAdminRealizationOverview(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);

    const teams = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
    });

    const assignments = await this.prisma.teamAssignment.findMany({
      where: {
        realizationId: realization.id,
      },
    });

    const taskProgresses = await this.prisma.teamTaskProgress.findMany({
      where: {
        realizationId: realization.id,
      },
    });

    const logs = await this.prisma.eventLog.findMany({
      where: {
        realizationId: realization.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    const teamViews = teams.map((team) => {
      const teamAssignments = assignments.filter(
        (assignment) =>
          assignment.teamId === team.id &&
          !this.isExpired(assignment.expiresAt.toISOString()),
      );
      const tasks = realization.stationIds.map((stationId) => {
        const progress = taskProgresses.find(
          (item) => item.stationId === stationId && item.teamId === team.id,
        );

        return {
          stationId,
          status: this.fromTaskStatus(progress?.status) || 'todo',
          pointsAwarded: progress?.pointsAwarded || 0,
          finishedAt: progress?.finishedAt?.toISOString() || null,
        };
      });

      return {
        id: team.id,
        slotNumber: team.slotNumber,
        name: team.name,
        color: team.color,
        badgeKey: team.badgeKey,
        badgeImageUrl: team.badgeImageUrl,
        points: team.points,
        status: this.fromTeamStatus(team.status),
        taskStats: {
          total: team.taskTotal,
          done: team.taskDone,
        },
        lastLocation: this.toLastLocation(team),
        deviceCount: teamAssignments.length,
        devices: teamAssignments.map((assignment) => ({
          deviceId: assignment.deviceId,
          memberName: assignment.memberName,
          lastSeenAt: assignment.lastSeenAt.toISOString(),
          expiresAt: assignment.expiresAt.toISOString(),
        })),
        tasks,
        updatedAt: team.updatedAt.toISOString(),
      };
    });

    return {
      realization: {
        id: realization.id,
        companyName: realization.companyName,
        status: realization.status,
        scheduledAt: realization.scheduledAt,
        locationRequired: realization.locationRequired,
        joinCode: realization.joinCode,
        teamCount: realization.teamCount,
        stationIds: realization.stationIds,
        stations: await Promise.all(
          realization.stationIds.map(async (stationId) => ({
            stationId,
            defaultPoints: await this.getDefaultPointsForStation(stationId),
          })),
        ),
        updatedAt: realization.updatedAt,
      },
      teams: teamViews,
      logs: logs.map((log) => ({
        id: log.id,
        realizationId: log.realizationId,
        teamId: log.teamId,
        actorType: this.fromActorType(log.actorType),
        actorId: log.actorId,
        eventType: log.eventType,
        payload: log.payload as Record<string, unknown>,
        createdAt: log.createdAt.toISOString(),
      })),
      stats: {
        activeTeams: teamViews.filter((team) => team.status === 'active')
          .length,
        completedTasks: teamViews.reduce(
          (sum, team) =>
            sum + team.tasks.filter((task) => task.status === 'done').length,
          0,
        ),
        pointsTotal: teamViews.reduce((sum, team) => sum + team.points, 0),
        eventCount: logs.length,
      },
    };
  }

  async getMobileAdminRealizationLocations(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const teams = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
      select: {
        id: true,
        slotNumber: true,
        name: true,
        color: true,
        status: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationAccuracy: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    const serverTime = new Date();

    return {
      serverTime: serverTime.toISOString(),
      realization: {
        id: realization.id,
        companyName: realization.companyName,
        status: realization.status,
        scheduledAt: realization.scheduledAt,
        locationRequired: realization.locationRequired,
        joinCode: realization.joinCode,
        updatedAt: realization.updatedAt,
      },
      teams: teams.map((team) => {
        const location = this.toLastLocation(team);
        const locationAgeSeconds = team.lastLocationAt
          ? Math.max(
              0,
              Math.round(
                (serverTime.getTime() - team.lastLocationAt.getTime()) / 1000,
              ),
            )
          : null;

        return {
          id: team.id,
          slotNumber: team.slotNumber,
          name: team.name,
          color: team.color,
          status: this.fromTeamStatus(team.status),
          hasLocation: Boolean(location),
          locationAgeSeconds,
          lastLocation: location,
          updatedAt: team.updatedAt.toISOString(),
        };
      }),
    };
  }

  private async resolveMobileAdminRealizationOrThrow(realizationId: string) {
    const requestedId = realizationId.trim();
    const realizations = await this.getRealizationsView();
    const realization =
      requestedId && requestedId !== 'current'
        ? realizations.find((item) => item.id === requestedId)
        : this.resolveCurrentMobileRealization(realizations);

    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    return realization;
  }

  private async getRealizationsView() {
    const items = await this.realizationService.listRealizations();
    const realizationRows = await this.prisma.realization.findMany({
      select: {
        id: true,
        locationRequired: true,
      },
    });
    const rowById = new Map(realizationRows.map((row) => [row.id, row]));
    const primary = this.resolveCurrentMobileRealization(items);

    return items.map((item) => ({
      ...item,
      id: item.id,
      companyName: item.companyName,
      status: this.normalizeStatus(item.status, item.scheduledAt),
      scheduledAt: item.scheduledAt,
      locationRequired:
        rowById.get(item.id)?.locationRequired ?? item.status === 'in-progress',
      joinCode:
        primary?.id === item.id
          ? TEST_JOIN_CODE
          : item.joinCode || TEST_JOIN_CODE,
      teamCount: Math.max(1, Math.round(item.teamCount)),
      stationIds: item.stationIds,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  private resolveCurrentMobileRealization<
    T extends { id: string; status: RealizationStatus; scheduledAt: string },
  >(realizations: T[]) {
    const inProgress = realizations.find(
      (item) => item.status === 'in-progress',
    );
    if (inProgress) return inProgress;

    const planned = realizations
      .filter((item) => item.status === 'planned')
      .sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() -
          new Date(right.scheduledAt).getTime(),
      );

    if (planned.length > 0) {
      return planned[0];
    }

    return realizations[0] || null;
  }

  private async ensureTeamsForRealization(realization: {
    id: string;
    teamCount: number;
    stationIds: string[];
  }) {
    const existing = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
    });

    if (existing.length === realization.teamCount) {
      return;
    }

    if (existing.length > realization.teamCount) {
      const overflow = existing
        .slice(realization.teamCount)
        .map((item) => item.id);
      if (overflow.length > 0) {
        await this.prisma.team.deleteMany({ where: { id: { in: overflow } } });
      }
    }

    for (
      let slot = existing.length + 1;
      slot <= realization.teamCount;
      slot += 1
    ) {
      await this.prisma.team.create({
        data: {
          realizationId: realization.id,
          slotNumber: slot,
          taskTotal: realization.stationIds.length,
          taskDone: 0,
          status: TeamStatus.UNASSIGNED,
        },
      });
    }
  }

  private async resetMobileStateFromRealizationSnapshot() {
    await this.prisma.teamTaskProgress.deleteMany();
    await this.prisma.teamAssignment.deleteMany();
    await this.prisma.eventLog.deleteMany({
      where: {
        actorType: {
          in: [EventActorType.MOBILE_DEVICE, EventActorType.SYSTEM],
        },
      },
    });
    await this.prisma.team.deleteMany();

    const realizations = await this.realizationService.listRealizations();
    for (const realization of realizations) {
      await this.ensureTeamsForRealization({
        id: realization.id,
        teamCount: realization.teamCount,
        stationIds: realization.stationIds,
      });
    }
  }

  private findRealizationByJoinCode<T extends { joinCode: string }>(
    realizations: T[],
    joinCode: string,
  ) {
    return realizations.find(
      (item) => item.joinCode.toLowerCase() === joinCode.toLowerCase(),
    );
  }

  private async requireSession(sessionToken: string) {
    if (!sessionToken?.trim()) {
      throw new UnauthorizedException('Missing session token');
    }

    const candidates = getOpaqueTokenCandidates(sessionToken);

    const assignment = await this.prisma.teamAssignment.findFirst({
      where: { sessionToken: { in: candidates } },
      include: { team: true },
    });

    if (!assignment) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (this.isExpired(assignment.expiresAt.toISOString())) {
      await this.prisma.teamAssignment.delete({ where: { id: assignment.id } });
      throw new UnauthorizedException('Session expired');
    }

    const rawToken = sessionToken.trim();
    await this.touchAssignment(
      assignment.id,
      assignment.sessionToken === rawToken ? rawToken : undefined,
    );
    const realizations = await this.getRealizationsView();
    const realization = realizations.find(
      (item) => item.id === assignment.realizationId,
    );

    if (!assignment.team || !realization) {
      throw new NotFoundException('Session resources not found');
    }

    return {
      assignment,
      team: assignment.team,
      realization,
    };
  }

  private async touchAssignment(
    assignmentId: string,
    rawSessionToken?: string,
  ) {
    const refreshed = new Date();
    await this.prisma.teamAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(rawSessionToken
          ? { sessionToken: hashOpaqueToken(rawSessionToken) }
          : {}),
        lastSeenAt: refreshed,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return refreshed.toISOString();
  }

  private async recalculateTeamPoints(teamId: string, realizationId: string) {
    const doneTasks = await this.prisma.teamTaskProgress.findMany({
      where: {
        teamId,
        status: TaskStatus.DONE,
      },
    });

    const points = doneTasks.reduce((sum, item) => sum + item.pointsAwarded, 0);

    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        points,
        taskDone: doneTasks.length,
      },
    });

    await this.emitEvent({
      realizationId,
      teamId,
      actorType: EventActorType.SYSTEM,
      actorId: 'system',
      eventType: 'points_recalculated',
      payload: {
        pointsTotal: points,
        taskDone: doneTasks.length,
      },
    });

    return points;
  }

  private async getDefaultPointsForStation(stationId: string) {
    const station = await this.stationService.findStationById(stationId);
    return station?.points ?? 0;
  }

  private isCodeProtectedStationType(stationType: string) {
    return stationType === 'time' || stationType === 'points';
  }

  private parseCompletionCode(value?: string | null) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,32}$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private computeLinearTimePoints(input: {
    basePoints: number;
    timeLimitSeconds: number;
    startedAtIso: string;
    finishedAtIso: string;
  }) {
    const safeBasePoints = Math.max(0, Math.round(input.basePoints));
    const safeLimit = Math.max(0, Math.round(input.timeLimitSeconds));
    if (safeBasePoints === 0) {
      return 0;
    }

    if (safeLimit === 0) {
      return safeBasePoints;
    }

    const startedAtMs = new Date(input.startedAtIso).getTime();
    const finishedAtMs = new Date(input.finishedAtIso).getTime();
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) {
      throw new BadRequestException('Invalid payload');
    }

    const elapsedSeconds = Math.max(
      0,
      Math.round((finishedAtMs - startedAtMs) / 1000),
    );
    if (elapsedSeconds >= safeLimit) {
      return 0;
    }

    const ratio = Math.max(0, 1 - elapsedSeconds / safeLimit);
    return Math.max(0, Math.round(safeBasePoints * ratio));
  }

  private parseTeamColor(color: string): TeamColor {
    if (!TEAM_COLORS.includes(color as TeamColor)) {
      throw new BadRequestException('Invalid team color');
    }

    return color as TeamColor;
  }

  private async emitEvent(log: {
    realizationId: string;
    teamId: string | null;
    actorType: EventActorType;
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.eventLog.create({
      data: {
        realizationId: log.realizationId,
        teamId: log.teamId,
        actorType: log.actorType,
        actorId: log.actorId,
        eventType: log.eventType,
        payload: log.payload as Prisma.InputJsonValue,
      },
    });
  }

  private normalizeStatus(status: RealizationStatus, scheduledAt: string) {
    const timestamp = new Date(scheduledAt).getTime();

    if (Number.isFinite(timestamp) && timestamp < Date.now()) {
      return 'done' as const;
    }

    return status;
  }

  private generateSessionToken() {
    return `mob_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  private isExpired(iso: string) {
    return new Date(iso).getTime() < Date.now();
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private isLatitude(value: unknown): value is number {
    return this.isFiniteNumber(value) && value >= -90 && value <= 90;
  }

  private isLongitude(value: unknown): value is number {
    return this.isFiniteNumber(value) && value >= -180 && value <= 180;
  }

  private parseOptionalNumberInRange(input: {
    value: unknown;
    min: number;
    max: number;
    field: string;
  }) {
    if (input.value === null || typeof input.value === 'undefined') {
      return undefined;
    }

    if (
      !this.isFiniteNumber(input.value) ||
      input.value < input.min ||
      input.value > input.max
    ) {
      throw new BadRequestException(`Invalid ${input.field}`);
    }

    return input.value;
  }

  private shouldSkipLocationUpdate(
    team: {
      lastLocationLat: number | null;
      lastLocationLng: number | null;
      lastLocationAt: Date | null;
    },
    next: {
      lat: number;
      lng: number;
      at: string;
    },
  ) {
    if (
      typeof team.lastLocationLat !== 'number' ||
      typeof team.lastLocationLng !== 'number' ||
      !team.lastLocationAt
    ) {
      return false;
    }

    const nextTimestamp = new Date(next.at).getTime();
    if (!Number.isFinite(nextTimestamp)) {
      return false;
    }

    const elapsedMs = Math.abs(nextTimestamp - team.lastLocationAt.getTime());
    const distanceMeters = this.getDistanceMetersBetweenCoordinates(
      team.lastLocationLat,
      team.lastLocationLng,
      next.lat,
      next.lng,
    );

    return (
      elapsedMs < LOCATION_DEDUP_MIN_INTERVAL_MS &&
      distanceMeters < LOCATION_DEDUP_MIN_DISTANCE_METERS
    );
  }

  private getDistanceMetersBetweenCoordinates(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (value: number) => (value * Math.PI) / 180;

    const latDelta = toRadians(toLat - fromLat);
    const lngDelta = toRadians(toLng - fromLng);
    const startLatRad = toRadians(fromLat);
    const endLatRad = toRadians(toLat);

    const haversine =
      Math.sin(latDelta / 2) ** 2 +
      Math.cos(startLatRad) *
        Math.cos(endLatRad) *
        Math.sin(lngDelta / 2) ** 2;
    const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusMeters * centralAngle;
  }

  private parseIsoOrNow(value?: string) {
    if (!value) {
      return new Date().toISOString();
    }

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }

  private toLowerSafe(value: string | null | undefined) {
    return (value || '').trim().toLowerCase();
  }

  private toLastLocation(team: {
    lastLocationLat: number | null;
    lastLocationLng: number | null;
    lastLocationAccuracy: number | null;
    lastLocationAt: Date | null;
  }) {
    if (
      typeof team.lastLocationLat !== 'number' ||
      typeof team.lastLocationLng !== 'number' ||
      !team.lastLocationAt
    ) {
      return null;
    }

    return {
      lat: team.lastLocationLat,
      lng: team.lastLocationLng,
      accuracy: team.lastLocationAccuracy || undefined,
      at: team.lastLocationAt.toISOString(),
    };
  }

  private fromTaskStatus(status?: TaskStatus | null) {
    if (!status || status === TaskStatus.TODO) return 'todo' as const;
    if (status === TaskStatus.IN_PROGRESS) return 'in-progress' as const;
    return 'done' as const;
  }

  private fromTeamStatus(status: TeamStatus) {
    if (status === TeamStatus.ACTIVE) return 'active' as const;
    if (status === TeamStatus.OFFLINE) return 'offline' as const;
    return 'unassigned' as const;
  }

  private fromActorType(actorType: EventActorType) {
    if (actorType === EventActorType.ADMIN) return 'admin' as const;
    if (actorType === EventActorType.MOBILE_DEVICE)
      return 'mobile-device' as const;
    return 'system' as const;
  }
}
