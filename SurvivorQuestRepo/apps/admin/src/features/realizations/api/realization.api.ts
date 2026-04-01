import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Station, StationKind, StationType } from "@/features/games/types/station";
import { normalizeStationQuiz } from "@/features/games/station.utils";
import type {
  Realization,
  RealizationLanguage,
  RealizationStatus,
  RealizationStationDraft,
  RealizationType,
} from "../types/realization";

type StationDto = {
  id: string;
  name: string;
  type?: StationType;
  description: string;
  imageUrl?: string | null;
  points: number;
  timeLimitSeconds?: number;
  completionCode?: string | null;
  quiz?:
    | {
        question?: string;
        answers?: string[];
        correctAnswerIndex?: number;
      }
    | null;
  translations?:
    | Partial<
        Record<
          "polish" | "english" | "ukrainian" | "russian" | "other",
          {
            name?: string;
            description?: string;
            quiz?: {
              question?: string;
              answers?: string[];
              correctAnswerIndex?: number;
            };
          }
        >
      >
    | null;
  latitude?: number | null;
  longitude?: number | null;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  kind?: StationKind;
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
};

type RealizationDto = {
  id: string;
  companyName: string;
  location?: string;
  language?: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: string[];
  type?: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  scenarioTemplateId?: string;
  scenarioTemplateName?: string;
  joinCode?: string;
  stationIds?: string[];
  scenarioStations?: StationDto[];
  teamCount: number;
  requiredDevicesCount?: number;
  peopleCount: number;
  positionsCount: number;
  durationMinutes?: number;
  locationRequired?: boolean;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: Realization["logs"];
};

type CreateRealizationPayload = {
  companyName: string;
  location?: string;
  language: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
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
  durationMinutes: number;
  status: RealizationStatus;
  scheduledAt: string;
  changedBy?: string;
  scenarioStations?: RealizationStationDraft[];
};

