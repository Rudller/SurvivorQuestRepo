import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { User, UserRole, UserStatus } from "../types/user";

type CreateUserPayload = {
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
  password?: string;
};

type UpdateUserPayload = {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
  password?: string;
};

type DeleteUserPayload = {
  id: string;
  confirmEmail: string;
};

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<User[], void>({
      query: () => buildApiPath("/users"),
      providesTags: ["User"],
    }),
    createUser: build.mutation<User, CreateUserPayload>({
      query: (body) => ({
        url: buildApiPath("/users"),
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    updateUser: build.mutation<User, UpdateUserPayload>({
      query: (body) => ({
        url: buildApiPath("/users"),
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    deleteUser: build.mutation<{ ok: true }, DeleteUserPayload>({
      query: (body) => ({
        url: buildApiPath("/users"),
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;
