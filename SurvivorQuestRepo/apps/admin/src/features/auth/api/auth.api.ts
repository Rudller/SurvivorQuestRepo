import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";

type LoginPayload = {
  email: string;
  password: string;
};

type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "instructor";
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<{ user: AuthUser }, LoginPayload>({
      query: (body) => ({
        url: buildApiPath("/auth/login"),
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
    me: build.query<{ user: AuthUser }, void>({
      query: () => buildApiPath("/auth/me"),
      providesTags: ["Auth"],
    }),
    logout: build.mutation<{ ok: true }, void>({
      query: () => ({
        url: buildApiPath("/auth/logout"),
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const { useLoginMutation, useMeQuery, useLogoutMutation } = authApi;