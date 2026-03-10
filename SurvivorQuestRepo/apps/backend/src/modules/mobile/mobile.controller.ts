import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
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
  pointsAwarded?: number;
  finishedAt?: string;
};

@Controller(['mobile', 'api/mobile'])
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('bootstrap')
  async getMobileBootstrap() {
    return this.mobileService.getMobileBootstrap();
  }

  @Post('session/join')
  async joinMobileSession(@Body() payload: JoinSessionPayload) {
    return this.mobileService.joinMobileSession({
      joinCode: payload.joinCode || '',
      deviceId: payload.deviceId || '',
      memberName: payload.memberName,
    });
  }

  @Get('session/state')
  async getMobileSessionState(@Query('sessionToken') sessionToken?: string) {
    return this.mobileService.getMobileSessionState(sessionToken || '');
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
      pointsAwarded: Number(payload.pointsAwarded),
      finishedAt: payload.finishedAt,
    });
  }

  @Get('admin/realizations/current')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminCurrentRealizationOverview() {
    return this.mobileService.getMobileAdminRealizationOverview('current');
  }

  @Get('admin/realizations/current/locations')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminCurrentRealizationLocations() {
    return this.mobileService.getMobileAdminRealizationLocations('current');
  }

  @Get('admin/realizations/:realizationId')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminRealizationOverview(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.getMobileAdminRealizationOverview(realizationId);
  }

  @Get('admin/realizations/:realizationId/locations')
  @UseGuards(AdminSessionGuard)
  async getMobileAdminRealizationLocations(
    @Param('realizationId') realizationId: string,
  ) {
    return this.mobileService.getMobileAdminRealizationLocations(realizationId);
  }
}
