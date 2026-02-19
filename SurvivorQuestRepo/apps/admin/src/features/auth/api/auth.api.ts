import { baseApi } from "@/shared/api/base-api";

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
        url: "/api/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
    me: build.query<{ user: AuthUser }, void>({
      query: () => "/api/auth/me",
      providesTags: ["Auth"],
    }),
    logout: build.mutation<{ ok: true }, void>({
      query: () => ({
        url: "/api/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const { useLoginMutation, useMeQuery, useLogoutMutation } = authApi;