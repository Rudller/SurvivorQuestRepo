import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { StationStorageService } from '../station/station-storage.service';
import type {
  CreateRealizationDto,
  UpdateRealizationDto,
} from './dto/realization.dto';
import { RealizationService } from './realization.service';

const MAX_LOGO_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_OFFER_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

@Controller('realizations')
@UseGuards(AdminSessionGuard)
export class RealizationController {
  constructor(
    private readonly realizationService: RealizationService,
    private readonly stationStorageService: StationStorageService,
  ) {}

  @Get()
  async getRealizations() {
    return this.realizationService.listRealizations();
  }

  @Post()
  async createRealization(@Body() payload: CreateRealizationDto) {
    return this.realizationService.createRealization(payload);
  }

  @Post('upload-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_LOGO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadRealizationLogo(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Logo image is required');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported logo image type');
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new BadRequestException('Invalid logo image file');
    }

    return this.stationStorageService.uploadRealizationLogo(file);
  }

  @Post('upload-offer')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_OFFER_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadRealizationOffer(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Offer file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Unsupported offer file type');
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new BadRequestException('Invalid offer file');
    }

    return this.stationStorageService.uploadRealizationOfferPdf(file);
  }

  @Put()
  async updateRealization(@Body() payload: UpdateRealizationDto) {
    return this.realizationService.updateRealization(payload);
  }
}
