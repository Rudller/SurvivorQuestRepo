import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { RiskDifficulty } from '@prisma/client';
import type { Express } from 'express';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOnly, AdminOrInstructor } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  MOBILE_PHOTO_UPLOAD_THROTTLE,
  MOBILE_QR_RESOLVE_THROTTLE,
  RISK_QUIZ_PENDING_DRAW_THROTTLE,
} from '../../common/security/throttle.constants';
import {
  assertValidTeamPhotoFile,
  MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES,
} from '../mobile/domain/team-photo-upload.helpers';
import { RiskQuizService } from './risk-quiz.service';

type Payload = Record<string, unknown>;

function requirePayload(value: unknown): Payload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }
  return value as Payload;
}

function requireString(payload: Payload, key: string) {
  const value = payload[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('Invalid payload');
  }
  return value.trim();
}

function optionalFiniteNumber(payload: Payload, key: string) {
  const value = payload[key];
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException('Invalid payload');
  }
  return value;
}

function optionalString(payload: Payload, key: string) {
  const value = payload[key];
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid payload');
  }
  return value;
}

function optionalBoolean(payload: Payload, key: string) {
  const value = payload[key];
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new BadRequestException('Invalid payload');
  }
  return value;
}

function requireDifficulty(payload: Payload, key: string) {
  const value = payload[key];
  if (
    typeof value !== 'string' ||
    !Object.values(RiskDifficulty).includes(value as RiskDifficulty)
  ) {
    throw new BadRequestException('Invalid payload');
  }
  return value as RiskDifficulty;
}

@Controller(['mobile/risk-quiz', 'api/mobile/risk-quiz'])
export class RiskQuizController {
  constructor(private readonly riskQuizService: RiskQuizService) {}

  // --- Device-facing ---

  @Post('scan')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async scanCard(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.scanCard({
      sessionToken: requireString(payload, 'sessionToken'),
      code: requireString(payload, 'code'),
    });
  }

  @Post('answer')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async submitAnswer(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.submitAnswer({
      sessionToken: requireString(payload, 'sessionToken'),
      cardId: requireString(payload, 'cardId'),
      stationId: requireString(payload, 'stationId'),
      selectedIndex: optionalFiniteNumber(payload, 'selectedIndex'),
      completed: optionalBoolean(payload, 'completed'),
      completionCode: optionalString(payload, 'completionCode'),
    });
  }

