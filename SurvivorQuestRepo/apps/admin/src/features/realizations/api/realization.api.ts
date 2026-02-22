import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Realization, RealizationStatus } from "../types/realization";

type CreateRealizationPayload = {
  companyName: string;
  gameIds: string[];
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
  gameIds: string[];
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
    gameIds: string[];
    games: Array<{ gameId: string; defaultPoints: number }>;
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
      gameId: string;
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

export const realizationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRealizations: build.query<Realization[], void>({
      query: () => buildApiPath("/realizations"),
      providesTags: ["Realization"],
    }),
    createRealization: build.mutation<Realization, CreateRealizationPayload>({
      query: (body) => ({
        url: buildApiPath("/realizations"),
        method: "POST",
        body,
      }),
      invalidatesTags: ["Realization"],
    }),
    updateRealization: build.mutation<Realization, UpdateRealizationPayload>({
      query: (body) => ({
        url: buildApiPath("/realizations"),
        method: "PUT",
        body,
      }),
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
