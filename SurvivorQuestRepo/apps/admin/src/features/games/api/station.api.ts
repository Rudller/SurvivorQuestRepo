import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Station, StationType } from "../types/station";

type StationDto = {
  id: string;
  name: string;
  type?: StationType;
  description: string;
  imageUrl?: string | null;
  points: number;
  timeLimitSeconds?: number;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  createdAt: string;
  updatedAt: string;
};

type CreateStationPayload = {
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds?: number;
};

type UpdateStationPayload = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds?: number;
};

type DeleteStationPayload = {
  id: string;
  confirmName: string;
};

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
    sourceTemplateId: station.sourceTemplateId,
    scenarioInstanceId: station.scenarioInstanceId,
    realizationId: station.realizationId,
    createdAt: station.createdAt,
    updatedAt: station.updatedAt,
  };
}

export const stationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStations: build.query<Station[], void>({
      query: () => buildApiPath("/station"),
      transformResponse: (response: StationDto[]) => response.map(normalizeStation),
      providesTags: ["Station"],
    }),
    createStation: build.mutation<Station, CreateStationPayload>({
      query: (body) => ({
        url: buildApiPath("/station"),
        method: "POST",
        body,
      }),
      transformResponse: (response: StationDto) => normalizeStation(response),
      invalidatesTags: ["Station"],
    }),
    updateStation: build.mutation<Station, UpdateStationPayload>({
      query: (body) => ({
        url: buildApiPath("/station"),
        method: "PUT",
        body,
      }),
      transformResponse: (response: StationDto) => normalizeStation(response),
      invalidatesTags: ["Station"],
    }),
    deleteStation: build.mutation<{ id: string }, DeleteStationPayload>({
      query: (body) => ({
        url: buildApiPath("/station"),
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Station"],
    }),
  }),
});

export const {
  useGetStationsQuery,
  useCreateStationMutation,
  useUpdateStationMutation,
  useDeleteStationMutation,
} = stationApi;
