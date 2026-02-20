import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { Game, GameType } from "../types/game";

type GameDto = {
  id: string;
  name: string;
  type?: GameType;
  description: string;
  imageUrl?: string | null;
  points: number;
  timeLimitSeconds?: number;
  createdAt: string;
  updatedAt: string;
};

type CreateGamePayload = {
  name: string;
  type: GameType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds?: number;
};

type UpdateGamePayload = {
  id: string;
  name: string;
  type: GameType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds?: number;
};

type DeleteGamePayload = {
  id: string;
  confirmName: string;
};

function getFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function normalizeGame(game: GameDto): Game {
  const trimmedName = game.name?.trim() || "Untitled game";
  const safePoints = Number.isFinite(game.points) && game.points > 0 ? game.points : 1;
  const safeTimeLimitSeconds =
    Number.isFinite(game.timeLimitSeconds) && (game.timeLimitSeconds ?? -1) >= 0
      ? Math.round(game.timeLimitSeconds as number)
      : 0;

  return {
    id: game.id,
    name: trimmedName,
    type: game.type ?? "other",
    description: game.description?.trim() || "",
    imageUrl: game.imageUrl?.trim() || getFallbackImage(game.id || trimmedName),
    points: safePoints,
    timeLimitSeconds: safeTimeLimitSeconds,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

export const gameApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGames: build.query<Game[], void>({
      query: () => buildApiPath("/games"),
      transformResponse: (response: GameDto[]) => response.map(normalizeGame),
      providesTags: ["Game"],
    }),
    createGame: build.mutation<Game, CreateGamePayload>({
      query: (body) => ({
        url: buildApiPath("/games"),
        method: "POST",
        body,
      }),
      transformResponse: (response: GameDto) => normalizeGame(response),
      invalidatesTags: ["Game"],
    }),
    updateGame: build.mutation<Game, UpdateGamePayload>({
      query: (body) => ({
        url: buildApiPath("/games"),
        method: "PUT",
        body,
      }),
      transformResponse: (response: GameDto) => normalizeGame(response),
      invalidatesTags: ["Game"],
    }),
    deleteGame: build.mutation<{ id: string }, DeleteGamePayload>({
      query: (body) => ({
        url: buildApiPath("/games"),
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Game"],
    }),
  }),
});

export const { useGetGamesQuery, useCreateGameMutation, useUpdateGameMutation, useDeleteGameMutation } = gameApi;
