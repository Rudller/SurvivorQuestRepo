import {
  Body,
  Controller,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
  RequestMethod,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FileInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Express } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';

import {
  MOBILE_PHOTO_UPLOAD_THROTTLE,
  mobileAwareTracker,
} from '../../../common/security/throttle.constants';
import { MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES } from './team-photo-upload.helpers';
import { TeamPhotoUploadMiddleware } from './team-photo-upload.middleware';

@Controller('mobile')
class UploadTestController {
  @Post('task/photo')
  @Throttle(MOBILE_PHOTO_UPLOAD_THROTTLE)
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { sessionToken?: string },
  ) {
    return { sessionToken: body.sessionToken, size: file?.size ?? null };
  }

  // The shape every photo route had before: the file is parsed by an
  // interceptor, i.e. after the throttle guard has already picked its key.
  @Post('legacy/photo')
  @Throttle(MOBILE_PHOTO_UPLOAD_THROTTLE)
  @UseInterceptors(FileInterceptor('file'))
  legacyUpload(@Body() body: { sessionToken?: string }) {
    return { sessionToken: body.sessionToken };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 60_000,
          limit: 120,
          getTracker: mobileAwareTracker,
        },
        {
          name: 'long',
          ttl: 15 * 60_000,
          limit: 1_000,
          getTracker: mobileAwareTracker,
        },
      ],
    }),
  ],
  controllers: [UploadTestController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class UploadTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TeamPhotoUploadMiddleware)
      .forRoutes({ path: 'mobile/task/photo', method: RequestMethod.POST });
  }
}

const PHOTO = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('TeamPhotoUploadMiddleware', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UploadTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function upload(path: string, sessionToken: string) {
    return request(app.getHttpServer())
      .post(path)
      .field('sessionToken', sessionToken)
      .attach('file', PHOTO, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });
  }

  it('hands the file and the form fields to the handler', async () => {
    const response = await upload('/mobile/task/photo', 'mob_a').expect(201);

    expect(response.body).toEqual({
      sessionToken: 'mob_a',
      size: PHOTO.length,
    });
  });

  it('gives every tablet behind one address its own photo bucket', async () => {
    // Eleven teams sending their selfies in the same minute from one carrier IP.
    for (let team = 1; team <= 11; team += 1) {
      await upload('/mobile/task/photo', `mob_team_${team}`).expect(201);
    }
  });

  it('still limits a single tablet to six uploads a minute', async () => {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await upload('/mobile/task/photo', 'mob_same').expect(201);
    }

    await upload('/mobile/task/photo', 'mob_same').expect(429);
  });

  it('documents the old behaviour: an interceptor-parsed upload shares one bucket per IP', async () => {
    for (let team = 1; team <= 6; team += 1) {
      await upload('/mobile/legacy/photo', `mob_team_${team}`).expect(201);
    }

    await upload('/mobile/legacy/photo', 'mob_team_7').expect(429);
  });

  it('rejects a file over the size limit with 413', async () => {
    await request(app.getHttpServer())
      .post('/mobile/task/photo')
      .field('sessionToken', 'mob_big')
      .attach('file', Buffer.alloc(MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES + 1), {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
  });
});