  @Post('photo')
  @Throttle(MOBILE_PHOTO_UPLOAD_THROTTLE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES },
    }),
  )
  async submitPhotoTask(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { sessionToken?: string; cardId?: string; stationId?: string },
  ) {
    assertValidTeamPhotoFile(file);
    const payload = requirePayload(body);
    return this.riskQuizService.submitPhotoTask({
      sessionToken: requireString(payload, 'sessionToken'),
      cardId: requireString(payload, 'cardId'),
      stationId: requireString(payload, 'stationId'),
      file: file!,
    });
  }

  @Post('reviewed-answer')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async submitReviewedAnswer(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.submitReviewedAnswer({
      sessionToken: requireString(payload, 'sessionToken'),
      cardId: requireString(payload, 'cardId'),
      stationId: requireString(payload, 'stationId'),
      answerText: requireString(payload, 'answerText'),
    });
  }

  @Post('chat')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async listChatMessages(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.listChatMessages({
      sessionToken: requireString(payload, 'sessionToken'),
      afterId: optionalString(payload, 'afterId'),
    });
  }

  @Post('chat/send')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async sendChatMessage(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.postTeamChatMessage({
      sessionToken: requireString(payload, 'sessionToken'),
      content: requireString(payload, 'content'),
    });
  }

  @Post('deck-status')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async getDeckStatus(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.getDeckStatus(
      requireString(payload, 'sessionToken'),
    );
  }

  @Post('test-menu')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async getTestMenu(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.listTestMenuEntries(
      requireString(payload, 'sessionToken'),
    );
  }

  @Post('pending-draw')
  @Throttle(RISK_QUIZ_PENDING_DRAW_THROTTLE)
  async getPendingDraw(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.pollPendingDraw(
      requireString(payload, 'sessionToken'),
    );
  }

  // --- Admin: categories ---

  @Get('admin/schemes')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async listSchemes() {
    return this.riskQuizService.listSchemes();
  }

  @Post('admin/schemes')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async createScheme(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.createScheme(requireString(payload, 'name'));
  }

  @Patch('admin/schemes/:schemeId')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async renameScheme(
    @Param('schemeId') schemeId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.renameScheme(
      schemeId,
      requireString(payload, 'name'),
    );
  }

  @Delete('admin/schemes/:schemeId')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async deleteScheme(@Param('schemeId') schemeId: string) {
    return this.riskQuizService.deleteScheme(schemeId);
  }

  @Post('admin/schemes/:schemeId/categories')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async assignCategoryToScheme(
    @Param('schemeId') schemeId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.assignCategoryToScheme(
      schemeId,
      requireString(payload, 'categoryId'),
    );
  }

  @Delete('admin/scheme-categories/:schemeCategoryId')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async removeCategoryFromScheme(
    @Param('schemeCategoryId') schemeCategoryId: string,
  ) {
    return this.riskQuizService.removeCategoryFromScheme(schemeCategoryId);
  }

  @Get('admin/categories')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async listCategories() {
    return this.riskQuizService.listCategories();
  }

  // The realization's OWN deck (a clone, see cloneSchemeForRealization). Reading
  // it adopts the deck if this realization still points at a shared template, so
  // every edit made from the realization editor lands on the clone.
  @Get('admin/realizations/:realizationId/scheme')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getRealizationScheme(@Param('realizationId') realizationId: string) {
    return this.riskQuizService.getRealizationScheme(realizationId);
  }

  @Post('admin/categories')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async createCategory(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.createCategory(requireString(payload, 'name'));
  }

  @Patch('admin/categories/:categoryId')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.updateCategory(
      categoryId,
      requireString(payload, 'name'),
    );
  }

  @Delete('admin/categories/:categoryId')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return this.riskQuizService.deleteCategory(categoryId);
  }

  // --- Admin: pool stations (stations assigned to a category+difficulty pool) ---

  @Post('admin/categories/:categoryId/pool-stations')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async assignStationToPool(
    @Param('categoryId') categoryId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.assignStationToPool({
      categoryId,
      difficulty: requireDifficulty(payload, 'difficulty'),
      stationId: requireString(payload, 'stationId'),
    });
  }

  @Delete('admin/pool-stations/:poolStationId')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async removeStationFromPool(@Param('poolStationId') poolStationId: string) {
    return this.riskQuizService.removeStationFromPool(poolStationId);
  }

  // --- Admin: cards + board ---

  // Printable codes for a deck in the library, before any realization exists.
  // Derived from the deck's categories, so nothing is written.
  @Get('admin/schemes/:schemeId/card-codes')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async listSchemeCardCodes(@Param('schemeId') schemeId: string) {
    return this.riskQuizService.listSchemeCardCodes(schemeId);
  }

  @Get('admin/realizations/:realizationId/cards')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async listCards(@Param('realizationId') realizationId: string) {
    return this.riskQuizService.listCards(realizationId);
  }

  @Get('admin/realizations/:realizationId/chat')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async listChatMessagesForAdmin(
    @Param('realizationId') realizationId: string,
    @Query('afterId') afterId?: string,
  ) {
    return this.riskQuizService.listChatMessagesForAdmin({
      realizationId,
      afterId: afterId?.trim() || undefined,
    });
  }

  @Post('admin/realizations/:realizationId/chat')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async sendChatMessageAsGameMaster(
    @Param('realizationId') realizationId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.postGameMasterChatMessage({
      realizationId,
      content: requireString(payload, 'content'),
    });
  }

  @Post('admin/realizations/:realizationId/cards/generate')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async generateCards(@Param('realizationId') realizationId: string) {
    return this.riskQuizService.generateMissingCards(realizationId);
  }

  @Get('admin/realizations/:realizationId/board')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getBoard(@Param('realizationId') realizationId: string) {
    return this.riskQuizService.getBoard(realizationId);
  }

  @Get('admin/realizations/:realizationId/team-status')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getTeamCardStatus(@Param('realizationId') realizationId: string) {
    return this.riskQuizService.getTeamCardStatus(realizationId);
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/reset')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetTeamAttempts(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.riskQuizService.resetTeamAttempts(realizationId, teamId);
  }

  @Get('admin/realizations/:realizationId/teams/:teamId/board')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getTeamCardBoard(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.riskQuizService.getTeamCardBoard(realizationId, teamId);
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/launch')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async triggerRemoteDraw(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.triggerRemoteDraw(
      realizationId,
      teamId,
      requireString(payload, 'categoryId'),
      requireDifficulty(payload, 'difficulty'),
    );
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/cancel-remote-draw')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async cancelRemoteDraw(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.riskQuizService.cancelRemoteDraw(realizationId, teamId);
  }

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/complete',
  )
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async adminCompleteCard(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.riskQuizService.adminCompleteCard(
      realizationId,
      teamId,
      stationId,
    );
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/fail')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async adminFailCard(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.riskQuizService.adminFailCard(realizationId, teamId, stationId);
  }

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/reset',
  )
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async adminResetCard(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.riskQuizService.adminResetCard(
      realizationId,
      teamId,
      stationId,
    );
  }
}
