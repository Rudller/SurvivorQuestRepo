import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AuthenticatedSessionGuard,
  type AuthenticatedRequest,
} from '../auth/guards/authenticated-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StationStorageService } from '../station/station-storage.service';
import { RealizationController } from './realization.controller';
import { RealizationService } from './realization.service';

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

describe('RealizationController roles', () => {
  let app: INestApplication<App>;
  const realizationService = {
    listRealizations: jest.fn(),
    createRealization: jest.fn(),
  };
  const stationStorageService = {};

  async function createApp(role: 'admin' | 'instructor') {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RealizationController],
      providers: [
        RolesGuard,
        { provide: RealizationService, useValue: realizationService },
        { provide: StationStorageService, useValue: stationStorageService },
      ],
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

  it('allows instructors to list realizations', async () => {
    app = await createApp('instructor');
    realizationService.listRealizations.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/realizations').expect(200);
    expect(realizationService.listRealizations).toHaveBeenCalledTimes(1);
  });

  it('forbids instructors from creating realizations', async () => {
    app = await createApp('instructor');

    await request(app.getHttpServer()).post('/realizations').send({}).expect(403);
    expect(realizationService.createRealization).not.toHaveBeenCalled();
  });
});
