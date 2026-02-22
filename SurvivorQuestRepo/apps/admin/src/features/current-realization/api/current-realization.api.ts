import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeOverview(raw: unknown): CurrentRealizationOverview {
  const source = asRecord(raw);
  const realization = asRecord(source.realization);
  const stats = asRecord(source.stats);

  return {
    realization: {
      id: asString(realization.id),
      companyName: asString(realization.companyName ?? realization.company_name),
      status: asString(realization.status, "planned") as CurrentRealizationOverview["realization"]["status"],
      scheduledAt: asString(realization.scheduledAt ?? realization.scheduled_at),
      locationRequired: asBoolean(realization.locationRequired ?? realization.location_required),
      joinCode: asString(realization.joinCode ?? realization.join_code),
      teamCount: asNumber(realization.teamCount ?? realization.team_count),
      gameIds: asArray(realization.gameIds ?? realization.game_ids).map((value) => asString(value)).filter(Boolean),
      games: asArray(realization.games).map((value) => {
        const item = asRecord(value);
        return {
          gameId: asString(item.gameId ?? item.game_id),
          defaultPoints: asNumber(item.defaultPoints ?? item.default_points),
        };
      }),
      updatedAt: asString(realization.updatedAt ?? realization.updated_at),
    },
    teams: asArray(source.teams).map((value) => {
      const team = asRecord(value);

      return {
        id: asString(team.id),
        slotNumber: asNumber(team.slotNumber ?? team.slot_number),
        name: (team.name as string | null) ?? null,
        color: (team.color as string | null) ?? null,
        badgeKey: (team.badgeKey as string | null) ?? (team.badge_key as string | null) ?? null,
        badgeImageUrl:
          (team.badgeImageUrl as string | null) ?? (team.badge_image_url as string | null) ?? null,
        points: asNumber(team.points),
        status: asString(team.status, "unassigned") as CurrentRealizationOverview["teams"][number]["status"],
        taskStats: {
          total: asNumber(asRecord(team.taskStats ?? team.task_stats).total),
          done: asNumber(asRecord(team.taskStats ?? team.task_stats).done),
        },
        lastLocation: (() => {
          const location = team.lastLocation ?? team.last_location;

          if (!location) {
            return null;
          }

          const parsed = asRecord(location);

          return {
            lat: asNumber(parsed.lat),
            lng: asNumber(parsed.lng),
            accuracy: asNumber(parsed.accuracy),
            at: asString(parsed.at),
          };
        })(),
        deviceCount: asNumber(team.deviceCount ?? team.device_count),
        devices: asArray(team.devices).map((item) => {
          const device = asRecord(item);
          return {
            deviceId: asString(device.deviceId ?? device.device_id),
            memberName: (device.memberName as string | null) ?? (device.member_name as string | null) ?? null,
            lastSeenAt: asString(device.lastSeenAt ?? device.last_seen_at),
            expiresAt: asString(device.expiresAt ?? device.expires_at),
          };
        }),
        tasks: asArray(team.tasks).map((item) => {
          const task = asRecord(item);
          return {
            gameId: asString(task.gameId ?? task.game_id),
            status: asString(task.status, "todo") as CurrentRealizationOverview["teams"][number]["tasks"][number]["status"],
            pointsAwarded: asNumber(task.pointsAwarded ?? task.points_awarded),
            finishedAt: (task.finishedAt as string | null) ?? (task.finished_at as string | null) ?? null,
          };
        }),
        updatedAt: asString(team.updatedAt ?? team.updated_at),
      };
    }),
    logs: asArray(source.logs).map((value) => {
      const log = asRecord(value);

      return {
        id: asString(log.id),
        realizationId: asString(log.realizationId ?? log.realization_id),
        teamId: (log.teamId as string | null) ?? (log.team_id as string | null) ?? null,
        actorType: asString(log.actorType ?? log.actor_type, "system") as CurrentRealizationOverview["logs"][number]["actorType"],
        actorId: asString(log.actorId ?? log.actor_id),
        eventType: asString(log.eventType ?? log.event_type),
        payload: asRecord(log.payload),
        createdAt: asString(log.createdAt ?? log.created_at),
      };
    }),
    stats: {
      activeTeams: asNumber(stats.activeTeams ?? stats.active_teams),
      completedTasks: asNumber(stats.completedTasks ?? stats.completed_tasks),
      pointsTotal: asNumber(stats.pointsTotal ?? stats.points_total),
      eventCount: asNumber(stats.eventCount ?? stats.event_count),
    },
  };
}

export const currentRealizationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentRealizationOverview: build.query<CurrentRealizationOverview, void>({
      query: () => buildApiPath("/mobile/admin/realizations/current"),
      transformResponse: (response: unknown) => normalizeOverview(response),
    }),
  }),
});

export const { useGetCurrentRealizationOverviewQuery } = currentRealizationApi;
