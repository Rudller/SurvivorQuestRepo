import { baseApi } from "@/shared/api/base-api";
import type { Game } from "../types/game";

type CreateGamePayload = {
  name: string;
  description: string;
  imageUrl?: string;
  points: number;
};

export const gameApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGames: build.query<Game[], void>({
      query: () => "/api/games",
      providesTags: ["Game"],
    }),
    createGame: build.mutation<Game, CreateGamePayload>({
      query: (body) => ({
        url: "/api/games",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Game"],
    }),
  }),
});

export const { useGetGamesQuery, useCreateGameMutation } = gameApi;
