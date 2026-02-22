export type CurrentRealizationStatus = "planned" | "in-progress" | "done";

export type CurrentTeamTaskStatus = "todo" | "in-progress" | "done";

export type CurrentTeamStatus = "unassigned" | "active" | "offline";

export type CurrentRealizationOverview = {
  realization: {
    id: string;
    companyName: string;
    status: CurrentRealizationStatus;
    scheduledAt: string;
    locationRequired: boolean;
    joinCode: string;
    teamCount: number;
    stationIds: string[];
    stations: Array<{ stationId: string; defaultPoints: number }>;
    updatedAt: string;
  };
  teams: Array<{
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    badgeImageUrl: string | null;
    points: number;
    status: CurrentTeamStatus;
    taskStats: { total: number; done: number };
    lastLocation: { lat: number; lng: number; accuracy?: number; at: string } | null;
    deviceCount: number;
    devices: Array<{
      deviceId: string;
      memberName: string | null;
      lastSeenAt: string;
      expiresAt: string;
    }>;
    tasks: Array<{
      stationId: string;
      status: CurrentTeamTaskStatus;
      pointsAwarded: number;
      finishedAt: string | null;
    }>;
    updatedAt: string;
  }>;
  logs: Array<{
    id: string;
    realizationId: string;
    teamId: string | null;
    actorType: "admin" | "mobile-device" | "system";
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  stats: {
    activeTeams: number;
    completedTasks: number;
    pointsTotal: number;
    eventCount: number;
  };
};
