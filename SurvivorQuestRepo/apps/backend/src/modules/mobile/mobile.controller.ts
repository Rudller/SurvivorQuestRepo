import {
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

type JoinSessionPayload = {
  joinCode?: string;
  deviceId?: string;
  memberName?: string;
};

type ClaimTeamPayload = {
  sessionToken?: string;
  name?: string;
  color?: string;
  badgeKey?: string;
  badgeImageUrl?: string;
};

type SelectTeamPayload = {
  sessionToken?: string;
  slotNumber?: number;
};

type RandomizeTeamPayload = {
  sessionToken?: string;
};

type UpdateTeamCustomizationPayload = {
  sessionToken?: string;
  color?: string;
  badgeKey?: string;
};

type LocationPayload = {
  sessionToken?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  at?: string;
};

type CompleteTaskPayload = {
  sessionToken?: string;
  stationId?: string;
  completionCode?: string;
  startedAt?: string;
  finishedAt?: string;
};

type FailTaskPayload = {
  sessionToken?: string;
  stationId?: string;
  reason?: string;
  startedAt?: string;
  finishedAt?: string;
};

type StartTaskPayload = {
  sessionToken?: string;
  stationId?: string;
  startedAt?: string;
};

type AdminFailTaskPayload = {
  reason?: string;
};

type ResolveStationQrPayload = {
  sessionToken?: string;
  token?: string;
  selectedLanguage?: string;
};

type SessionStatePayload = {
  sessionToken?: string;
  selectedLanguage?: string;
};

@Controller(['mobile', 'api/mobile'])
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('bootstrap')
  async getMobileBootstrap() {
    return this.mobileService.getMobileBootstrap();
  }

  @Post('session/join')
  @Throttle(MOBILE_JOIN_THROTTLE)
  async joinMobileSession(@Body() payload: JoinSessionPayload) {
    return this.mobileService.joinMobileSession({
      joinCode: payload.joinCode || '',
      deviceId: payload.deviceId || '',
      memberName: payload.memberName,
    });
  }

  @Post('session/state')
  async getMobileSessionState(@Body() payload: SessionStatePayload) {
    return this.mobileService.getMobileSessionState(
      payload.sessionToken || '',
      payload.selectedLanguage,
    );
  }

  @Post('team/claim')
  async claimMobileTeam(@Body() payload: ClaimTeamPayload) {
    return this.mobileService.claimMobileTeam({
      sessionToken: payload.sessionToken || '',
      name: payload.name || '',
      color: payload.color || '',
      badgeKey: payload.badgeKey,
      badgeImageUrl: payload.badgeImageUrl,
    });
  }

  @Post('team/select')
  async selectMobileTeam(@Body() payload: SelectTeamPayload) {
    return this.mobileService.selectMobileTeam({
      sessionToken: payload.sessionToken || '',
      slotNumber: Number(payload.slotNumber),
    });
  }

  @Post('team/randomize')
  async randomizeMobileTeam(@Body() payload: RandomizeTeamPayload) {
    return this.mobileService.randomizeMobileTeam({
      sessionToken: payload.sessionToken || '',
    });
  }

  @Post('team/customization')
  async updateMobileTeamCustomization(
    @Body() payload: UpdateTeamCustomizationPayload,
  ) {
    return this.mobileService.updateMobileTeamCustomization({
      sessionToken: payload.sessionToken || '',
      color: payload.color,
      badgeKey: payload.badgeKey,
    });
  }

  @Post('team/location')
  async updateMobileTeamLocation(@Body() payload: LocationPayload) {
    return this.mobileService.updateMobileTeamLocation({
      sessionToken: payload.sessionToken || '',
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
      at: payload.at,
    });
  }

  @Post('task/complete')
  async completeMobileTask(@Body() payload: CompleteTaskPayload) {
    return this.mobileService.completeMobileTask({
      sessionToken: payload.sessionToken || '',
      stationId: payload.stationId || '',
      completionCode: payload.completionCode,
      startedAt: payload.startedAt,
      finishedAt: payload.finishedAt,
    });
  }

  @Post('task/fail')
  async failMobileTask(@Body() payload: FailTaskPayload) {
    return this.mobileService.failMobileTask({
      sessionToken: payload.sessionToken || '',
      stationId: payload.stationId || '',
      reason: payload.reason,
      startedAt: payload.startedAt,
      finishedAt: payload.finishedAt,
    });
  }

  @Post('task/start')
  async startMobileTask(@Body() payload: StartTaskPayload) {
    return this.mobileService.startMobileTask({
      sessionToken: payload.sessionToken || '',
      stationId: payload.stationId || '',
      startedAt: payload.startedAt,
    });
  }

  @Post('station/resolve-qr')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async resolveMobileStationQr(@Body() payload: ResolveStationQrPayload) {
    return this.mobileService.resolveMobileStationQr({
      sessionToken: payload.sessionToken || '',
      token: payload.token || '',
      selectedLanguage: payload.selectedLanguage,
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

  @Post('admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/reset')
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

  @Post('admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/complete')
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
