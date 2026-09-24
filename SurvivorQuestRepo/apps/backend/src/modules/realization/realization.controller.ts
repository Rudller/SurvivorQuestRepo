import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOnly, AdminOrInstructor } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StationStorageService } from '../station/station-storage.service';
import { hasExpectedFileSignature } from '../../shared/lib/file-signature';
import { parseDeleteRealizationDto } from './dto/realization.dto';
import type {
  CreateRealizationDto,
  TranslateRealizationTextsDto,
  UpdateRealizationDto,
} from './dto/realization.dto';
import { CaseFileService } from './case-file.service';
import { requireCaseFileId, type CaseFileDto } from './dto/case-file.dto';
import { RealizationService } from './realization.service';

const MAX_LOGO_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_OFFER_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_CASE_FILE_AUDIO_UPLOAD_SIZE_BYTES = 12 * 1024 * 1024;
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

@Controller('realizations')
@AdminOrInstructor()
@UseGuards(AuthenticatedSessionGuard, RolesGuard)
export class RealizationController {
  constructor(
    private readonly realizationService: RealizationService,
    private readonly stationStorageService: StationStorageService,
    private readonly caseFileService: CaseFileService,
  ) {}

  @Get()
  async getRealizations() {
    return this.realizationService.listRealizations();
  }

  @Post()
  @AdminOnly()
  async createRealization(@Body() payload: CreateRealizationDto) {
    return this.realizationService.createRealization(payload);
  }

  @Post('translate-texts')
  translateTexts(@Body() payload: TranslateRealizationTextsDto) {
    return this.realizationService.translateTexts(payload);
  }

  @Post('upload-logo')
  @AdminOnly()
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

    if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Invalid logo image file signature');
    }

    return this.stationStorageService.uploadRealizationLogo(file);
  }

  @Post('upload-map-image')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_LOGO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadRealizationMapImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Map image is required');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported map image type');
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new BadRequestException('Invalid map image file');
    }

    if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Invalid map image file signature');
    }

    return this.stationStorageService.uploadRealizationMapImage(file);
  }

  @Get('media-library')
  @AdminOnly()
  async getMediaLibrary() {
    return this.realizationService.listMediaLibrary();
  }

  @Delete('media-library')
  @AdminOnly()
  async deleteMediaAsset(@Body() body: { url?: string }) {
    const url = body.url?.trim();
    if (!url) {
      throw new BadRequestException('Asset url is required');
    }

    await this.realizationService.deleteMediaAsset(url);
    return { ok: true };
  }

  @Post('upload-offer')
  @AdminOnly()
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

    if (!hasExpectedFileSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Invalid offer file signature');
    }

    return this.stationStorageService.uploadRealizationOfferPdf(file);
  }

  @Put()
  @AdminOnly()
  async updateRealization(@Body() payload: UpdateRealizationDto) {
    return this.realizationService.updateRealization(payload);
  }

  @Delete()
  @AdminOnly()
  async deleteRealization(@Body() payload: unknown) {
    const dto = parseDeleteRealizationDto(payload);
    return this.realizationService.deleteRealization(dto);
  }

  // Trasy z parametrem deklarowane PO statycznych ('media-library', 'upload-*',
  // 'translate-texts'), żeby ':realizationId' ich nie przechwycił. Uploady mają
  // literał na końcu ścieżki i stoją przed trasami z ':caseFileId'.

  @Get(':realizationId/case-files')
  async listCaseFiles(@Param('realizationId') realizationId: string) {
    return this.caseFileService.listCaseFiles(requireCaseFileId(realizationId));
  }

  @Post(':realizationId/case-files/upload-image')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_LOGO_UPLOAD_SIZE_BYTES } }),
  )
  async uploadCaseFileImage(
    @Param('realizationId') realizationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    this.assertUploadedFile(file, ALLOWED_IMAGE_MIME_TYPES, 'case file image');

    return this.caseFileService.uploadImage(
      requireCaseFileId(realizationId),
      file as Express.Multer.File,
    );
  }

  @Post(':realizationId/case-files/upload-audio')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_CASE_FILE_AUDIO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadCaseFileAudio(
    @Param('realizationId') realizationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    this.assertUploadedFile(file, ALLOWED_AUDIO_MIME_TYPES, 'case file audio');

    return this.caseFileService.uploadAudio(
      requireCaseFileId(realizationId),
      file as Express.Multer.File,
    );
  }

  @Post(':realizationId/case-files')
  @AdminOnly()
  async createCaseFile(
    @Param('realizationId') realizationId: string,
    @Body() payload: CaseFileDto | undefined,
  ) {
    return this.caseFileService.createCaseFile(
      requireCaseFileId(realizationId),
      payload,
    );
  }

  @Put(':realizationId/case-files/:caseFileId')
  @AdminOnly()
  async updateCaseFile(
    @Param('realizationId') realizationId: string,
    @Param('caseFileId') caseFileId: string,
    @Body() payload: CaseFileDto | undefined,
  ) {
    return this.caseFileService.updateCaseFile(
      requireCaseFileId(realizationId),
      requireCaseFileId(caseFileId),
      payload,
    );
  }

  @Put(':realizationId/case-files/:caseFileId/move')
  @AdminOnly()
  async moveCaseFile(
    @Param('realizationId') realizationId: string,
    @Param('caseFileId') caseFileId: string,
    @Body() payload: { direction?: unknown } | undefined,
  ) {
    const direction = payload?.direction;

    if (direction !== 'up' && direction !== 'down') {
      throw new BadRequestException('Invalid payload');
    }

    return this.caseFileService.moveCaseFile(
      requireCaseFileId(realizationId),
      requireCaseFileId(caseFileId),
      direction,
    );
  }

  @Delete(':realizationId/case-files/:caseFileId')
  @AdminOnly()
  async deleteCaseFile(
    @Param('realizationId') realizationId: string,
    @Param('caseFileId') caseFileId: string,
  ) {
    return this.caseFileService.deleteCaseFile(
      requireCaseFileId(realizationId),
      requireCaseFileId(caseFileId),
    );
  }

  /**
   * Ten sam zestaw bramek, który cztery starsze uploady mają skopiowany u
   * siebie. Nowe trasy dostają go raz — ujednolicenie pozostałych to osobna
   * zmiana, żeby nie mieszać refaktoru z funkcją.
   */
  private assertUploadedFile(
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
}
