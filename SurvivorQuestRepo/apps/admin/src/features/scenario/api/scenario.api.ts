import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Scenario } from "../types/scenario";

type CreateScenarioPayload = {
  name: string;
  description: string;
  stationIds: string[];
};

type UpdateScenarioPayload = {
  id: string;
  name: string;
  description: string;
  stationIds: string[];
};

type DeleteScenarioPayload = {
  id: string;
  confirmName: string;
};

export const scenarioApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getScenarios: build.query<Scenario[], void>({
      query: () => buildApiPath("/scenario"),
      providesTags: ["Scenario"],
    }),
    createScenario: build.mutation<Scenario, CreateScenarioPayload>({
      query: (body) => ({
        url: buildApiPath("/scenario"),
        method: "POST",
        body,
      }),
      invalidatesTags: ["Scenario"],
    }),
    updateScenario: build.mutation<Scenario, UpdateScenarioPayload>({
      query: (body) => ({
        url: buildApiPath("/scenario"),
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Scenario"],
    }),
    deleteScenario: build.mutation<{ id: string }, DeleteScenarioPayload>({
      query: (body) => ({
        url: buildApiPath("/scenario"),
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Scenario"],
    }),
    cloneScenario: build.mutation<Scenario, { sourceId: string }>({
      query: (body) => ({
        url: buildApiPath("/scenario"),
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Scenario"],
    }),
  }),
});

export const {
  useGetScenariosQuery,
  useCreateScenarioMutation,
  useUpdateScenarioMutation,
  useDeleteScenarioMutation,
  useCloneScenarioMutation,
} = scenarioApi;
