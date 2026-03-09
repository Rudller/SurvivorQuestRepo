import { randomUUID } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Express } from 'express';

const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const DOCUMENT_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
};

@Injectable()
export class StationStorageService {
  private client: S3Client | null = null;

  async uploadStationImage(file: Express.Multer.File) {
    const extension = IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype];
    const objectKey = this.buildObjectKey('stations', extension);

    await this.uploadObject(file, objectKey);

    return {
      key: objectKey,
      url: `${this.getPublicBaseUrl()}/${objectKey}`,
    };
  }

  async uploadRealizationLogo(file: Express.Multer.File) {
    const extension = IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype];
    const objectKey = this.buildObjectKey('realizations/logos', extension);

    await this.uploadObject(file, objectKey);

    return {
      key: objectKey,
      url: `${this.getPublicBaseUrl()}/${objectKey}`,
    };
  }

  async uploadRealizationOfferPdf(file: Express.Multer.File) {
    const extension = DOCUMENT_EXTENSION_BY_MIME_TYPE[file.mimetype];
    const objectKey = this.buildObjectKey('realizations/offers', extension);

    await this.uploadObject(file, objectKey);

    return {
      key: objectKey,
      url: `${this.getPublicBaseUrl()}/${objectKey}`,
    };
  }

  private buildObjectKey(prefix: string, extension: string) {
    return `${prefix}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  }

  private async uploadObject(file: Express.Multer.File, objectKey: string) {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getRequiredEnv('R2_BUCKET'),
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.getRequiredEnv('R2_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.getRequiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.getRequiredEnv('R2_SECRET_ACCESS_KEY'),
      },
    });

    return this.client;
  }

  private getPublicBaseUrl() {
    return this.getRequiredEnv('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
  }

  private getRequiredEnv(key: string) {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new InternalServerErrorException(
        `Missing required environment variable: ${key}`,
      );
    }

    return value;
  }
}
