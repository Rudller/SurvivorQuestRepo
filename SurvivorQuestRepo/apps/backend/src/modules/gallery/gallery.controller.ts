import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { GALLERY_VERIFY_THROTTLE } from '../../common/security/throttle.constants';
import { GalleryService } from './gallery.service';

/**
 * Pulls the access token out of an `Authorization: Bearer <token>` header.
 * Returns null for anything that is not a bearer scheme with a non-empty value.
 */
export function readBearerToken(header?: string): string | null {
  const match = /^Bearer[ 	]+(.+)$/i.exec(header?.trim() ?? '');
  const token = match?.[1]?.trim();
  return token ? token : null;
}

@Controller(['gallery', 'api/gallery'])
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post(':realizationId/verify')
  @Throttle(GALLERY_VERIFY_THROTTLE)
  async verifyGalleryPassword(
    @Param('realizationId') realizationId: string,
    @Body() body: { code?: string },
  ) {
    const code = body.code?.trim();
    if (!code) {
      throw new BadRequestException('Code is required');
    }

    return this.galleryService.verifyPassword(realizationId, code);
  }

  /**
   * The token arrives in the Authorization header. The `token` query parameter
   * is the previous transport, kept working so that the web app and this API can
   * be deployed in either order; it is deprecated and should be removed once no
   * deployed client sends it. A query string ends up in access logs and browser
   * history, which is why it is on the way out.
   */
  @Get(':realizationId/photos')
  async getGalleryPhotos(
    @Param('realizationId') realizationId: string,
    @Headers('authorization') authorization?: string,
    @Query('token') token?: string,
  ) {
    const accessToken = readBearerToken(authorization) ?? token?.trim();
    if (!accessToken) {
      throw new BadRequestException('Access token is required');
    }

    return this.galleryService.getPhotos(realizationId, accessToken);
  }

  /**
   * Bilet do pobierania. Pobieranie idzie zwykłą nawigacją przeglądarki (natywny
   * pasek postępu, bez trzymania ZIP-a w pamięci strony), a nawigacja nie
   * niesie nagłówka — więc token dostępu wymienia się tu na 2-minutowy bilet.
   */
  @Post(':realizationId/download-ticket')
  issueDownloadTicket(
    @Param('realizationId') realizationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = readBearerToken(authorization);
    if (!accessToken) {
      throw new BadRequestException('Access token is required');
    }

    return this.galleryService.issueDownloadTicket(realizationId, accessToken);
  }

  @Get(':realizationId/archive')
  async downloadArchive(
    @Param('realizationId') realizationId: string,
    @Query('ticket') ticket: string | undefined,
    @Res() res: Response,
  ) {
    if (!ticket?.trim()) {
      throw new BadRequestException('Download ticket is required');
    }

    await this.galleryService.streamArchive(realizationId, ticket.trim(), res);
  }

  @Get(':realizationId/photos/:photoId/download')
  async downloadPhoto(
    @Param('realizationId') realizationId: string,
    @Param('photoId') photoId: string,
    @Query('ticket') ticket: string | undefined,
    @Res() res: Response,
  ) {
    if (!ticket?.trim()) {
      throw new BadRequestException('Download ticket is required');
    }

    await this.galleryService.streamPhoto(
      realizationId,
      photoId,
      ticket.trim(),
      res,
    );
  }
}
