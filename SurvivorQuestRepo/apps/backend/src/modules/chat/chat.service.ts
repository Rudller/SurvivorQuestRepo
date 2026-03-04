import { Injectable } from '@nestjs/common';

export type ChatMessage = {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
};

type CreateChatMessageInput = {
  userName: string;
  content: string;
};

@Injectable()
export class ChatService {
  private messages: ChatMessage[] = [
    {
      id: 'm-1',
      userName: 'Admin',
      content: 'Witajcie! Tu możecie zostawiać wiadomości dla zespołu.',
      createdAt: new Date().toISOString(),
    },
  ];

  listMessages() {
    return this.messages;
  }

  createMessage(input: CreateChatMessageInput) {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userName: input.userName.trim(),
      content: input.content.trim(),
      createdAt: new Date().toISOString(),
    };

    this.messages = [message, ...this.messages];
    return message;
  }
}
