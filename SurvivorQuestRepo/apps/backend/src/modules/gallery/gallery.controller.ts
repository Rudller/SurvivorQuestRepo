import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GALLERY_VERIFY_THROTTLE } from '../../common/security/throttle.constants';
import { GalleryService } from './gallery.service';

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

  @Get(':realizationId/photos')
  async getGalleryPhotos(
    @Param('realizationId') realizationId: string,
    @Query('token') token?: string,
  ) {
    if (!token?.trim()) {
      throw new BadRequestException('Access token is required');
    }

    return this.galleryService.getPhotos(realizationId, token.trim());
  }
}
