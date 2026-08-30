import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import { normalizeStation, type StationDto } from "@/features/games/api/station.api";
import type {
  RiskBoard,
  RiskCancelRemoteDrawResult,
  RiskCardWithCategory,
  RiskSchemeCardCode,
  RiskCategory,
  RiskDifficulty,
  RiskPoolStation,
  RiskRemoteDrawResult,
  RiskScheme,
  RiskSchemeCategory,
  RiskTeamBoard,
  RiskTeamCardActionResult,
  RiskTeamResetResult,
  RiskTeamStatusResponse,
} from "../types/risk-quiz";

export type RiskChatAuthorKind = "TEAM" | "GAME_MASTER" | "SYSTEM";

export type RiskChatMessage = {
  id: string;
  authorKind: RiskChatAuthorKind;
  teamId: string | null;
  authorName: string;
  content: string;
  systemEvent: string | null;
  teamColor: string | null;
  teamBadgeImageUrl: string | null;
  createdAt: string;
};

export type RiskChatState = {
  enabled: boolean;
  canPost: boolean;
  currentTeamId: string | null;
  messages: RiskChatMessage[];
};

function adminPath(suffix: string) {
  return buildApiPath(`/mobile/risk-quiz/admin${suffix}`);
}

// Pool rows carry a full station, and it goes through the exact same
// normalizer GET /station uses — the deck editor hands it straight to
// EditStationModal, which expects a fully-defaulted Station.
type RiskPoolStationDto = Omit<RiskPoolStation, "station"> & {
  station: StationDto;
};
type RiskCategoryDto = Omit<RiskCategory, "poolStations"> & {
  poolStations: RiskPoolStationDto[];
};
type RiskSchemeDto = Omit<RiskScheme, "schemeCategories"> & {
  schemeCategories: (Omit<RiskSchemeCategory, "category"> & {
    category: RiskCategoryDto;
  })[];
};

function normalizePoolStation(poolStation: RiskPoolStationDto): RiskPoolStation {
  return { ...poolStation, station: normalizeStation(poolStation.station) };
}

function normalizeCategory(category: RiskCategoryDto): RiskCategory {
  return {
    ...category,
    poolStations: category.poolStations.map(normalizePoolStation),
  };
}

function normalizeScheme(scheme: RiskSchemeDto): RiskScheme {
  return {
    ...scheme,
    schemeCategories: scheme.schemeCategories.map((schemeCategory) => ({
      ...schemeCategory,
      category: normalizeCategory(schemeCategory.category),
    })),
  };
}

function teamTaskPath(
  realizationId: string,
  teamId: string,
  stationId: string,
  action: "complete" | "fail" | "reset",
) {
  return adminPath(
    `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/tasks/${encodeURIComponent(stationId)}/${action}`,
  );
}

