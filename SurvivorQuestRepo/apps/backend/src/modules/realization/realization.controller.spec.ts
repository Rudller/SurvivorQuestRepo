import { INestApplication, type ExecutionContext } from '@nestjs/common';
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
import { CaseFileService } from './case-file.service';
import { RealizationService } from './realization.service';

function createSessionGuard(role: 'admin' | 'instructor') {
  return {
    canActivate: jest.fn((context: ExecutionContext) => {
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
  const caseFileService = {
    listCaseFiles: jest.fn(),
    createCaseFile: jest.fn(),
    deleteCaseFile: jest.fn(),
  };

  async function createApp(role: 'admin' | 'instructor') {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RealizationController],
      providers: [
        RolesGuard,
        { provide: RealizationService, useValue: realizationService },
        { provide: StationStorageService, useValue: stationStorageService },
        { provide: CaseFileService, useValue: caseFileService },
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

    await request(app.getHttpServer())
      .post('/realizations')
      .send({})
      .expect(403);
    expect(realizationService.createRealization).not.toHaveBeenCalled();
  });

  it('allows instructors to read case files', async () => {
    app = await createApp('instructor');
    caseFileService.listCaseFiles.mockResolvedValue({
      realizationId: 'r-1',
      entries: [],
    });

    await request(app.getHttpServer())
      .get('/realizations/r-1/case-files')
      .expect(200);
    expect(caseFileService.listCaseFiles).toHaveBeenCalledTimes(1);
  });

  it('forbids instructors from creating case files', async () => {
    app = await createApp('instructor');

    await request(app.getHttpServer())
      .post('/realizations/r-1/case-files')
      .send({})
      .expect(403);
    expect(caseFileService.createCaseFile).not.toHaveBeenCalled();
  });

  it('forbids instructors from deleting case files', async () => {
    app = await createApp('instructor');

    await request(app.getHttpServer())
      .delete('/realizations/r-1/case-files/c-1')
      .expect(403);
    expect(caseFileService.deleteCaseFile).not.toHaveBeenCalled();
  });
});
