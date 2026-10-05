import {
  BadRequestException,
  HttpException,
  Injectable,
  NestMiddleware,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES } from './team-photo-upload.helpers';

const parseTeamPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES },
}).single('file');

function toHttpException(error: unknown): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new PayloadTooLargeException(error.message);
  }

  const message = error instanceof Error ? error.message : 'Invalid upload';
  return new BadRequestException(message);
}

/**
 * Parses a team-photo upload (field `file`) before the guards run.
 *
 * Nest runs guards before interceptors, so with `FileInterceptor` the throttle
 * guard saw an empty multipart body, found no `sessionToken`, and fell back to
 * the client IP. Tablets on one carrier sit behind one CGNAT address, so the
 * whole venue shared a single 6-a-minute photo bucket. Parsed here, the
 * session token is on `req.body` in time and the bucket is per device again.
 *
 * Routes using this must not also declare `FileInterceptor` — the request
 * stream is already consumed. `@UploadedFile()` reads the `req.file` set here.
 */
@Injectable()
export class TeamPhotoUploadMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    await new Promise<void>((resolve, reject) => {
      parseTeamPhotoUpload(req, res, (error: unknown) => {
        if (error) {
          reject(toHttpException(error));
          return;
        }
        resolve();
      });
    });
    next();
  }
}
