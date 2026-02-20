import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { ChatMessage } from "../types/chat-message";

type CreateChatMessagePayload = {
  userName: string;
  content: string;
};

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getChatMessages: build.query<ChatMessage[], void>({
      query: () => buildApiPath("/chat/messages"),
      providesTags: ["Chat"],
    }),
    createChatMessage: build.mutation<ChatMessage, CreateChatMessagePayload>({
      query: (body) => ({
        url: buildApiPath("/chat/messages"),
        method: "POST",
        body,
      }),
      invalidatesTags: ["Chat"],
    }),
  }),
});

export const { useGetChatMessagesQuery, useCreateChatMessageMutation } = chatApi;
