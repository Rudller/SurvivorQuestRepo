import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type {
  RiskBoard,
  RiskCancelRemoteDrawResult,
  RiskCardWithCategory,
  RiskCategory,
  RiskDifficulty,
  RiskRemoteDrawResult,
  RiskScheme,
  RiskSchemeCategory,
  RiskTeamBoard,
  RiskTeamCardActionResult,
  RiskTeamResetResult,
  RiskTeamStatusResponse,
} from "../types/risk-quiz";

function adminPath(suffix: string) {
  return buildApiPath(`/mobile/risk-quiz/admin${suffix}`);
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
      providesTags: ["RiskQuiz"],
    }),
    createRiskCategory: build.mutation<RiskCategory, { name: string }>({
      query: ({ name }) => ({
        url: adminPath("/categories"),
        method: "POST",
        body: { name },
      }),
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
      providesTags: ["RiskQuiz"],
    }),
    createRiskScheme: build.mutation<RiskScheme, { name: string }>({
      query: ({ name }) => ({
        url: adminPath("/schemes"),
        method: "POST",
        body: { name },
      }),
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
      invalidatesTags: ["RiskQuiz"],
    }),
    removeCategoryFromScheme: build.mutation<{ success: boolean }, { schemeCategoryId: string }>({
      query: ({ schemeCategoryId }) => ({
        url: adminPath(`/scheme-categories/${encodeURIComponent(schemeCategoryId)}`),
        method: "DELETE",
      }),
      invalidatesTags: ["RiskQuiz"],
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
      invalidatesTags: ["RiskQuiz"],
    }),
    failRiskCard: build.mutation<
      RiskTeamCardActionResult,
      { realizationId: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: teamTaskPath(realizationId, teamId, stationId, "fail"),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
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
  useCreateRiskSchemeMutation,
  useRenameRiskSchemeMutation,
  useDeleteRiskSchemeMutation,
  useAssignCategoryToSchemeMutation,
  useRemoveCategoryFromSchemeMutation,
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
