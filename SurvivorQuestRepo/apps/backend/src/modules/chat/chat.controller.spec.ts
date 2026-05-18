import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AuthenticatedSessionGuard,
  type AuthenticatedRequest,
} from '../auth/guards/authenticated-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

function createSessionGuard(role: 'admin' | 'instructor') {
  return {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      request.user = {
        id: `${role}-1`,
        email: `${role}@test.pl`,
        role,
      };
      return true;
    }),
  };
}

describe('ChatController roles', () => {
  let app: INestApplication<App>;
  const chatService = {
    listMessages: jest.fn(),
    createMessage: jest.fn(),
  };

  async function createApp(role: 'admin' | 'instructor') {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [RolesGuard, { provide: ChatService, useValue: chatService }],
    })
      .overrideGuard(AuthenticatedSessionGuard)
      .useValue(createSessionGuard(role))
      .compile();

    const testApp = moduleFixture.createNestApplication();
    await testApp.init();
    return testApp;
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('allows instructors to use chat', async () => {
    app = await createApp('instructor');
    chatService.listMessages.mockResolvedValue([]);
    chatService.createMessage.mockResolvedValue({ id: 'message-1' });

    await request(app.getHttpServer()).get('/chat/messages').expect(200);
    await request(app.getHttpServer())
      .post('/chat/messages')
      .send({ userName: 'Instruktor', content: 'Start' })
      .expect(201);

    expect(chatService.listMessages).toHaveBeenCalledTimes(1);
    expect(chatService.createMessage).toHaveBeenCalledWith({
      userName: 'Instruktor',
      content: 'Start',
    });
  });
});
