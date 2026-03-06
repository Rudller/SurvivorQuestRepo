import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async listMessages() {
    const messages = await this.prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return messages.map((message) => ({
      id: message.id,
      userName: message.userName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }));
  }

  async createMessage(input: CreateChatMessageInput) {
    const created = await this.prisma.chatMessage.create({
      data: {
        userName: input.userName.trim(),
        content: input.content.trim(),
      },
    });

    return {
      id: created.id,
      userName: created.userName,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
