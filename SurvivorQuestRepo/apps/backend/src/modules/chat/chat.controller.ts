import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ChatService } from './chat.service';

type CreateChatMessagePayload = {
  userName?: string;
  content?: string;
};

@Controller('chat/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getChatMessages() {
    return this.chatService.listMessages();
  }

  @Post()
  async createChatMessage(@Body() payload: CreateChatMessagePayload) {
    if (!payload?.userName?.trim() || !payload.content?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    return this.chatService.createMessage({
      userName: payload.userName,
      content: payload.content,
    });
  }
}
