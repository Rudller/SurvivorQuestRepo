import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Station, StationType } from "@/features/games/types/station";
import type { Realization, RealizationStatus, RealizationStationDraft, RealizationType } from "../types/realization";

type StationDto = {
  id: string;
  name: string;
  type?: StationType;
  description: string;
  imageUrl?: string | null;
  points: number;
  timeLimitSeconds?: number;
  latitude?: number | null;
  longitude?: number | null;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  createdAt: string;
  updatedAt: string;
};

type RealizationDto = {
  id: string;
  companyName: string;
  location?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: string[];
  type?: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  joinCode?: string;
  stationIds?: string[];
  scenarioStations?: StationDto[];
  teamCount: number;
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
  location?: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  changedBy?: string;
  scenarioStations?: RealizationStationDraft[];
};

type UpdateRealizationPayload = {
  id: string;
  companyName: string;
  location?: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  changedBy?: string;
  scenarioStations?: RealizationStationDraft[];
};

type UploadRealizationAssetResponse = {
  key: string;
  url: string;
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
  const scenarioStations = (dto.scenarioStations ?? []).map(normalizeStation);
  const instructors = Array.isArray(dto.instructors)
    ? dto.instructors
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .filter((item, index, list) => list.indexOf(item) === index)
    : [];

  return {
    id: dto.id,
    companyName: dto.companyName,
    location: dto.location?.trim() || undefined,
    contactPerson: dto.contactPerson?.trim() || "",
    contactPhone: dto.contactPhone?.trim() || undefined,
    contactEmail: dto.contactEmail?.trim() || undefined,
    instructors,
    type: dto.type ?? "outdoor-games",
    logoUrl: dto.logoUrl,
    offerPdfUrl: dto.offerPdfUrl,
    offerPdfName: dto.offerPdfName,
    scenarioId: dto.scenarioId,
    joinCode: dto.joinCode?.trim() || "------",
    stationIds: dto.stationIds ?? scenarioStations.map((station) => station.id),
    scenarioStations,
    teamCount: dto.teamCount,
    peopleCount: dto.peopleCount,
    positionsCount: dto.positionsCount,
    status: dto.status,
    scheduledAt: dto.scheduledAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    logs: dto.logs,
  };
}

function getFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function normalizeStation(station: StationDto): Station {
  const trimmedName = station.name?.trim() || "Untitled station";
  const safePoints = Number.isFinite(station.points) && station.points > 0 ? station.points : 1;
  const safeTimeLimitSeconds =
    Number.isFinite(station.timeLimitSeconds) && (station.timeLimitSeconds ?? -1) >= 0
      ? Math.round(station.timeLimitSeconds as number)
      : 0;

  return {
    id: station.id,
    name: trimmedName,
    type: station.type ?? "quiz",
    description: station.description?.trim() || "",
    imageUrl: station.imageUrl?.trim() || getFallbackImage(station.id || trimmedName),
    points: safePoints,
    timeLimitSeconds: safeTimeLimitSeconds,
    latitude: Number.isFinite(station.latitude) ? station.latitude ?? undefined : undefined,
    longitude: Number.isFinite(station.longitude) ? station.longitude ?? undefined : undefined,
    sourceTemplateId: station.sourceTemplateId,
    scenarioInstanceId: station.scenarioInstanceId,
    realizationId: station.realizationId,
    createdAt: station.createdAt,
    updatedAt: station.updatedAt,
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
    uploadRealizationLogo: build.mutation<UploadRealizationAssetResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: buildApiPath("/realizations/upload-logo"),
          method: "POST",
          body: formData,
        };
      },
    }),
    uploadRealizationOffer: build.mutation<UploadRealizationAssetResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: buildApiPath("/realizations/upload-offer"),
          method: "POST",
          body: formData,
        };
      },
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
  useUploadRealizationLogoMutation,
  useUploadRealizationOfferMutation,
  useGetMobileAdminRealizationOverviewQuery,
} = realizationApi;
