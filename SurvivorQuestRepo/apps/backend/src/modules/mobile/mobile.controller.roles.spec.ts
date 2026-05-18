import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AuthenticatedSessionGuard,
  type AuthenticatedRequest,
} from '../auth/guards/authenticated-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

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

describe('MobileController admin endpoint roles', () => {
  let app: INestApplication<App>;
  const mobileService = {
    getMobileAdminRealizationOverview: jest.fn(),
    getMobileAdminStationQrs: jest.fn(),
    startMobileAdminRealization: jest.fn(),
  };

  async function createApp(role: 'admin' | 'instructor') {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MobileController],
      providers: [
        RolesGuard,
        { provide: MobileService, useValue: mobileService },
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

  it('allows instructors to read realization overview and station QR codes', async () => {
    app = await createApp('instructor');
    mobileService.getMobileAdminRealizationOverview.mockResolvedValue({ ok: true });
    mobileService.getMobileAdminStationQrs.mockResolvedValue({ entries: [] });

    await request(app.getHttpServer())
      .get('/mobile/admin/realizations/current')
      .expect(200);
    await request(app.getHttpServer())
      .get('/mobile/admin/realizations/current/station-qr')
      .expect(200);

    expect(mobileService.getMobileAdminRealizationOverview).toHaveBeenCalledWith(
      'current',
    );
    expect(mobileService.getMobileAdminStationQrs).toHaveBeenCalledWith(
      'current',
      undefined,
    );
  });

  it('forbids instructors from mutating event state', async () => {
    app = await createApp('instructor');

    await request(app.getHttpServer())
      .post('/mobile/admin/realizations/current/start')
      .expect(403);
    expect(mobileService.startMobileAdminRealization).not.toHaveBeenCalled();
  });

  it('allows admins to mutate event state', async () => {
    app = await createApp('admin');
    mobileService.startMobileAdminRealization.mockResolvedValue({ ok: true });

    await request(app.getHttpServer())
      .post('/mobile/admin/realizations/current/start')
      .expect(201);
    expect(mobileService.startMobileAdminRealization).toHaveBeenCalledWith(
      'current',
    );
  });
});
