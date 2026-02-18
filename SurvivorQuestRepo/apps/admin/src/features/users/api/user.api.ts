import { baseApi } from "@/shared/api/base-api";
import type { User, UserRole } from "../types/user";

type CreateUserPayload = {
  email: string;
  role: UserRole;
};

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // /api/users endpoint temporarily implemented in route handler for testing purposes, will be replaced with real database logic later
    getUsers: build.query<User[], void>({
      query: () => "/api/users",
      providesTags: ["User"],
    }),
    createUser: build.mutation<User, CreateUserPayload>({
      query: (body) => ({
        url: "/api/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useGetUsersQuery, useCreateUserMutation } = userApi;