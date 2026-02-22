import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Realization, RealizationStatus } from "../types/realization";

type RealizationDto = {
  id: string;
  companyName: string;
  scenarioId: string;
  stationIds?: string[];
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: Realization["logs"];
};

type CreateRealizationPayload = {
  companyName: string;
  scenarioId: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  changedBy?: string;
};

type UpdateRealizationPayload = {
  id: string;
  companyName: string;
  scenarioId: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  changedBy?: string;
};

type MobileAdminRealizationOverview = {
  realization: {
    id: string;
    companyName: string;
    status: RealizationStatus;
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
    status: "unassigned" | "active" | "offline";
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
      status: "todo" | "in-progress" | "done";
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

function normalizeRealization(dto: RealizationDto): Realization {
  return {
    id: dto.id,
    companyName: dto.companyName,
    scenarioId: dto.scenarioId,
    stationIds: dto.stationIds ?? [],
    teamCount: dto.teamCount,
    requiredDevicesCount: dto.requiredDevicesCount,
    peopleCount: dto.peopleCount,
    positionsCount: dto.positionsCount,
    status: dto.status,
    scheduledAt: dto.scheduledAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    logs: dto.logs,
  };
}

export const realizationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRealizations: build.query<Realization[], void>({
      query: () => buildApiPath("/realizations"),
      transformResponse: (response: RealizationDto[]) => response.map(normalizeRealization),
      providesTags: ["Realization"],
    }),
    createRealization: build.mutation<Realization, CreateRealizationPayload>({
      query: (body) => ({
        url: buildApiPath("/realizations"),
        method: "POST",
        body,
      }),
      transformResponse: (response: RealizationDto) => normalizeRealization(response),
      invalidatesTags: ["Realization"],
    }),
    updateRealization: build.mutation<Realization, UpdateRealizationPayload>({
      query: (body) => ({
        url: buildApiPath("/realizations"),
        method: "PUT",
        body,
      }),
      transformResponse: (response: RealizationDto) => normalizeRealization(response),
      invalidatesTags: ["Realization"],
    }),
    getMobileAdminRealizationOverview: build.query<MobileAdminRealizationOverview, string>({
      query: (realizationId) => buildApiPath(`/mobile/admin/realizations/${realizationId}`),
    }),
  }),
});

export const {
  useGetRealizationsQuery,
  useCreateRealizationMutation,
  useUpdateRealizationMutation,
  useGetMobileAdminRealizationOverviewQuery,
} = realizationApi;