export const riskQuizApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // --- Categories (reusable task pools) ---
    getRiskCategories: build.query<RiskCategory[], void>({
      query: () => adminPath("/categories"),
      transformResponse: (response: RiskCategoryDto[]) =>
        response.map(normalizeCategory),
      providesTags: ["RiskQuiz"],
    }),
    createRiskCategory: build.mutation<RiskCategory, { name: string }>({
      query: ({ name }) => ({
        url: adminPath("/categories"),
        method: "POST",
        body: { name },
      }),
      transformResponse: normalizeCategory,
      invalidatesTags: ["RiskQuiz"],
    }),
    updateRiskCategory: build.mutation<RiskCategory, { categoryId: string; name: string }>({
      query: ({ categoryId, name }) => ({
        url: adminPath(`/categories/${encodeURIComponent(categoryId)}`),
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    deleteRiskCategory: build.mutation<{ success: boolean }, { categoryId: string }>({
      query: ({ categoryId }) => ({
        url: adminPath(`/categories/${encodeURIComponent(categoryId)}`),
        method: "DELETE",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),

    // --- Pool stations (stations assigned to a category's difficulty pool) ---
    assignRiskStationToPool: build.mutation<
      RiskCategory["poolStations"][number],
      { categoryId: string; difficulty: RiskDifficulty; stationId: string }
    >({
      query: ({ categoryId, ...body }) => ({
        url: adminPath(`/categories/${encodeURIComponent(categoryId)}/pool-stations`),
        method: "POST",
        body,
      }),
      transformResponse: normalizePoolStation,
      invalidatesTags: ["RiskQuiz"],
    }),
    removeRiskStationFromPool: build.mutation<{ success: boolean }, { poolStationId: string }>({
      query: ({ poolStationId }) => ({
        url: adminPath(`/pool-stations/${encodeURIComponent(poolStationId)}`),
        method: "DELETE",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),

    // --- Schemes ("talie") — assemble existing categories ---
    getRiskSchemes: build.query<RiskScheme[], void>({
      query: () => adminPath("/schemes"),
      transformResponse: (response: RiskSchemeDto[]) =>
        response.map(normalizeScheme),
      providesTags: ["RiskQuiz"],
    }),
    // The realization's own deck (a clone). Fetching it also adopts the deck if
    // the realization still points at a shared template, so anything edited from
    // the realization editor stays private to that realization.
    getRealizationRiskScheme: build.query<RiskScheme, { realizationId: string }>({
      query: ({ realizationId }) =>
        adminPath(`/realizations/${realizationId}/scheme`),
      transformResponse: normalizeScheme,
      providesTags: ["RiskQuiz"],
    }),
    createRiskScheme: build.mutation<RiskScheme, { name: string }>({
      query: ({ name }) => ({
        url: adminPath("/schemes"),
        method: "POST",
        body: { name },
      }),
      transformResponse: normalizeScheme,
      invalidatesTags: ["RiskQuiz"],
    }),
    renameRiskScheme: build.mutation<RiskScheme, { schemeId: string; name: string }>({
      query: ({ schemeId, name }) => ({
        url: adminPath(`/schemes/${encodeURIComponent(schemeId)}`),
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    deleteRiskScheme: build.mutation<{ success: boolean }, { schemeId: string }>({
      query: ({ schemeId }) => ({
        url: adminPath(`/schemes/${encodeURIComponent(schemeId)}`),
        method: "DELETE",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    assignCategoryToScheme: build.mutation<
      RiskSchemeCategory,
      { schemeId: string; categoryId: string }
    >({
      query: ({ schemeId, categoryId }) => ({
        url: adminPath(`/schemes/${encodeURIComponent(schemeId)}/categories`),
        method: "POST",
        body: { categoryId },
      }),
      transformResponse: (
        response: Omit<RiskSchemeCategory, "category"> & {
          category: RiskCategoryDto;
        },
      ) => ({ ...response, category: normalizeCategory(response.category) }),
      invalidatesTags: ["RiskQuiz"],
    }),
    removeCategoryFromScheme: build.mutation<{ success: boolean }, { schemeCategoryId: string }>({
      query: ({ schemeCategoryId }) => ({
        url: adminPath(`/scheme-categories/${encodeURIComponent(schemeCategoryId)}`),
        method: "DELETE",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),

    // --- Card codes for a deck in the library (no realization involved) ---
    // Derived server-side from the deck's categories, so the printable sheet
    // exists before any realization does and matches what the realization's
    // generated cards will carry.
    getRiskSchemeCardCodes: build.query<RiskSchemeCardCode[], { schemeId: string }>({
      query: ({ schemeId }) =>
        adminPath(`/schemes/${encodeURIComponent(schemeId)}/card-codes`),
      providesTags: ["RiskQuiz"],
    }),

    // --- Chat (one shared room per realization) ---
    getRiskChat: build.query<RiskChatState, { realizationId: string }>({
      query: ({ realizationId }) =>
        adminPath(`/realizations/${encodeURIComponent(realizationId)}/chat`),
    }),
    sendRiskChatMessage: build.mutation<
      RiskChatMessage,
      { realizationId: string; content: string }
    >({
      query: ({ realizationId, content }) => ({
        url: adminPath(`/realizations/${encodeURIComponent(realizationId)}/chat`),
        method: "POST",
        body: { content },
      }),
    }),

    // --- Cards + board (per realization) ---
    getRiskCards: build.query<RiskCardWithCategory[], { realizationId: string }>({
      query: ({ realizationId }) =>
        adminPath(`/realizations/${encodeURIComponent(realizationId)}/cards`),
      providesTags: ["RiskQuiz"],
    }),
    generateRiskCards: build.mutation<RiskCardWithCategory[], { realizationId: string }>({
      query: ({ realizationId }) => ({
        url: adminPath(`/realizations/${encodeURIComponent(realizationId)}/cards/generate`),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    getRiskBoard: build.query<RiskBoard, { realizationId: string }>({
      query: ({ realizationId }) =>
        adminPath(`/realizations/${encodeURIComponent(realizationId)}/board`),
    }),
    getRiskTeamStatus: build.query<RiskTeamStatusResponse, { realizationId: string }>({
      query: ({ realizationId }) =>
        adminPath(`/realizations/${encodeURIComponent(realizationId)}/team-status`),
      providesTags: ["RiskQuiz"],
    }),
    resetRiskTeamAttempts: build.mutation<
      RiskTeamResetResult,
      { realizationId: string; teamId: string }
    >({
      query: ({ realizationId, teamId }) => ({
        url: adminPath(
          `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/reset`,
        ),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    getRiskTeamBoard: build.query<
      RiskTeamBoard,
      { realizationId: string; teamId: string }
    >({
      query: ({ realizationId, teamId }) =>
        adminPath(
          `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/board`,
        ),
      providesTags: ["RiskQuiz"],
    }),
    completeRiskCard: build.mutation<
      RiskTeamCardActionResult,
      { realizationId: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: teamTaskPath(realizationId, teamId, stationId, "complete"),
        method: "POST",
      }),
      // Also "Realization": a verdict moves team points and clears the card
      // from the photo-review list, both of which live under that tag.
      invalidatesTags: ["RiskQuiz", "Realization"],
    }),
    failRiskCard: build.mutation<
      RiskTeamCardActionResult,
      { realizationId: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: teamTaskPath(realizationId, teamId, stationId, "fail"),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz", "Realization"],
    }),
    resetRiskCard: build.mutation<
      RiskTeamCardActionResult,
      { realizationId: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: teamTaskPath(realizationId, teamId, stationId, "reset"),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    triggerRiskRemoteDraw: build.mutation<
      RiskRemoteDrawResult,
      { realizationId: string; teamId: string; categoryId: string; difficulty: RiskDifficulty }
    >({
      query: ({ realizationId, teamId, categoryId, difficulty }) => ({
        url: adminPath(
          `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/launch`,
        ),
        method: "POST",
        body: { categoryId, difficulty },
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    cancelRiskRemoteDraw: build.mutation<
      RiskCancelRemoteDrawResult,
      { realizationId: string; teamId: string }
    >({
      query: ({ realizationId, teamId }) => ({
        url: adminPath(
          `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/cancel-remote-draw`,
        ),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
  }),
});

export const {
  useGetRiskCategoriesQuery,
  useCreateRiskCategoryMutation,
  useUpdateRiskCategoryMutation,
  useDeleteRiskCategoryMutation,
  useAssignRiskStationToPoolMutation,
  useRemoveRiskStationFromPoolMutation,
  useGetRiskSchemesQuery,
  useGetRealizationRiskSchemeQuery,
  useCreateRiskSchemeMutation,
  useRenameRiskSchemeMutation,
  useDeleteRiskSchemeMutation,
  useAssignCategoryToSchemeMutation,
  useRemoveCategoryFromSchemeMutation,
  useGetRiskSchemeCardCodesQuery,
  useGetRiskChatQuery,
  useSendRiskChatMessageMutation,
  useGetRiskCardsQuery,
  useGenerateRiskCardsMutation,
  useGetRiskBoardQuery,
  useGetRiskTeamStatusQuery,
  useResetRiskTeamAttemptsMutation,
  useGetRiskTeamBoardQuery,
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
  useResetRiskCardMutation,
  useTriggerRiskRemoteDrawMutation,
  useCancelRiskRemoteDrawMutation,
} = riskQuizApi;
