import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Express } from 'express';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOnly, AdminOrInstructor } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { hasExpectedFileSignature } from '../../shared/lib/file-signature';
import {
  MOBILE_JOIN_THROTTLE,
  MOBILE_PHOTO_UPLOAD_THROTTLE,
  MOBILE_QR_RESOLVE_THROTTLE,
} from '../../common/security/throttle.constants';
import { MobileService } from './mobile.service';

const MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TEAM_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type AdminFailTaskPayload = {
  reason?: string;
};

type MobilePayload = Record<string, unknown>;

function requirePayload(value: unknown): MobilePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid payload');
  }

  return value as MobilePayload;
}

function requireString(payload: MobilePayload, key: string) {
  const value = payload[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('Invalid payload');
  }

  return value.trim();
}

function optionalString(payload: MobilePayload, key: string) {
  const value = payload[key];
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid payload');
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function requireFiniteNumber(payload: MobilePayload, key: string) {
  const value = payload[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException('Invalid payload');
  }

  return value;
}

function optionalFiniteNumber(payload: MobilePayload, key: string) {
  const value = payload[key];
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException('Invalid payload');
  }

  return value;
}

function assertValidTeamPhotoFile(file: Express.Multer.File | undefined) {
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

@Controller(['mobile', 'api/mobile'])
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('bootstrap')
  async getMobileBootstrap() {
    return this.mobileService.getMobileBootstrap();
  }

  @Post('session/join')
  @Throttle(MOBILE_JOIN_THROTTLE)
  async joinMobileSession(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.joinMobileSession({
      joinCode: requireString(payload, 'joinCode'),
      deviceId: requireString(payload, 'deviceId'),
      memberName: optionalString(payload, 'memberName'),
    });
  }

  @Post('session/state')
  async getMobileSessionState(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.getMobileSessionState(
      requireString(payload, 'sessionToken'),
      optionalString(payload, 'selectedLanguage'),
    );
  }

  @Post('team/claim')
  async claimMobileTeam(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.claimMobileTeam({
      sessionToken: requireString(payload, 'sessionToken'),
      name: requireString(payload, 'name'),
      color: requireString(payload, 'color'),
      badgeKey: optionalString(payload, 'badgeKey'),
    });
  }

  @Post('team/selfie')
  @Throttle(MOBILE_PHOTO_UPLOAD_THROTTLE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadMobileTeamSelfie(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { sessionToken?: string },
  ) {
    assertValidTeamPhotoFile(file);
    return this.mobileService.uploadTeamSelfie({
      sessionToken: requireString(body as MobilePayload, 'sessionToken'),
      file: file!,
    });
  }

  @Post('team/select')
  async selectMobileTeam(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.selectMobileTeam({
      sessionToken: requireString(payload, 'sessionToken'),
      slotNumber: requireFiniteNumber(payload, 'slotNumber'),
    });
  }

  @Post('team/randomize')
  async randomizeMobileTeam(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.randomizeMobileTeam({
      sessionToken: requireString(payload, 'sessionToken'),
    });
  }

  @Post('team/customization')
  async updateMobileTeamCustomization(
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.updateMobileTeamCustomization({
      sessionToken: requireString(payload, 'sessionToken'),
      color: optionalString(payload, 'color'),
      badgeKey: optionalString(payload, 'badgeKey'),
    });
  }

  @Post('team/location')
  async updateMobileTeamLocation(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.updateMobileTeamLocation({
      sessionToken: requireString(payload, 'sessionToken'),
      lat: requireFiniteNumber(payload, 'lat'),
      lng: requireFiniteNumber(payload, 'lng'),
      accuracy: optionalFiniteNumber(payload, 'accuracy'),
      speed: optionalFiniteNumber(payload, 'speed'),
      heading: optionalFiniteNumber(payload, 'heading'),
      at: optionalString(payload, 'at'),
    });
  }

  @Post('task/complete')
  async completeMobileTask(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.completeMobileTask({
      sessionToken: requireString(payload, 'sessionToken'),
      stationId: requireString(payload, 'stationId'),
      completionCode: optionalString(payload, 'completionCode'),
      startedAt: optionalString(payload, 'startedAt'),
      finishedAt: optionalString(payload, 'finishedAt'),
      challengeDifficulty: optionalString(payload, 'challengeDifficulty'),
    });
  }

  @Post('task/fail')
  async failMobileTask(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.failMobileTask({
      sessionToken: requireString(payload, 'sessionToken'),
      stationId: requireString(payload, 'stationId'),
      reason: optionalString(payload, 'reason'),
      startedAt: optionalString(payload, 'startedAt'),
      finishedAt: optionalString(payload, 'finishedAt'),
    });
  }

  @Post('task/start')
  async startMobileTask(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.startMobileTask({
      sessionToken: requireString(payload, 'sessionToken'),
      stationId: requireString(payload, 'stationId'),
      startedAt: optionalString(payload, 'startedAt'),
    });
  }

  @Post('task/photo')
  @Throttle(MOBILE_PHOTO_UPLOAD_THROTTLE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_TEAM_PHOTO_UPLOAD_SIZE_BYTES },
    }),
  )
  async uploadMobileTaskPhoto(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { sessionToken?: string; stationId?: string },
  ) {
    assertValidTeamPhotoFile(file);
    return this.mobileService.uploadTeamTaskPhoto({
      sessionToken: requireString(body as MobilePayload, 'sessionToken'),
      stationId: requireString(body as MobilePayload, 'stationId'),
      file: file!,
    });
  }

  @Post('station/resolve-qr')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async resolveMobileStationQr(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.mobileService.resolveMobileStationQr({
      sessionToken: requireString(payload, 'sessionToken'),
      token: requireString(payload, 'token'),
      selectedLanguage: optionalString(payload, 'selectedLanguage'),
    });
  }

  @Get('admin/realizations/current')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminCurrentRealizationOverview() {
    return this.mobileService.getMobileAdminRealizationOverview('current');
  }

  @Post('admin/realizations/current/reset-completed-tasks')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetMobileAdminCurrentRealizationCompletedTasks() {
    return this.mobileService.resetMobileAdminCompletedTasks('current');
  }

  @Post('admin/realizations/current/start')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async startMobileAdminCurrentRealization() {
    return this.mobileService.startMobileAdminRealization('current');
  }

  @Post('admin/realizations/current/finish')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async finishMobileAdminCurrentRealization() {
    return this.mobileService.finishMobileAdminRealization('current');
  }

  @Post('admin/realizations/current/reset')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetMobileAdminCurrentRealization() {
    return this.mobileService.resetMobileAdminRealization('current');
  }

  @Get('admin/realizations/current/locations')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminCurrentRealizationLocations() {
    return this.mobileService.getMobileAdminRealizationLocations('current');
  }

  @Get('admin/realizations/current/station-qr')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminCurrentRealizationStationQrs(
    @Query('ttlSeconds') ttlSeconds?: string,
  ) {
    const ttlCandidate =
      typeof ttlSeconds === 'string' && ttlSeconds.trim().length > 0
        ? Number(ttlSeconds)
        : undefined;
    return this.mobileService.getMobileAdminStationQrs('current', ttlCandidate);
  }

  @Post('admin/realizations/current/teams/:teamId/tasks/:stationId/reset')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetMobileAdminCurrentTeamTask(
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.mobileService.resetMobileAdminTeamTask({
      realizationId: 'current',
      teamId,
      stationId,
    });
  }

  @Post('admin/realizations/current/teams/:teamId/tasks/:stationId/complete')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async completeMobileAdminCurrentTeamTask(
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.mobileService.completeMobileAdminTeamTask({
      realizationId: 'current',
      teamId,
      stationId,
    });
  }

  @Post('admin/realizations/current/teams/:teamId/tasks/:stationId/fail')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async failMobileAdminCurrentTeamTask(
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
    @Body() payload: AdminFailTaskPayload,
  ) {
    return this.mobileService.failMobileAdminTeamTask({
      realizationId: 'current',
      teamId,
      stationId,
      reason: payload.reason,
    });
  }

  @Get('admin/realizations/current/photo-reviews')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminCurrentPhotoReviews() {
    return this.mobileService.listPendingPhotoReviews('current');
  }

  @Get('admin/realizations/:realizationId')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminRealizationOverview(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.getMobileAdminRealizationOverview(realizationId);
  }

  @Post('admin/realizations/:realizationId/reset-completed-tasks')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetMobileAdminRealizationCompletedTasks(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.resetMobileAdminCompletedTasks(realizationId);
  }

  @Post('admin/realizations/:realizationId/start')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async startMobileAdminRealization(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.startMobileAdminRealization(realizationId);
  }

  @Post('admin/realizations/:realizationId/finish')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async finishMobileAdminRealization(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.finishMobileAdminRealization(realizationId);
  }

  @Post('admin/realizations/:realizationId/reset')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetMobileAdminRealization(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.resetMobileAdminRealization(realizationId);
  }

  @Get('admin/realizations/:realizationId/locations')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminRealizationLocations(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.getMobileAdminRealizationLocations(realizationId);
  }

  @Get('admin/realizations/:realizationId/station-qr')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminRealizationStationQrs(
    @Param('realizationId') realizationId: string,
    @Query('ttlSeconds') ttlSeconds?: string,
  ) {
    const ttlCandidate =
      typeof ttlSeconds === 'string' && ttlSeconds.trim().length > 0
        ? Number(ttlSeconds)
        : undefined;
    return this.mobileService.getMobileAdminStationQrs(
      realizationId,
      ttlCandidate,
    );
  }

  @Get('admin/realizations/:realizationId/photo-reviews')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getMobileAdminPhotoReviews(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.listPendingPhotoReviews(realizationId);
  }

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/reset',
  )
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async resetMobileAdminTeamTask(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.mobileService.resetMobileAdminTeamTask({
      realizationId,
      teamId,
      stationId,
    });
  }

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/complete',
  )
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async completeMobileAdminTeamTask(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
  ) {
    return this.mobileService.completeMobileAdminTeamTask({
      realizationId,
      teamId,
      stationId,
    });
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/fail')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async failMobileAdminTeamTask(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Param('stationId') stationId: string,
    @Body() payload: AdminFailTaskPayload,
  ) {
    return this.mobileService.failMobileAdminTeamTask({
      realizationId,
      teamId,
      stationId,
      reason: payload.reason,
    });
  }
}
