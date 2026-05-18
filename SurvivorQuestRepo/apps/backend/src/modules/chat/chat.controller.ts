import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOrInstructor } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChatService } from './chat.service';

type CreateChatMessagePayload = {
  userName?: string;
  content?: string;
};

@Controller('chat/messages')
@AdminOrInstructor()
@UseGuards(AuthenticatedSessionGuard, RolesGuard)
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
