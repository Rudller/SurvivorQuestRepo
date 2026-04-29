import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { StationType } from "@/features/games/types/station";
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

function toMobileAdminRealizationPath(realizationId: string | undefined, suffix = "") {
  const normalizedId = realizationId?.trim();
  if (!normalizedId || normalizedId === "current") {
    return buildApiPath(`/mobile/admin/realizations/current${suffix}`);
  }

  return buildApiPath(`/mobile/admin/realizations/${encodeURIComponent(normalizedId)}${suffix}`);
}

function toMobileAdminTeamTaskPath(
  realizationId: string | undefined,
  teamId: string,
  stationId: string,
  action: "reset" | "complete" | "fail",
) {
  return toMobileAdminRealizationPath(
    realizationId,
    `/teams/${encodeURIComponent(teamId)}/tasks/${encodeURIComponent(stationId)}/${action}`,
  );
}

function normalizeOverview(raw: unknown): CurrentRealizationOverview {
  const source = asRecord(raw);
  const realization = asRecord(source.realization);
  const stats = asRecord(source.stats);

  return {
    realization: {
      id: asString(realization.id),
      companyName: asString(realization.companyName ?? realization.company_name),
      introText: (() => {
        const value = realization.introText ?? realization.intro_text;
        return typeof value === "string" ? value : null;
      })(),
      status: asString(realization.status, "planned") as CurrentRealizationOverview["realization"]["status"],
      scheduledAt: asString(realization.scheduledAt ?? realization.scheduled_at),
      locationRequired: asBoolean(realization.locationRequired ?? realization.location_required),
      joinCode: asString(realization.joinCode ?? realization.join_code),
      teamCount: asNumber(realization.teamCount ?? realization.team_count),
      stationIds: asArray(realization.stationIds ?? realization.station_ids)
        .map((value) => asString(value))
        .filter(Boolean),
      stations: asArray(realization.stations).map((value) => {
        const item = asRecord(value);
        const latitudeCandidate = item.latitude ?? item.lat;
        const longitudeCandidate = item.longitude ?? item.lng;
        return {
          stationId: asString(item.stationId ?? item.station_id),
          stationName: asString(item.stationName ?? item.station_name),
          stationType: asString(item.stationType ?? item.station_type, "quiz"),
          defaultPoints: asNumber(item.defaultPoints ?? item.default_points),
          latitude:
            typeof latitudeCandidate === "number" && Number.isFinite(latitudeCandidate)
              ? latitudeCandidate
              : null,
          longitude:
            typeof longitudeCandidate === "number" && Number.isFinite(longitudeCandidate)
              ? longitudeCandidate
              : null,
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
            stationId: asString(task.stationId ?? task.station_id),
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
        teamSlot: (() => {
          const value = log.teamSlot ?? log.team_slot;
          if (value === null || typeof value === "undefined") {
            return null;
          }
          return asNumber(value, 0);
        })(),
        teamName: (log.teamName as string | null) ?? (log.team_name as string | null) ?? null,
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

export type CurrentRealizationStationQrResponse = {
  realizationId: string;
  issuedAt: string;
  expiresAt: string;
  tokenTtlSeconds: number;
  entries: Array<{
    stationId: string;
    stationName: string;
    stationType: StationType;
    completionCode: string | null;
    qrToken: string;
    entryUrl: string;
  }>;
};

type TeamTaskAdminMutationResponse = {
  realizationId: string;
  teamId: string;
  stationId: string;
  pointsTotal: number;
  pointsAwarded: number;
  taskStatus: CurrentRealizationOverview["teams"][number]["tasks"][number]["status"];
  updatedAt: string;
};

export const currentRealizationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentRealizationOverview: build.query<
      CurrentRealizationOverview,
      { realizationId?: string } | void
    >({
      query: (arg) => toMobileAdminRealizationPath(arg?.realizationId),
      transformResponse: (response: unknown) => normalizeOverview(response),
      providesTags: ["Realization"],
    }),
    resetCurrentRealizationCompletedTasks: build.mutation<
      { realizationId: string; resetCount: number; affectedTeams: number },
      { realizationId?: string } | void
    >({
      query: (arg) => ({
        url: toMobileAdminRealizationPath(arg?.realizationId, "/reset-completed-tasks"),
        method: "POST",
      }),
      invalidatesTags: ["Realization"],
    }),
    startCurrentRealization: build.mutation<
      { realizationId: string; status: "in-progress"; started: boolean; startedAt: string },
      { realizationId?: string } | void
    >({
      query: (arg) => ({
        url: toMobileAdminRealizationPath(arg?.realizationId, "/start"),
        method: "POST",
      }),
      invalidatesTags: ["Realization"],
    }),
    finishCurrentRealization: build.mutation<
      { realizationId: string; status: "done"; finished: boolean; finishedAt: string },
      { realizationId?: string } | void
    >({
      query: (arg) => ({
        url: toMobileAdminRealizationPath(arg?.realizationId, "/finish"),
        method: "POST",
      }),
      invalidatesTags: ["Realization"],
    }),
    resetCurrentRealization: build.mutation<
      {
        realizationId: string;
        status: "planned";
        resetAt: string;
        deletedAssignments: number;
        deletedTaskProgress: number;
        deletedRuntimeEvents: number;
      },
      { realizationId?: string } | void
    >({
      query: (arg) => ({
        url: toMobileAdminRealizationPath(arg?.realizationId, "/reset"),
        method: "POST",
      }),
      invalidatesTags: ["Realization"],
    }),
    getCurrentRealizationStationQrs: build.query<
      CurrentRealizationStationQrResponse,
      { realizationId?: string; ttlSeconds?: number } | void
    >({
      query: (arg) => {
        const realizationId = arg?.realizationId;
        const ttlSeconds = arg?.ttlSeconds;
        const suffix =
          typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds)
            ? `?ttlSeconds=${Math.max(1, Math.round(ttlSeconds))}`
            : "";
        return toMobileAdminRealizationPath(realizationId, `/station-qr${suffix}`);
      },
    }),
    resetCurrentRealizationTeamTask: build.mutation<
      TeamTaskAdminMutationResponse,
      { realizationId?: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: toMobileAdminTeamTaskPath(realizationId, teamId, stationId, "reset"),
        method: "POST",
      }),
      invalidatesTags: ["Realization"],
    }),
    completeCurrentRealizationTeamTask: build.mutation<
      TeamTaskAdminMutationResponse,
      { realizationId?: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: toMobileAdminTeamTaskPath(realizationId, teamId, stationId, "complete"),
        method: "POST",
      }),
      invalidatesTags: ["Realization"],
    }),
    failCurrentRealizationTeamTask: build.mutation<
      TeamTaskAdminMutationResponse,
      { realizationId?: string; teamId: string; stationId: string; reason?: string }
    >({
      query: ({ realizationId, teamId, stationId, reason }) => ({
        url: toMobileAdminTeamTaskPath(realizationId, teamId, stationId, "fail"),
        method: "POST",
        body: typeof reason === "string" && reason.trim().length > 0 ? { reason } : undefined,
      }),
      invalidatesTags: ["Realization"],
    }),
  }),
});

export const {
  useGetCurrentRealizationOverviewQuery,
  useResetCurrentRealizationCompletedTasksMutation,
  useStartCurrentRealizationMutation,
  useFinishCurrentRealizationMutation,
  useResetCurrentRealizationMutation,
  useGetCurrentRealizationStationQrsQuery,
  useResetCurrentRealizationTeamTaskMutation,
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
} = currentRealizationApi;
