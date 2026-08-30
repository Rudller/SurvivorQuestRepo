import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';

import { hasExpectedFileSignature } from '../../../shared/lib/file-signature';

// Shared by every team-photo upload route (normal realizations and Ryzykanci
// photo cards). Kept in one place on purpose: the signature check is a security
// control, and two copies of it would be two chances for one to drift.
export const MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

const ALLOWED_TEAM_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function assertValidTeamPhotoFile(file: Express.Multer.File | undefined) {
  if (!file) {
    throw new BadRequestException('Photo is required');
  }

  if (!ALLOWED_TEAM_PHOTO_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Unsupported photo type');
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new BadRequestException('Invalid photo file');
  }

  if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
    throw new BadRequestException('Invalid photo file signature');
  }
}
