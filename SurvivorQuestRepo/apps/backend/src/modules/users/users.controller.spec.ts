import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserRole } from '@prisma/client';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '../auth/guards/authenticated-session.guard';

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

describe('UsersController roles', () => {
  let app: INestApplication<App>;
  const usersService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  async function createApp(role: 'admin' | 'instructor') {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [RolesGuard, { provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(AuthenticatedSessionGuard)
      .useValue(createSessionGuard(role))
      .compile();

    const testApp = moduleFixture.createNestApplication();
    testApp.use(cookieParser());
    await testApp.init();
    return testApp;
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('allows admin users to list users', async () => {
    app = await createApp('admin');
    usersService.findAll.mockResolvedValue([
      {
        id: 'admin-1',
        email: 'admin@test.pl',
        role: UserRole.ADMIN,
      },
    ]);

    await request(app.getHttpServer()).get('/users').expect(200);
    expect(usersService.findAll).toHaveBeenCalledTimes(1);
  });

  it('forbids instructors from listing users', async () => {
    app = await createApp('instructor');

    await request(app.getHttpServer()).get('/users').expect(403);
    expect(usersService.findAll).not.toHaveBeenCalled();
  });
});
