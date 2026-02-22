type RealizationStatus = "planned" | "in-progress" | "done";
type TeamStatus = "unassigned" | "active" | "offline";
type TaskStatus = "todo" | "in-progress" | "done";

type TeamColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "emerald"
  | "cyan"
  | "blue"
  | "violet"
  | "rose";

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
  actorType: "admin" | "mobile-device" | "system";
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

const TEAM_COLORS: TeamColor[] = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "emerald",
  "cyan",
  "blue",
  "violet",
  "rose",
];

const BADGE_KEYS = [
  "beaver-01",
  "fox-01",
  "owl-01",
  "wolf-01",
  "otter-01",
  "capybara-02",
  "falcon-01",
  "lynx-01",
];

const FUNNY_TEAM_NAMES = [
  "Turbo Bobry",
  "Galaktyczne Kapibary",
  "Leśne Ninja",
  "Błyskawiczne Borsuki",
  "Szturmowe Wiewióry",
  "Kompasowe Czosnki",
  "Dzikie Lampiony",
  "Sokole Klapki",
  "Niewyspani Tropiciele",
  "Biegnące Jeże",
  "Oddział Chrupka",
  "Ekipa Bez GPS",
];

const STATION_POINTS: Record<string, number> = {
  "g-1": 100,
  "g-2": 180,
  "g-3": 220,
  "g-4": 130,
  "g-5": 160,
};

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

class MobileApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeStatus(status: RealizationStatus, scheduledAt: string): RealizationStatus {
  const timestamp = new Date(scheduledAt).getTime();

  if (Number.isFinite(timestamp) && timestamp < Date.now()) {
    return "done";
  }

  return status;
}

function isExpired(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

function generateSessionToken() {
  return `mob_${crypto.randomUUID().replace(/-/g, "")}`;
}

function toLowerSafe(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function parseTeamColor(color: string): TeamColor {
  if (!TEAM_COLORS.includes(color as TeamColor)) {
    throw new MobileApiError(400, "Invalid team color");
  }

  return color as TeamColor;
}

function emitEvent(log: Omit<EventLog, "id" | "createdAt">) {
  eventLogs.push({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...log,
  });
}

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const realizations: MobileRealization[] = [
  {
    id: "r-2",
    companyName: "Baltic Logistics",
    status: "in-progress",
    scheduledAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    locationRequired: true,
    joinCode: "BL2026",
    teamCount: 6,
    stationIds: ["g-2", "g-3"],
    createdAt: new Date(now - 2 * dayMs).toISOString(),
    updatedAt: new Date(now - dayMs).toISOString(),
  },
  {
    id: "r-3",
    companyName: "Horizon Tech",
    status: "planned",
    scheduledAt: new Date(now + dayMs).toISOString(),
    locationRequired: false,
    joinCode: "HZ2026",
    teamCount: 3,
    stationIds: ["g-1", "g-4", "g-5"],
    createdAt: new Date(now - dayMs).toISOString(),
    updatedAt: new Date(now - dayMs).toISOString(),
  },
];

const teams: MobileTeam[] = realizations.flatMap((realization) =>
  Array.from({ length: realization.teamCount }, (_, index) => {
    const createdAt = nowIso();
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
      status: "unassigned",
      createdAt,
      updatedAt: createdAt,
    };
  }),
);

let assignments: TeamAssignment[] = [];
let taskProgresses: TeamTaskProgress[] = [];
const eventLogs: EventLog[] = [];

function getRealizationByJoinCode(joinCode: string) {
  return realizations.find((realization) => realization.joinCode.toLowerCase() === joinCode.toLowerCase().trim());
}

function getAssignmentByToken(sessionToken: string) {
  return assignments.find((assignment) => assignment.sessionToken === sessionToken);
}

function touchAssignment(assignment: TeamAssignment) {
  const refreshedAt = nowIso();
  assignment.lastSeenAt = refreshedAt;
  assignment.expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

function requireSession(sessionToken: string) {
  if (!sessionToken?.trim()) {
    throw new MobileApiError(401, "Missing session token");
  }

  const assignment = getAssignmentByToken(sessionToken.trim());

  if (!assignment) {
    throw new MobileApiError(401, "Invalid session token");
  }

  if (isExpired(assignment.expiresAt)) {
    assignments = assignments.filter((item) => item.id !== assignment.id);
    throw new MobileApiError(401, "Session expired");
  }

  touchAssignment(assignment);

  const team = teams.find((item) => item.id === assignment.teamId);
  const realization = realizations.find((item) => item.id === assignment.realizationId);

  if (!team || !realization) {
    throw new MobileApiError(404, "Session resources not found");
  }

  return { assignment, team, realization };
}

function getTeamById(teamId: string) {
  return teams.find((team) => team.id === teamId);
}

function recalculateTeamPoints(teamId: string) {
  const doneTasks = taskProgresses.filter((progress) => progress.teamId === teamId && progress.status === "done");
  const points = doneTasks.reduce((sum, item) => sum + item.pointsAwarded, 0);

  const team = getTeamById(teamId);

  if (!team) {
    return;
  }

  team.points = points;
  team.taskStats.done = doneTasks.length;
  team.updatedAt = nowIso();
}

function resolveCurrentMobileRealization() {
  if (realizations.length === 0) {
    throw new MobileApiError(404, "Realization not found");
  }

  const normalized = realizations.map((realization) => ({
    ...realization,
    status: normalizeStatus(realization.status, realization.scheduledAt),
  }));

  const inProgress = normalized.find((item) => item.status === "in-progress");

  if (inProgress) {
    return inProgress;
  }

  const planned = normalized
    .filter((item) => item.status === "planned")
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());

  if (planned.length > 0) {
    return planned[0];
  }

  return normalized
    .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime())[0];
}

