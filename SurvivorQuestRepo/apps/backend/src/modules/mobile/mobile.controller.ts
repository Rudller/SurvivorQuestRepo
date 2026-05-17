import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import {
  MOBILE_JOIN_THROTTLE,
  MOBILE_QR_RESOLVE_THROTTLE,
} from '../../common/security/throttle.constants';
import { MobileService } from './mobile.service';

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
      badgeImageUrl: optionalString(payload, 'badgeImageUrl'),
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
  @UseGuards(AdminSessionGuard)
  async getMobileAdminCurrentRealizationOverview() {
    return this.mobileService.getMobileAdminRealizationOverview('current');
  }

  @Post('admin/realizations/current/reset-completed-tasks')
  @UseGuards(AdminSessionGuard)
  async resetMobileAdminCurrentRealizationCompletedTasks() {
    return this.mobileService.resetMobileAdminCompletedTasks('current');
  }

  @Post('admin/realizations/current/start')
  @UseGuards(AdminSessionGuard)
  async startMobileAdminCurrentRealization() {
    return this.mobileService.startMobileAdminRealization('current');
  }

  @Post('admin/realizations/current/finish')
  @UseGuards(AdminSessionGuard)
  async finishMobileAdminCurrentRealization() {
    return this.mobileService.finishMobileAdminRealization('current');
  }

  @Post('admin/realizations/current/reset')
  @UseGuards(AdminSessionGuard)
  async resetMobileAdminCurrentRealization() {
    return this.mobileService.resetMobileAdminRealization('current');
  }

  @Get('admin/realizations/current/locations')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminCurrentRealizationLocations() {
    return this.mobileService.getMobileAdminRealizationLocations('current');
  }

  @Get('admin/realizations/current/station-qr')
  @UseGuards(AdminSessionGuard)
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
  @UseGuards(AdminSessionGuard)
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
  @UseGuards(AdminSessionGuard)
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
  @UseGuards(AdminSessionGuard)
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

  @Get('admin/realizations/:realizationId')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminRealizationOverview(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.getMobileAdminRealizationOverview(realizationId);
  }

  @Post('admin/realizations/:realizationId/reset-completed-tasks')
  @UseGuards(AdminSessionGuard)
  async resetMobileAdminRealizationCompletedTasks(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.resetMobileAdminCompletedTasks(realizationId);
  }

  @Post('admin/realizations/:realizationId/start')
  @UseGuards(AdminSessionGuard)
  async startMobileAdminRealization(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.startMobileAdminRealization(realizationId);
  }

  @Post('admin/realizations/:realizationId/finish')
  @UseGuards(AdminSessionGuard)
  async finishMobileAdminRealization(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.finishMobileAdminRealization(realizationId);
  }

  @Post('admin/realizations/:realizationId/reset')
  @UseGuards(AdminSessionGuard)
  async resetMobileAdminRealization(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.resetMobileAdminRealization(realizationId);
  }

  @Get('admin/realizations/:realizationId/locations')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminRealizationLocations(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.getMobileAdminRealizationLocations(realizationId);
  }

  @Get('admin/realizations/:realizationId/station-qr')
  @UseGuards(AdminSessionGuard)
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

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/reset',
  )
  @UseGuards(AdminSessionGuard)
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
  @UseGuards(AdminSessionGuard)
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
  @UseGuards(AdminSessionGuard)
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
