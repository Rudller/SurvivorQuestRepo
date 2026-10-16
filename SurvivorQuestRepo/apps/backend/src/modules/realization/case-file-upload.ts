import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';

import { hasExpectedFileSignature } from '../../shared/lib/file-signature';

/**
 * Bramki uploadu wspólne dla akt realizacji i akt scenariusza — obie trasy
 * przyjmują dokładnie te same pliki, więc limity i walidacja żyją w jednym
 * miejscu, a nie w dwóch kontrolerach.
 */

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
export const MAX_CASE_FILE_AUDIO_UPLOAD_SIZE_BYTES = 12 * 1024 * 1024;
export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'application/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/webm',
]);

export function assertUploadedFile(
  file: Express.Multer.File | undefined,
  allowedMimeTypes: Set<string>,
  label: string,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException(`Missing ${label} file`);
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new BadRequestException(`Unsupported ${label} type`);
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new BadRequestException(`Invalid ${label} file`);
  }

  if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
    throw new BadRequestException(`Invalid ${label} file signature`);
  }
}
