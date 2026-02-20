import { baseApi } from "@/shared/api/base-api";
import type { User, UserRole, UserStatus } from "../types/user";

type CreateUserPayload = {
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
};

type UpdateUserPayload = {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
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
    updateUser: build.mutation<User, UpdateUserPayload>({
      query: (body) => ({
        url: "/api/users",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation } = userApi;