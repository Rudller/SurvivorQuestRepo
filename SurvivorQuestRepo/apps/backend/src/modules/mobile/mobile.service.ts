import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RealizationService,
  type RealizationStatus,
} from '../realization/realization.service';
import { StationService } from '../station/station.service';

type TeamStatus = 'unassigned' | 'active' | 'offline';
type TaskStatus = 'todo' | 'in-progress' | 'done';
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

type LocationPoint = {
  lat: number;
  lng: number;
  accuracy?: number;
  at: string;
};

type MobileRealization = {
  id: string;
  companyName: string;
  status: RealizationStatus;
  scheduledAt: string;
  locationRequired: boolean;
  joinCode: string;
  teamCount: number;
  stationIds: string[];
  createdAt: string;
  updatedAt: string;
};

type MobileTeam = {
  id: string;
  realizationId: string;
  slotNumber: number;
  name: string | null;
  color: TeamColor | null;
  badgeKey: string | null;
  badgeImageUrl: string | null;
  points: number;
  taskStats: { total: number; done: number };
  lastLocation: LocationPoint | null;
  status: TeamStatus;
  createdAt: string;
  updatedAt: string;
};

type TeamAssignment = {
  id: string;
  realizationId: string;
  teamId: string;
  deviceId: string;
  memberName: string | null;
  sessionToken: string;
  expiresAt: string;
  lastSeenAt: string;
  createdAt: string;
};

