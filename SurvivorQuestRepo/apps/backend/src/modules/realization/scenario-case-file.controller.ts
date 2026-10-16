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
import { CaseFileService } from './case-file.service';
import {
  ALLOWED_AUDIO_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  assertUploadedFile,
  MAX_CASE_FILE_AUDIO_UPLOAD_SIZE_BYTES,
  MAX_IMAGE_UPLOAD_SIZE_BYTES,
} from './case-file-upload';
import { requireCaseFileId, type CaseFileDto } from './dto/case-file.dto';

/**
 * Akta scenariusza — wzór kopiowany do realizacji.
 *
 * Mieszka w module realizacji, a nie scenariusza, bo CaseFileService jest tu, a
 * moduł realizacji już importuje moduł scenariusza — odwrotny import byłby
 * zależnością cykliczną. Ścieżki są lustrem tras akt w realization.controller.ts,
 * tylko z `scenario/:scenarioId` zamiast `realizations/:realizationId`.
 */
@Controller('scenario')
@AdminOrInstructor()
@UseGuards(AuthenticatedSessionGuard, RolesGuard)
export class ScenarioCaseFileController {
  constructor(private readonly caseFileService: CaseFileService) {}

  @Get(':scenarioId/case-files')
  async listCaseFiles(@Param('scenarioId') scenarioId: string) {
    return this.caseFileService.listCaseFiles({
      scenarioId: requireCaseFileId(scenarioId),
    });
  }

  @Post(':scenarioId/case-files/upload-image')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadCaseFileImage(
    @Param('scenarioId') scenarioId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    assertUploadedFile(file, ALLOWED_IMAGE_MIME_TYPES, 'case file image');

    return this.caseFileService.uploadImage(
      { scenarioId: requireCaseFileId(scenarioId) },
      file,
    );
  }

  @Post(':scenarioId/case-files/upload-audio')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_CASE_FILE_AUDIO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadCaseFileAudio(
    @Param('scenarioId') scenarioId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    assertUploadedFile(file, ALLOWED_AUDIO_MIME_TYPES, 'case file audio');

    return this.caseFileService.uploadAudio(
      { scenarioId: requireCaseFileId(scenarioId) },
      file,
    );
  }

  @Post(':scenarioId/case-files')
  @AdminOnly()
  async createCaseFile(
    @Param('scenarioId') scenarioId: string,
    @Body() payload: CaseFileDto | undefined,
  ) {
    return this.caseFileService.createCaseFile(
      { scenarioId: requireCaseFileId(scenarioId) },
      payload,
    );
  }

  @Put(':scenarioId/case-files/:caseFileId')
  @AdminOnly()
  async updateCaseFile(
    @Param('scenarioId') scenarioId: string,
    @Param('caseFileId') caseFileId: string,
    @Body() payload: CaseFileDto | undefined,
  ) {
    return this.caseFileService.updateCaseFile(
      { scenarioId: requireCaseFileId(scenarioId) },
      requireCaseFileId(caseFileId),
      payload,
    );
  }

  @Put(':scenarioId/case-files/:caseFileId/move')
  @AdminOnly()
  async moveCaseFile(
    @Param('scenarioId') scenarioId: string,
    @Param('caseFileId') caseFileId: string,
    @Body() payload: { direction?: unknown } | undefined,
  ) {
    const direction = payload?.direction;

    if (direction !== 'up' && direction !== 'down') {
      throw new BadRequestException('Invalid payload');
    }

    return this.caseFileService.moveCaseFile(
      { scenarioId: requireCaseFileId(scenarioId) },
      requireCaseFileId(caseFileId),
      direction,
    );
  }

  @Delete(':scenarioId/case-files/:caseFileId')
  @AdminOnly()
  async deleteCaseFile(
    @Param('scenarioId') scenarioId: string,
    @Param('caseFileId') caseFileId: string,
  ) {
    return this.caseFileService.deleteCaseFile(
      { scenarioId: requireCaseFileId(scenarioId) },
      requireCaseFileId(caseFileId),
    );
  }
}