type UpdateRealizationPayload = {
  id: string;
  companyName: string;
  location?: string;
  language: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
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
  durationMinutes: number;
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

export type RealizationStationQrResponse = {
  realizationId: string;
  issuedAt: string;
  expiresAt: string;
  tokenTtlSeconds: number;
  entries: Array<{
    stationId: string;
    stationName: string;
    stationType: StationType;
    qrToken: string;
    entryUrl: string;
  }>;
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
    language: dto.language ?? "polish",
    customLanguage:
      dto.language === "other" ? dto.customLanguage?.trim() || undefined : undefined,
    introText: dto.introText?.trim() || undefined,
    gameRules: dto.gameRules?.trim() || undefined,
    contactPerson: dto.contactPerson?.trim() || "",
    contactPhone: dto.contactPhone?.trim() || undefined,
    contactEmail: dto.contactEmail?.trim() || undefined,
    instructors,
    type: dto.type ?? "outdoor-games",
    logoUrl: dto.logoUrl,
    offerPdfUrl: dto.offerPdfUrl,
    offerPdfName: dto.offerPdfName,
    scenarioId: dto.scenarioId,
    scenarioTemplateId: dto.scenarioTemplateId?.trim() || undefined,
    scenarioTemplateName: dto.scenarioTemplateName?.trim() || undefined,
    joinCode: dto.joinCode?.trim() || "------",
    stationIds: dto.stationIds ?? scenarioStations.map((station) => station.id),
    scenarioStations,
    teamCount: dto.teamCount,
    requiredDevicesCount:
      typeof dto.requiredDevicesCount === "number" &&
      Number.isFinite(dto.requiredDevicesCount) &&
      dto.requiredDevicesCount >= 0
        ? Math.round(dto.requiredDevicesCount)
        : dto.teamCount + 2,
    peopleCount: dto.peopleCount,
    positionsCount: dto.positionsCount,
    durationMinutes:
      typeof dto.durationMinutes === "number" &&
      Number.isFinite(dto.durationMinutes) &&
      dto.durationMinutes >= 1
        ? Math.round(dto.durationMinutes)
        : 120,
    locationRequired: typeof dto.locationRequired === "boolean" ? dto.locationRequired : false,
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

function deriveStationKind(station: StationDto): StationKind {
  if (station.kind) {
    return station.kind;
  }

  if (station.realizationId) {
    return "realization-instance";
  }

  if (station.scenarioInstanceId) {
    return "scenario-instance";
  }

  return "template";
}

function normalizeStation(station: StationDto): Station {
  const trimmedName = station.name?.trim() || "Untitled station";
  const safePoints = Number.isFinite(station.points) && station.points > 0 ? station.points : 1;
  const safeTimeLimitSeconds =
    Number.isFinite(station.timeLimitSeconds) && (station.timeLimitSeconds ?? -1) >= 0
      ? Math.round(station.timeLimitSeconds as number)
      : 0;
  const kind = deriveStationKind(station);

  return {
    id: station.id,
    name: trimmedName,
    type: station.type ?? "quiz",
    description: station.description?.trim() || "",
    imageUrl: station.imageUrl?.trim() || getFallbackImage(station.id || trimmedName),
    points: safePoints,
    timeLimitSeconds: safeTimeLimitSeconds,
    completionCode: station.completionCode?.trim() || undefined,
    quiz:
      station.quiz && typeof station.quiz.question === "string" && Array.isArray(station.quiz.answers)
        ? normalizeStationQuiz({
            question: station.quiz.question,
            answers: station.quiz.answers,
            correctAnswerIndex: Number(station.quiz.correctAnswerIndex),
          }) ?? undefined
        : undefined,
    translations:
      station.translations && typeof station.translations === "object"
        ? Object.entries(station.translations).reduce<NonNullable<Station["translations"]>>((acc, [language, value]) => {
            if (!value || typeof value !== "object") {
              return acc;
            }

            const quiz =
              value.quiz && typeof value.quiz.question === "string" && Array.isArray(value.quiz.answers)
                ? normalizeStationQuiz({
                    question: value.quiz.question,
                    answers: value.quiz.answers,
                    correctAnswerIndex: Number(value.quiz.correctAnswerIndex),
                  }) ?? undefined
                : undefined;

            const name = typeof value.name === "string" ? value.name.trim() : "";
            const description = typeof value.description === "string" ? value.description.trim() : "";
            if (!name && !description && !quiz) {
              return acc;
            }

            if (
              language === "polish" ||
              language === "english" ||
              language === "ukrainian" ||
              language === "russian" ||
              language === "other"
            ) {
              acc[language] = {
                name: name || undefined,
                description: description || undefined,
                quiz,
              };
            }

            return acc;
          }, {})
        : undefined,
    latitude: Number.isFinite(station.latitude) ? station.latitude ?? undefined : undefined,
    longitude: Number.isFinite(station.longitude) ? station.longitude ?? undefined : undefined,
    sourceTemplateId: station.sourceTemplateId,
    scenarioInstanceId: station.scenarioInstanceId,
    realizationId: station.realizationId,
    kind,
    isTemplate: typeof station.isTemplate === "boolean" ? station.isTemplate : kind === "template",
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
      invalidatesTags: ["Realization", "Scenario"],
    }),
    updateRealization: build.mutation<Realization, UpdateRealizationPayload>({
      query: (body) => ({
        url: buildApiPath("/realizations"),
        method: "PUT",
        body,
      }),
      transformResponse: (response: RealizationDto) => normalizeRealization(response),
      invalidatesTags: ["Realization", "Scenario"],
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
    getRealizationStationQrs: build.query<
      RealizationStationQrResponse,
      { realizationId: string; ttlSeconds?: number }
    >({
      query: ({ realizationId, ttlSeconds }) => {
        const suffix =
          typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds)
            ? `?ttlSeconds=${Math.max(1, Math.round(ttlSeconds))}`
            : "";
        return buildApiPath(`/mobile/admin/realizations/${realizationId}/station-qr${suffix}`);
      },
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
  useGetRealizationStationQrsQuery,
} = realizationApi;