type TeamTaskProgress = {
  id: string;
  realizationId: string;
  teamId: string;
  stationId: string;
  status: TaskStatus;
  pointsAwarded: number;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

type EventLog = {
  id: string;
  realizationId: string;
  teamId: string | null;
  actorType: 'admin' | 'mobile-device' | 'system';
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type JoinSessionInput = {
  joinCode: string;
  deviceId: string;
  memberName?: string;
};

type ClaimTeamInput = {
  sessionToken: string;
  name: string;
  color: string;
  badgeKey?: string;
  badgeImageUrl?: string;
};

type SelectTeamInput = {
  sessionToken: string;
  slotNumber: number;
};

type RandomizeTeamInput = {
  sessionToken: string;
};

type LocationInput = {
  sessionToken: string;
  lat: number;
  lng: number;
  accuracy?: number;
  at?: string;
};

type CompleteTaskInput = {
  sessionToken: string;
  stationId: string;
  pointsAwarded: number;
  finishedAt?: string;
};

type MobileRealizationSnapshot = {
  id: string;
  companyName: string;
  status: RealizationStatus;
  scheduledAt: string;
  teamCount: number;
  stationIds: string[];
};

type MobileStateSnapshot = {
  realizations: MobileRealization[];
  teams: MobileTeam[];
  assignments: TeamAssignment[];
  taskProgresses: TeamTaskProgress[];
  eventLogs: EventLog[];
};

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

@Injectable()
export class MobileService {
  private realizations: MobileRealization[] = [];
  private teams: MobileTeam[] = [];
  private assignments: TeamAssignment[] = [];
  private taskProgresses: TeamTaskProgress[] = [];
  private eventLogs: EventLog[] = [];

  constructor(
    private readonly realizationService: RealizationService,
    private readonly stationService: StationService,
  ) {
    this.resetMobileStateFromRealizationSnapshot();
  }

  getMobileBootstrap() {
    return {
      serverTime: this.nowIso(),
      teamColors: TEAM_COLORS,
      badgeKeys: BADGE_KEYS,
      realizations: this.realizations.map((realization) => ({
        id: realization.id,
        companyName: realization.companyName,
        status: this.normalizeStatus(realization.status, realization.scheduledAt),
        scheduledAt: realization.scheduledAt,
        joinCode: realization.joinCode,
        locationRequired: realization.locationRequired,
        teamCount: realization.teamCount,
        stationIds: realization.stationIds,
      })),
    };
  }

  joinMobileSession(input: JoinSessionInput) {
    const joinCode = input.joinCode?.trim();
    const deviceId = input.deviceId?.trim();

    if (!joinCode || !deviceId) {
      throw new BadRequestException('Invalid payload');
    }

    if (joinCode.toUpperCase() === TEST_JOIN_CODE) {
      this.resetMobileStateFromRealizationSnapshot();
    }

    const realization = this.getRealizationByJoinCode(joinCode);

    if (!realization) {
      throw new NotFoundException('Invalid join code');
    }

    realization.status = this.normalizeStatus(
      realization.status,
      realization.scheduledAt,
    );

    const existingAssignment = this.assignments.find(
      (assignment) =>
        assignment.realizationId === realization.id &&
        assignment.deviceId === deviceId,
    );

    if (existingAssignment && !this.isExpired(existingAssignment.expiresAt)) {
      this.touchAssignment(existingAssignment);
      const existingTeam = this.getTeamById(existingAssignment.teamId);

      if (!existingTeam) {
        throw new NotFoundException('Team not found');
      }

      return {
        sessionToken: existingAssignment.sessionToken,
        realizationId: realization.id,
        team: {
          id: existingTeam.id,
          slotNumber: existingTeam.slotNumber,
          name: existingTeam.name,
          color: existingTeam.color,
          badgeKey: existingTeam.badgeKey,
          points: existingTeam.points,
        },
        locationRequired: realization.locationRequired,
      };
    }

    const freeTeam = this.teams
      .filter((team) => team.realizationId === realization.id)
      .sort((left, right) => left.slotNumber - right.slotNumber)
      .find((team) => !this.hasActiveTeamAssignment(team.id));

    if (!freeTeam) {
      throw new ConflictException('No free team slots');
    }

    const assignedAt = this.nowIso();
    const assignment: TeamAssignment = {
      id: crypto.randomUUID(),
      realizationId: realization.id,
      teamId: freeTeam.id,
      deviceId,
      memberName: input.memberName?.trim() || null,
      sessionToken: this.generateSessionToken(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      lastSeenAt: assignedAt,
      createdAt: assignedAt,
    };

    this.assignments = [...this.assignments, assignment];
    freeTeam.status = 'active';
    freeTeam.updatedAt = assignedAt;

    this.emitEvent({
      realizationId: realization.id,
      teamId: freeTeam.id,
      actorType: 'mobile-device',
      actorId: deviceId,
      eventType: 'team_joined',
      payload: {
        slotNumber: freeTeam.slotNumber,
        memberName: assignment.memberName,
      },
    });

    return {
      sessionToken: assignment.sessionToken,
      realizationId: realization.id,
      team: {
        id: freeTeam.id,
        slotNumber: freeTeam.slotNumber,
        name: freeTeam.name,
        color: freeTeam.color,
        badgeKey: freeTeam.badgeKey,
        points: freeTeam.points,
      },
      locationRequired: realization.locationRequired,
    };
  }

  getMobileSessionState(sessionToken: string) {
    const { assignment, team, realization } = this.requireSession(sessionToken);
    const teamTasks = realization.stationIds.map((stationId) => {
      const progress = this.taskProgresses.find(
        (item) =>
          item.realizationId === realization.id &&
          item.teamId === team.id &&
          item.stationId === stationId,
      );

      return {
        stationId,
        status: (progress?.status || 'todo') as TaskStatus,
        pointsAwarded: progress?.pointsAwarded || 0,
      };
    });

    return {
      realization: {
        id: realization.id,
        status: this.normalizeStatus(realization.status, realization.scheduledAt),
        locationRequired: realization.locationRequired,
        scheduledAt: realization.scheduledAt,
      },
      team: {
        id: team.id,
        slotNumber: team.slotNumber,
        name: team.name,
        color: team.color,
        badgeKey: team.badgeKey,
        points: team.points,
        lastLocation: team.lastLocation,
      },
      tasks: teamTasks,
      meta: {
        sessionExpiresAt: assignment.expiresAt,
        eventLogCount: this.eventLogs.filter(
          (event) => event.realizationId === realization.id,
        ).length,
      },
    };
  }

  claimMobileTeam(input: ClaimTeamInput) {
    const { assignment, team, realization } = this.requireSession(
      input.sessionToken,
    );
    const teamName = input.name?.trim();
    const color = this.parseTeamColor(input.color?.trim());

    if (!teamName) {
      throw new BadRequestException('Team name is required');
    }

    const takenByName = this.teams.find(
      (item) =>
        item.realizationId === realization.id &&
        item.id !== team.id &&
        this.toLowerSafe(item.name) === teamName.toLowerCase(),
    );

    if (takenByName) {
      throw new ConflictException('Team name already taken');
    }

    const takenByColor = this.teams.find(
      (item) =>
        item.realizationId === realization.id &&
        item.id !== team.id &&
        item.color === color,
    );

    if (takenByColor) {
      throw new ConflictException('Team color already taken');
    }

    const changedFields: string[] = [];

    if (team.name !== teamName) {
      changedFields.push('name');
      this.emitEvent({
        realizationId: realization.id,
        teamId: team.id,
        actorType: 'mobile-device',
        actorId: assignment.deviceId,
        eventType: 'team_name_set',
        payload: {
          previous: team.name,
          next: teamName,
        },
      });
    }

    if (team.color !== color) {
      changedFields.push('color');
      this.emitEvent({
        realizationId: realization.id,
        teamId: team.id,
        actorType: 'mobile-device',
        actorId: assignment.deviceId,
        eventType: 'team_color_set',
        payload: {
          previous: team.color,
          next: color,
        },
      });
    }

    const nextBadgeKey = input.badgeKey?.trim() || null;
    const nextBadgeImageUrl = input.badgeImageUrl?.trim() || null;

    if (team.badgeKey !== nextBadgeKey || team.badgeImageUrl !== nextBadgeImageUrl) {
      changedFields.push('badge');
      this.emitEvent({
        realizationId: realization.id,
        teamId: team.id,
        actorType: 'mobile-device',
        actorId: assignment.deviceId,
        eventType: 'team_badge_set',
        payload: {
          previousBadgeKey: team.badgeKey,
          nextBadgeKey,
        },
      });
    }

    team.name = teamName;
    team.color = color;
    team.badgeKey = nextBadgeKey;
    team.badgeImageUrl = nextBadgeImageUrl;
    team.status = 'active';
    team.updatedAt = this.nowIso();

    return {
      teamId: team.id,
      name: team.name,
      color: team.color,
      badgeKey: team.badgeKey,
      changedFields,
    };
  }

  selectMobileTeam(input: SelectTeamInput) {
    const { assignment, team, realization } = this.requireSession(
      input.sessionToken,
    );
    const slotNumber = Number(input.slotNumber);

    if (!Number.isInteger(slotNumber) || slotNumber < 1) {
      throw new BadRequestException('Invalid team slot');
    }

    const requestedTeam = this.teams.find(
      (candidate) =>
        candidate.realizationId === realization.id &&
        candidate.slotNumber === slotNumber,
    );

    if (!requestedTeam) {
      throw new NotFoundException('Team not found');
    }

    if (
      requestedTeam.id !== team.id &&
      this.hasActiveTeamAssignment(requestedTeam.id, assignment.id)
    ) {
      throw new ConflictException('Selected team is not available');
    }

    if (requestedTeam.id !== team.id) {
      assignment.teamId = requestedTeam.id;
      assignment.lastSeenAt = this.nowIso();
      assignment.expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

      team.status = this.hasActiveTeamAssignment(team.id, assignment.id)
        ? 'active'
        : 'unassigned';
      team.updatedAt = this.nowIso();

      requestedTeam.status = 'active';
      requestedTeam.updatedAt = this.nowIso();

      this.emitEvent({
        realizationId: realization.id,
        teamId: requestedTeam.id,
        actorType: 'mobile-device',
        actorId: assignment.deviceId,
        eventType: 'team_reassigned',
        payload: {
          fromSlotNumber: team.slotNumber,
          toSlotNumber: requestedTeam.slotNumber,
        },
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

  randomizeMobileTeam(input: RandomizeTeamInput) {
    const { assignment, team, realization } = this.requireSession(
      input.sessionToken,
    );

    const usedNames = new Set(
      this.teams
        .filter(
          (item) => item.realizationId === realization.id && item.id !== team.id,
        )
        .map((item) => this.toLowerSafe(item.name))
        .filter(Boolean),
    );
    const availableNames = FUNNY_TEAM_NAMES.filter(
      (name) => !usedNames.has(name.toLowerCase()),
    );

    if (availableNames.length === 0) {
      throw new ConflictException('No unique random names left');
    }

    const randomName =
      availableNames[Math.floor(Math.random() * availableNames.length)];
    const randomBadgeKey = BADGE_KEYS[Math.floor(Math.random() * BADGE_KEYS.length)];

    if (!randomName || !randomBadgeKey) {
      throw new ConflictException('Randomization failed');
    }

    team.name = randomName;

    if (!team.color) {
      const usedColors = new Set(
        this.teams
          .filter(
            (item) =>
              item.realizationId === realization.id &&
              item.id !== team.id &&
              item.color,
          )
          .map((item) => item.color),
      );
      const availableColors = TEAM_COLORS.filter(
        (color) => !usedColors.has(color),
      );

      if (availableColors.length > 0) {
        team.color =
          availableColors[Math.floor(Math.random() * availableColors.length)] ||
          null;
      }
    }

    team.badgeKey = randomBadgeKey;
    team.status = 'active';
    team.updatedAt = this.nowIso();

    this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: 'mobile-device',
      actorId: assignment.deviceId,
      eventType: 'team_name_randomized',
      payload: {
        randomizedName: randomName,
        badgeKey: randomBadgeKey,
      },
    });

    return {
      teamId: team.id,
      name: team.name,
      color: team.color,
      badgeKey: team.badgeKey,
    };
  }

  updateMobileTeamLocation(input: LocationInput) {
    const { assignment, team, realization } = this.requireSession(
      input.sessionToken,
    );

    if (!this.isFiniteNumber(input.lat) || !this.isFiniteNumber(input.lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const locationAt = input.at ? new Date(input.at).toISOString() : this.nowIso();

    team.lastLocation = {
      lat: input.lat,
      lng: input.lng,
      accuracy: this.isFiniteNumber(input.accuracy) ? input.accuracy : undefined,
      at: locationAt,
    };
    team.updatedAt = this.nowIso();

    this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: 'mobile-device',
      actorId: assignment.deviceId,
      eventType: 'team_location_updated',
      payload: {
        lat: input.lat,
        lng: input.lng,
        accuracy: input.accuracy,
        at: locationAt,
      },
    });

    return {
      ok: true,
      lastLocationAt: locationAt,
    };
  }

  completeMobileTask(input: CompleteTaskInput) {
    const { assignment, team, realization } = this.requireSession(
      input.sessionToken,
    );

    if (
      !input.stationId?.trim() ||
      !this.isFiniteNumber(input.pointsAwarded) ||
      input.pointsAwarded < 0
    ) {
      throw new BadRequestException('Invalid payload');
    }

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException('Station not available in this realization');
    }

    if (realization.locationRequired && !team.lastLocation) {
      throw new BadRequestException(
        'Location update is required for this realization',
      );
    }

    const existingDone = this.taskProgresses.find(
      (progress) =>
        progress.realizationId === realization.id &&
        progress.teamId === team.id &&
        progress.stationId === input.stationId &&
        progress.status === 'done',
    );

    if (existingDone) {
      throw new ConflictException('Task already completed');
    }

    const finishedAt = input.finishedAt
      ? new Date(input.finishedAt).toISOString()
      : this.nowIso();
    const defaultPoints = this.getDefaultPointsForStation(input.stationId);

    const progress: TeamTaskProgress = {
      id: crypto.randomUUID(),
      realizationId: realization.id,
      teamId: team.id,
      stationId: input.stationId,
      status: 'done',
      pointsAwarded: Math.round(input.pointsAwarded || defaultPoints),
      startedAt: null,
      finishedAt,
      updatedAt: this.nowIso(),
    };

    this.taskProgresses = [...this.taskProgresses, progress];
    this.recalculateTeamPoints(team.id);

    this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: 'mobile-device',
      actorId: assignment.deviceId,
      eventType: 'task_completed',
      payload: {
        stationId: input.stationId,
        pointsAwarded: progress.pointsAwarded,
        finishedAt,
      },
    });

    this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: 'system',
      actorId: 'system',
      eventType: 'points_recalculated',
      payload: {
        pointsTotal: team.points,
        taskDone: team.taskStats.done,
      },
    });

    return {
      teamId: team.id,
      stationId: input.stationId,
      pointsTotal: team.points,
      taskStatus: 'done' as const,
    };
  }

  getMobileAdminRealizationOverview(realizationId: string) {
    const requestedId = realizationId.trim();
    const directRealization =
      requestedId && requestedId !== 'current'
        ? this.realizations.find((item) => item.id === requestedId)
        : null;
    const realization = directRealization ?? this.resolveCurrentMobileRealization();

    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    realization.status = this.normalizeStatus(
      realization.status,
      realization.scheduledAt,
    );

    const realizationTeams = this.teams
      .filter((item) => item.realizationId === realization.id)
      .sort((left, right) => left.slotNumber - right.slotNumber)
      .map((team) => {
        const teamAssignments = this.assignments.filter(
          (assignment) =>
            assignment.teamId === team.id &&
            !this.isExpired(assignment.expiresAt),
        );
        const teamTasks = realization.stationIds.map((stationId) => {
          const progress = this.taskProgresses.find(
            (item) =>
              item.realizationId === realization.id &&
              item.teamId === team.id &&
              item.stationId === stationId,
          );

          return {
            stationId,
            status: (progress?.status || 'todo') as TaskStatus,
            pointsAwarded: progress?.pointsAwarded || 0,
            finishedAt: progress?.finishedAt || null,
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
          status: team.status,
          taskStats: team.taskStats,
          lastLocation: team.lastLocation,
          deviceCount: teamAssignments.length,
          devices: teamAssignments.map((assignment) => ({
            deviceId: assignment.deviceId,
            memberName: assignment.memberName,
            lastSeenAt: assignment.lastSeenAt,
            expiresAt: assignment.expiresAt,
          })),
          tasks: teamTasks,
          updatedAt: team.updatedAt,
        };
      });

    const realizationLogs = this.eventLogs
      .filter((event) => event.realizationId === realization.id)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );

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
        stations: realization.stationIds.map((stationId) => ({
          stationId,
          defaultPoints: this.getDefaultPointsForStation(stationId),
        })),
        updatedAt: realization.updatedAt,
      },
      teams: realizationTeams,
      logs: realizationLogs,
      stats: {
        activeTeams: realizationTeams.filter((team) => team.status === 'active')
          .length,
        completedTasks: realizationTeams.reduce(
          (sum, team) =>
            sum + team.tasks.filter((task) => task.status === 'done').length,
          0,
        ),
        pointsTotal: realizationTeams.reduce((sum, team) => sum + team.points, 0),
        eventCount: realizationLogs.length,
      },
    };
  }

  private nowIso() {
    return new Date().toISOString();
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private normalizeStatus(status: RealizationStatus, scheduledAt: string) {
    const timestamp = new Date(scheduledAt).getTime();

    if (Number.isFinite(timestamp) && timestamp < Date.now()) {
      return 'done' as const;
    }

    return status;
  }

  private isExpired(iso: string) {
    return new Date(iso).getTime() < Date.now();
  }

  private generateSessionToken() {
    return `mob_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  private toLowerSafe(value: string | null | undefined) {
    return (value || '').trim().toLowerCase();
  }

  private parseTeamColor(color: string): TeamColor {
    if (!TEAM_COLORS.includes(color as TeamColor)) {
      throw new BadRequestException('Invalid team color');
    }

    return color as TeamColor;
  }

  private emitEvent(log: Omit<EventLog, 'id' | 'createdAt'>) {
    this.eventLogs.push({
      id: crypto.randomUUID(),
      createdAt: this.nowIso(),
      ...log,
    });
  }

  private getRealizationsMobileSnapshot(): MobileRealizationSnapshot[] {
    return this.realizationService.listRealizations().map((realization) => ({
      id: realization.id,
      companyName: realization.companyName,
      status: this.normalizeStatus(realization.status, realization.scheduledAt),
      scheduledAt: realization.scheduledAt,
      teamCount: realization.teamCount,
      stationIds: realization.stationIds,
    }));
  }

  private resolveSnapshotPrimaryRealization(items: MobileRealizationSnapshot[]) {
    const inProgress = items.find((item) => item.status === 'in-progress');

    if (inProgress) {
      return inProgress;
    }

    const planned = items
      .filter((item) => item.status === 'planned')
      .sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() -
          new Date(right.scheduledAt).getTime(),
      );

    if (planned.length > 0) {
      return planned[0];
    }

    return items[0] ?? null;
  }

  private buildJoinCode(realization: MobileRealizationSnapshot, index: number) {
    const normalizedId = realization.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const baseCode = `SQ${normalizedId}${String(index + 1).padStart(2, '0')}`;
    return baseCode.slice(0, 12);
  }

  private buildMobileStateFromRealizationSnapshot(): MobileStateSnapshot {
    const sourceRealizations = this.getRealizationsMobileSnapshot();
    const primaryRealization =
      this.resolveSnapshotPrimaryRealization(sourceRealizations);
    const createdAt = this.nowIso();
    const usedJoinCodes = new Set<string>();

    const nextRealizations = sourceRealizations.map((source, index) => {
      const generatedJoinCode = this.buildJoinCode(source, index);
      let joinCode = generatedJoinCode;

      if (source.id === primaryRealization?.id) {
        joinCode = TEST_JOIN_CODE;
      }

      let collisionIndex = 1;
      while (usedJoinCodes.has(joinCode)) {
        collisionIndex += 1;
        joinCode = `${generatedJoinCode.slice(0, 10)}${String(collisionIndex).slice(
          -2,
        )}`;
      }

      usedJoinCodes.add(joinCode);

      return {
        id: source.id,
        companyName: source.companyName,
        status: source.status,
        scheduledAt: source.scheduledAt,
        locationRequired: source.status === 'in-progress',
        joinCode,
        teamCount: Math.max(1, Math.round(source.teamCount)),
        stationIds: source.stationIds,
        createdAt,
        updatedAt: createdAt,
      } satisfies MobileRealization;
    });

    const nextTeams: MobileTeam[] = nextRealizations.flatMap((realization) =>
      Array.from({ length: realization.teamCount }, (_, index) => {
        const teamCreatedAt = this.nowIso();
        return {
          id: `t-${realization.id}-${index + 1}`,
          realizationId: realization.id,
          slotNumber: index + 1,
          name: null,
          color: null,
          badgeKey: null,
          badgeImageUrl: null,
          points: 0,
          taskStats: { total: realization.stationIds.length, done: 0 },
          lastLocation: null,
          status: 'unassigned',
          createdAt: teamCreatedAt,
          updatedAt: teamCreatedAt,
        };
      }),
    );

    return {
      realizations: nextRealizations,
      teams: nextTeams,
      assignments: [],
      taskProgresses: [],
      eventLogs: [],
    };
  }

  private applyMobileStateSnapshot(snapshot: MobileStateSnapshot) {
    this.realizations = snapshot.realizations;
    this.teams = snapshot.teams;
    this.assignments = snapshot.assignments;
    this.taskProgresses = snapshot.taskProgresses;
    this.eventLogs = snapshot.eventLogs;
  }

  private resetMobileStateFromRealizationSnapshot() {
    this.applyMobileStateSnapshot(this.buildMobileStateFromRealizationSnapshot());
  }

  private getRealizationByJoinCode(joinCode: string) {
    return this.realizations.find(
      (realization) =>
        realization.joinCode.toLowerCase() === joinCode.toLowerCase().trim(),
    );
  }

  private getAssignmentByToken(sessionToken: string) {
    return this.assignments.find(
      (assignment) => assignment.sessionToken === sessionToken,
    );
  }

  private touchAssignment(assignment: TeamAssignment) {
    const refreshedAt = this.nowIso();
    assignment.lastSeenAt = refreshedAt;
    assignment.expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  }

  private requireSession(sessionToken: string) {
    if (!sessionToken?.trim()) {
      throw new UnauthorizedException('Missing session token');
    }

    const assignment = this.getAssignmentByToken(sessionToken.trim());

    if (!assignment) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (this.isExpired(assignment.expiresAt)) {
      this.assignments = this.assignments.filter((item) => item.id !== assignment.id);
      throw new UnauthorizedException('Session expired');
    }

    this.touchAssignment(assignment);
    const team = this.teams.find((item) => item.id === assignment.teamId);
    const realization = this.realizations.find(
      (item) => item.id === assignment.realizationId,
    );

    if (!team || !realization) {
      throw new NotFoundException('Session resources not found');
    }

    return { assignment, team, realization };
  }

  private getTeamById(teamId: string) {
    return this.teams.find((team) => team.id === teamId);
  }

  private hasActiveTeamAssignment(teamId: string, ignoredAssignmentId?: string) {
    return this.assignments.some(
      (assignment) =>
        assignment.teamId === teamId &&
        !this.isExpired(assignment.expiresAt) &&
        assignment.id !== ignoredAssignmentId,
    );
  }

  private recalculateTeamPoints(teamId: string) {
    const doneTasks = this.taskProgresses.filter(
      (progress) => progress.teamId === teamId && progress.status === 'done',
    );
    const points = doneTasks.reduce((sum, item) => sum + item.pointsAwarded, 0);
    const team = this.getTeamById(teamId);

    if (!team) {
      return;
    }

    team.points = points;
    team.taskStats.done = doneTasks.length;
    team.updatedAt = this.nowIso();
  }

  private getDefaultPointsForStation(stationId: string) {
    const station = this.stationService.findStationById(stationId);
    return station?.points ?? 0;
  }

  private resolveCurrentMobileRealization() {
    if (this.realizations.length === 0) {
      throw new NotFoundException('Realization not found');
    }

    const normalized = this.realizations.map((realization) => ({
      ...realization,
      status: this.normalizeStatus(realization.status, realization.scheduledAt),
    }));
    const inProgress = normalized.find((item) => item.status === 'in-progress');

    if (inProgress) {
      return inProgress;
    }

    const planned = normalized
      .filter((item) => item.status === 'planned')
      .sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() -
          new Date(right.scheduledAt).getTime(),
      );

    if (planned.length > 0) {
      return planned[0];
    }

    return normalized.sort(
      (left, right) =>
        new Date(right.scheduledAt).getTime() -
        new Date(left.scheduledAt).getTime(),
    )[0];
  }
}
