import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Realization, RealizationStatus } from "../types/realization";

type CreateRealizationPayload = {
  companyName: string;
  gameIds: string[];
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
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
  }),
});

export const { useGetRealizationsQuery, useCreateRealizationMutation } = realizationApi;
