import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AuthenticatedSessionGuard,
  type AuthenticatedRequest,
} from '../auth/guards/authenticated-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StationService } from '../station/station.service';
import { ScenarioController } from './scenario.controller';
import { ScenarioService } from './scenario.service';

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

describe('ScenarioController roles', () => {
  let app: INestApplication<App>;
  const scenarioService = {
    listScenarios: jest.fn(),
  };
  const stationService = {};

  async function createApp(role: 'admin' | 'instructor') {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ScenarioController],
      providers: [
        RolesGuard,
        { provide: ScenarioService, useValue: scenarioService },
        { provide: StationService, useValue: stationService },
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

  it('allows admin users to list scenarios', async () => {
    app = await createApp('admin');
    scenarioService.listScenarios.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/scenario').expect(200);
    expect(scenarioService.listScenarios).toHaveBeenCalledTimes(1);
  });

  it('forbids instructors from configuration endpoints', async () => {
    app = await createApp('instructor');

    await request(app.getHttpServer()).get('/scenario').expect(403);
    expect(scenarioService.listScenarios).not.toHaveBeenCalled();
  });
});
