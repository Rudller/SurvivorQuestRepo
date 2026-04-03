import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { hasExpectedFileSignature } from '../../shared/lib/file-signature';
import {
  parseCreateStationDto,
  parseDeleteStationDto,
  parseUpdateStationDto,
  toCreateStationEntity,
  toUpdateStationEntity,
} from './dto/station.dto';
import { StationStorageService } from './station-storage.service';
import { StationService } from './station.service';

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_UPLOAD_SIZE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
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

@Controller(['station', 'api/station'])
@UseGuards(AdminSessionGuard)
export class StationController {
  constructor(
    private readonly stationService: StationService,
    private readonly stationStorageService: StationStorageService,
  ) {}

  @Get()
  async getStations() {
    return this.stationService.listTemplateStations();
  }

  @Post()
  async createStation(@Body() payload: unknown) {
    const dto = parseCreateStationDto(payload);
    const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
      dto.timeLimitSeconds,
    );

    if (!parsedTimeLimit.ok) {
      throw new BadRequestException('Invalid payload');
    }

    return this.stationService.addTemplateStation(
      toCreateStationEntity(dto, parsedTimeLimit.value),
    );
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadStationImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new BadRequestException('Invalid image file');
    }

    if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Invalid image file signature');
    }

    return this.stationStorageService.uploadStationImage(file);
  }

  @Post('upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AUDIO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadStationAudio(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    if (!ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported audio type');
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new BadRequestException('Invalid audio file');
    }

    if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Invalid audio file signature');
    }

    return this.stationStorageService.uploadStationAudio(file);
  }

  @Put()
  async updateStation(@Body() payload: unknown) {
    const dto = parseUpdateStationDto(payload);
    const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
      dto.timeLimitSeconds,
    );

    if (!parsedTimeLimit.ok) {
      throw new BadRequestException('Invalid payload');
    }

    const current = await this.stationService.findStationById(dto.id);

    if (!current || !this.stationService.isTemplateStation(current)) {
      throw new NotFoundException('Station not found');
    }

    return this.stationService.replaceTemplateStation(
      toUpdateStationEntity(current, dto, parsedTimeLimit.value),
    );
  }

  @Delete()
  async deleteStation(@Body() payload: unknown) {
    const dto = parseDeleteStationDto(payload);

    const current = await this.stationService.findStationById(dto.id);

    if (!current || !this.stationService.isTemplateStation(current)) {
      throw new NotFoundException('Station not found');
    }

    if (current.name !== dto.confirmName) {
      throw new BadRequestException('Station name confirmation does not match');
    }

    await this.stationService.removeStationById(dto.id);
    return { id: dto.id };
  }
}