export function joinMobileSession(input: JoinSessionInput) {
  const joinCode = input.joinCode?.trim();
  const deviceId = input.deviceId?.trim();

  if (!joinCode || !deviceId) {
    throw new MobileApiError(400, "Invalid payload");
  }

  const realization = getRealizationByJoinCode(joinCode);

  if (!realization) {
    throw new MobileApiError(404, "Invalid join code");
  }

  realization.status = normalizeStatus(realization.status, realization.scheduledAt);

  const existingAssignment = assignments.find(
    (assignment) => assignment.realizationId === realization.id && assignment.deviceId === deviceId,
  );

  if (existingAssignment && !isExpired(existingAssignment.expiresAt)) {
    touchAssignment(existingAssignment);

    const existingTeam = getTeamById(existingAssignment.teamId);

    if (!existingTeam) {
      throw new MobileApiError(404, "Team not found");
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

  const freeTeam = teams
    .filter((team) => team.realizationId === realization.id)
    .sort((left, right) => left.slotNumber - right.slotNumber)
    .find((team) => !assignments.some((assignment) => assignment.teamId === team.id && !isExpired(assignment.expiresAt)));

  if (!freeTeam) {
    throw new MobileApiError(409, "No free team slots");
  }

  const assignedAt = nowIso();
  const assignment: TeamAssignment = {
    id: crypto.randomUUID(),
    realizationId: realization.id,
    teamId: freeTeam.id,
    deviceId,
    memberName: input.memberName?.trim() || null,
    sessionToken: generateSessionToken(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    lastSeenAt: assignedAt,
    createdAt: assignedAt,
  };

  assignments = [...assignments, assignment];

  freeTeam.status = "active";
  freeTeam.updatedAt = assignedAt;

  emitEvent({
    realizationId: realization.id,
    teamId: freeTeam.id,
    actorType: "mobile-device",
    actorId: deviceId,
    eventType: "team_joined",
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

export function getMobileSessionState(sessionToken: string) {
  const { assignment, team, realization } = requireSession(sessionToken);

  const teamTasks = realization.stationIds.map((stationId) => {
    const progress = taskProgresses.find((item) => item.realizationId === realization.id && item.teamId === team.id && item.stationId === stationId);

    return {
      stationId,
      status: (progress?.status || "todo") as TaskStatus,
      pointsAwarded: progress?.pointsAwarded || 0,
    };
  });

  return {
    realization: {
      id: realization.id,
      status: normalizeStatus(realization.status, realization.scheduledAt),
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
      eventLogCount: eventLogs.filter((event) => event.realizationId === realization.id).length,
    },
  };
}

export function claimMobileTeam(input: ClaimTeamInput) {
  const { assignment, team, realization } = requireSession(input.sessionToken);
  const teamName = input.name?.trim();
  const color = parseTeamColor(input.color?.trim());

  if (!teamName) {
    throw new MobileApiError(400, "Team name is required");
  }

  const takenByName = teams.find(
    (item) => item.realizationId === realization.id && item.id !== team.id && toLowerSafe(item.name) === teamName.toLowerCase(),
  );

  if (takenByName) {
    throw new MobileApiError(409, "Team name already taken");
  }

  const takenByColor = teams.find(
    (item) => item.realizationId === realization.id && item.id !== team.id && item.color === color,
  );

  if (takenByColor) {
    throw new MobileApiError(409, "Team color already taken");
  }

  const changedFields: string[] = [];

  if (team.name !== teamName) {
    changedFields.push("name");
    emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: "mobile-device",
      actorId: assignment.deviceId,
      eventType: "team_name_set",
      payload: {
        previous: team.name,
        next: teamName,
      },
    });
  }

  if (team.color !== color) {
    changedFields.push("color");
    emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: "mobile-device",
      actorId: assignment.deviceId,
      eventType: "team_color_set",
      payload: {
        previous: team.color,
        next: color,
      },
    });
  }

  const nextBadgeKey = input.badgeKey?.trim() || null;
  const nextBadgeImageUrl = input.badgeImageUrl?.trim() || null;

  if (team.badgeKey !== nextBadgeKey || team.badgeImageUrl !== nextBadgeImageUrl) {
    changedFields.push("badge");
    emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: "mobile-device",
      actorId: assignment.deviceId,
      eventType: "team_badge_set",
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
  team.status = "active";
  team.updatedAt = nowIso();

  return {
    teamId: team.id,
    name: team.name,
    color: team.color,
    badgeKey: team.badgeKey,
    changedFields,
  };
}

export function randomizeMobileTeam(input: RandomizeTeamInput) {
  const { assignment, team, realization } = requireSession(input.sessionToken);

  const usedNames = new Set(
    teams
      .filter((item) => item.realizationId === realization.id && item.id !== team.id && item.name)
      .map((item) => toLowerSafe(item.name)),
  );

  const availableNames = FUNNY_TEAM_NAMES.filter((name) => !usedNames.has(name.toLowerCase()));

  if (availableNames.length === 0) {
    throw new MobileApiError(409, "No unique random names left");
  }

  const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
  const randomBadgeKey = BADGE_KEYS[Math.floor(Math.random() * BADGE_KEYS.length)] || null;

  team.name = randomName;

  if (!team.color) {
    const usedColors = new Set(
      teams.filter((item) => item.realizationId === realization.id && item.id !== team.id && item.color).map((item) => item.color),
    );

    const availableColors = TEAM_COLORS.filter((color) => !usedColors.has(color));

    if (availableColors.length > 0) {
      team.color = availableColors[Math.floor(Math.random() * availableColors.length)] || null;
    }
  }

  team.badgeKey = randomBadgeKey;
  team.status = "active";
  team.updatedAt = nowIso();

  emitEvent({
    realizationId: realization.id,
    teamId: team.id,
    actorType: "mobile-device",
    actorId: assignment.deviceId,
    eventType: "team_name_randomized",
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

export function updateMobileTeamLocation(input: LocationInput) {
  const { assignment, team, realization } = requireSession(input.sessionToken);

  if (!isFiniteNumber(input.lat) || !isFiniteNumber(input.lng)) {
    throw new MobileApiError(400, "Invalid coordinates");
  }

  const locationAt = input.at ? new Date(input.at).toISOString() : nowIso();

  team.lastLocation = {
    lat: input.lat,
    lng: input.lng,
    accuracy: isFiniteNumber(input.accuracy) ? input.accuracy : undefined,
    at: locationAt,
  };
  team.updatedAt = nowIso();

  emitEvent({
    realizationId: realization.id,
    teamId: team.id,
    actorType: "mobile-device",
    actorId: assignment.deviceId,
    eventType: "team_location_updated",
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

export function completeMobileTask(input: CompleteTaskInput) {
  const { assignment, team, realization } = requireSession(input.sessionToken);

  if (!input.stationId?.trim() || !isFiniteNumber(input.pointsAwarded) || input.pointsAwarded < 0) {
    throw new MobileApiError(400, "Invalid payload");
  }

  if (!realization.stationIds.includes(input.stationId)) {
    throw new MobileApiError(400, "Station not available in this realization");
  }

  if (realization.locationRequired && !team.lastLocation) {
    throw new MobileApiError(400, "Location update is required for this realization");
  }

  const existingDone = taskProgresses.find(
    (progress) =>
      progress.realizationId === realization.id &&
      progress.teamId === team.id &&
        progress.stationId === input.stationId &&
      progress.status === "done",
  );

  if (existingDone) {
    throw new MobileApiError(409, "Task already completed");
  }

  const finishedAt = input.finishedAt ? new Date(input.finishedAt).toISOString() : nowIso();
  const defaultPoints = STATION_POINTS[input.stationId] ?? 0;

  const progress: TeamTaskProgress = {
    id: crypto.randomUUID(),
    realizationId: realization.id,
    teamId: team.id,
    stationId: input.stationId,
    status: "done",
    pointsAwarded: Math.round(input.pointsAwarded || defaultPoints),
    startedAt: null,
    finishedAt,
    updatedAt: nowIso(),
  };

  taskProgresses = [...taskProgresses, progress];

  recalculateTeamPoints(team.id);

  emitEvent({
    realizationId: realization.id,
    teamId: team.id,
    actorType: "mobile-device",
    actorId: assignment.deviceId,
    eventType: "task_completed",
    payload: {
      stationId: input.stationId,
      pointsAwarded: progress.pointsAwarded,
      finishedAt,
    },
  });

  emitEvent({
    realizationId: realization.id,
    teamId: team.id,
    actorType: "system",
    actorId: "system",
    eventType: "points_recalculated",
    payload: {
      pointsTotal: team.points,
      taskDone: team.taskStats.done,
    },
  });

  return {
    teamId: team.id,
    stationId: input.stationId,
    pointsTotal: team.points,
    taskStatus: "done" as const,
  };
}

export function getMobileAdminRealizationOverview(realizationId: string) {
  const requestedId = realizationId.trim();
  const directRealization =
    requestedId && requestedId !== "current"
      ? realizations.find((item) => item.id === requestedId)
      : null;

  const realization = directRealization ?? resolveCurrentMobileRealization();

  if (!realization) {
    throw new MobileApiError(404, "Realization not found");
  }

  realization.status = normalizeStatus(realization.status, realization.scheduledAt);

  const realizationTeams = teams
    .filter((item) => item.realizationId === realization.id)
    .sort((left, right) => left.slotNumber - right.slotNumber)
    .map((team) => {
      const teamAssignments = assignments.filter(
        (assignment) => assignment.teamId === team.id && !isExpired(assignment.expiresAt),
      );

      const teamTasks = realization.stationIds.map((stationId) => {
        const progress = taskProgresses.find(
          (item) => item.realizationId === realization.id && item.teamId === team.id && item.stationId === stationId,
        );

        return {
          stationId,
          status: (progress?.status || "todo") as TaskStatus,
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

  const realizationLogs = eventLogs
    .filter((event) => event.realizationId === realization.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

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
        defaultPoints: STATION_POINTS[stationId] ?? 0,
      })),
      updatedAt: realization.updatedAt,
    },
    teams: realizationTeams,
    logs: realizationLogs,
    stats: {
      activeTeams: realizationTeams.filter((team) => team.status === "active").length,
      completedTasks: realizationTeams.reduce((sum, team) => sum + team.tasks.filter((task) => task.status === "done").length, 0),
      pointsTotal: realizationTeams.reduce((sum, team) => sum + team.points, 0),
      eventCount: realizationLogs.length,
    },
  };
}

export function getMobileBootstrap() {
  return {
    serverTime: nowIso(),
    teamColors: TEAM_COLORS,
    badgeKeys: BADGE_KEYS,
    realizations: realizations.map((realization) => ({
      id: realization.id,
      companyName: realization.companyName,
      status: normalizeStatus(realization.status, realization.scheduledAt),
      scheduledAt: realization.scheduledAt,
      joinCode: realization.joinCode,
      locationRequired: realization.locationRequired,
      teamCount: realization.teamCount,
      stationIds: realization.stationIds,
    })),
  };
}

export function toApiError(error: unknown) {
  if (error instanceof MobileApiError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "Internal server error",
  };
}

export type { TeamColor };
export { TEAM_COLORS };