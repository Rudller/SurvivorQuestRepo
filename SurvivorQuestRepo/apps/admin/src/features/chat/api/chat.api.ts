import { baseApi } from "@/shared/api/base-api";
import type { ChatMessage } from "../types/chat-message";

type CreateChatMessagePayload = {
  userName: string;
  content: string;
};

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getChatMessages: build.query<ChatMessage[], void>({
      query: () => "/api/chat/messages",
      providesTags: ["Chat"],
    }),
    createChatMessage: build.mutation<ChatMessage, CreateChatMessagePayload>({
      query: (body) => ({
        url: "/api/chat/messages",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Chat"],
    }),
  }),
});

export const { useGetChatMessagesQuery, useCreateChatMessageMutation } = chatApi;
