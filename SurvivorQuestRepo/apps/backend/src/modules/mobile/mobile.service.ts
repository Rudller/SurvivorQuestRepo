import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  EventActorType,
  PointsQrClaimMode,
  Prisma,
  RealizationStatus as PrismaRealizationStatus,
  TaskStatus,
  TeamStatus,
} from '@prisma/client';
import type { Express } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getOpaqueTokenCandidates,
  hashOpaqueToken,
} from '../../shared/lib/opaque-token';
import { isUniqueConstraintError } from '../../shared/lib/prisma-errors';
import { generateRandomCode } from '../../shared/lib/random-code';
import {
  RealizationService,
  type RealizationStatus,
} from '../realization/realization.service';
import { StationService, type StationEntity } from '../station/station.service';
import { StationStorageService } from '../station/station-storage.service';
import {
  buildStationQrEntryUrl,
  isCodeProtectedStationType,
  isTimedStartRequiredStationType,
  parseCompletionCode,
  resolveCompletionCodeInputMode,
} from './domain/mobile-station.helpers';
import {
  resolveLocalizedRealizationTexts,
  resolveLocalizedStationPresentation,
  resolveRealizationLanguageContext,
} from './domain/mobile-language.helpers';
import {
  parseIsoOrNow,
  parseOptionalNumberInRange,
  shouldSkipLocationUpdate,
  isLatitude,
  isLongitude,
} from './domain/mobile-location.helpers';
import {
  BADGE_KEYS,
  FUNNY_TEAM_NAMES,
  TEAM_COLORS,
  type TeamColor,
  normalizeTeamBadgeKey,
  normalizeTeamColor,
  parseTeamColor,
  toLowerSafe,
} from './domain/mobile-team.helpers';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOCATION_MAX_ACCURACY_METERS = 10_000;
const LOCATION_MAX_SPEED_MPS = 120;
const MINUTES_TO_MS = 60_000;
const AUTO_DONE_GRACE_MS = 24 * 60 * 60 * 1000;

function parseMobileTaskTimestamp(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new BadRequestException('Invalid payload');
  }

  return parsed;
}

function isTimedPointsDecayEnabled(input: {
  timedStationPointsDecayEnabled?: boolean | null;
}) {
  return input.timedStationPointsDecayEnabled === true;
}

function hasTimedPointsDecay(input: {
  timedStationPointsDecayEnabled?: boolean | null;
  timeLimitSeconds: number;
}) {
  return (
    isTimedPointsDecayEnabled(input) &&
    Math.max(0, Math.round(input.timeLimitSeconds)) > 0
  );
}

function throwTeamCustomizationConflict(error: unknown): never {
  if (!isUniqueConstraintError(error)) {
    throw error;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(',')
    : String(error.meta?.target ?? '');

  if (target.includes('color')) {
    throw new ConflictException('Team color already taken');
  }

  if (target.includes('badgeKey')) {
    throw new ConflictException('Team icon already taken');
  }

  throw new ConflictException('Team customization already taken');
}

type MobileSessionEndReason =
  | 'time-expired'
  | 'all-tasks-completed'
  | 'realization-finished';

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realizationService: RealizationService,
    private readonly stationService: StationService,
    private readonly stationStorageService: StationStorageService,
  ) {}

  async getMobileBootstrap() {
    const realizations = await this.getRealizationsView();

    return {
      serverTime: new Date().toISOString(),
      teamColors: TEAM_COLORS,
      badgeKeys: BADGE_KEYS,
      latestAppVersion: process.env.MOBILE_APP_LATEST_VERSION ?? null,
      realizations: realizations.map((realization) => {
        const languageContext = resolveRealizationLanguageContext({
          language: realization.language,
          customLanguage: realization.customLanguage,
        });
        const localizedTexts = resolveLocalizedRealizationTexts(
          realization,
          languageContext,
        );

        return {
          id: realization.id,
          companyName: realization.companyName,
          type: realization.type,
          language: languageContext.baseLanguage,
          customLanguage: languageContext.customLanguage,
          selectedLanguage: languageContext.selectedLanguage,
          availableLanguages: languageContext.availableLanguageOptions,
          introText: localizedTexts.introText,
          gameRules: localizedTexts.gameRules,
          status: this.normalizeStatus(
            realization.status,
            realization.scheduledAt,
            realization.durationMinutes,
          ),
          scheduledAt: realization.scheduledAt,
          durationMinutes: realization.durationMinutes,
          locationRequired: realization.locationRequired,
          showLeaderboard: realization.showLeaderboard,
          showLeaderboardDuringGame: realization.showLeaderboardDuringGame,
          showLeaderboardOnFinish: realization.showLeaderboardOnFinish,
          hideLeaderboardMinutesBeforeEnd:
            realization.hideLeaderboardMinutesBeforeEnd,
          teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
          timedStationPointsDecayEnabled:
            realization.timedStationPointsDecayEnabled,
          hideTaskList: realization.hideTaskList,
          teamCount: realization.teamCount,
          stationIds: realization.stationIds,
          createdAt: realization.createdAt,
          updatedAt: realization.updatedAt,
        };
      }),
    };
  }

  async joinMobileSession(input: {
    joinCode: string;
    deviceId: string;
    memberName?: string;
  }) {
    const joinCode = input.joinCode?.trim();
    const deviceId = input.deviceId?.trim();

    if (!joinCode || !deviceId) {
      throw new BadRequestException('Invalid payload');
    }

    const realizations = await this.getRealizationsView();
    const realization = this.findRealizationByJoinCode(realizations, joinCode);

    if (!realization) {
      throw new NotFoundException('Invalid join code');
    }

    await this.ensureTeamsForRealization(realization);

    const existingAssignment = await this.prisma.teamAssignment.findFirst({
      where: {
        realizationId: realization.id,
        deviceId,
      },
      orderBy: { createdAt: 'desc' },
      include: { team: true },
    });

    if (
      existingAssignment &&
      !this.isExpired(existingAssignment.expiresAt.toISOString())
    ) {
      const rotatedSessionToken = this.generateSessionToken();
      const refreshed = await this.touchAssignment(
        existingAssignment.id,
        rotatedSessionToken,
      );
      if (!existingAssignment.team) {
        throw new NotFoundException('Team not found');
      }

      const customizationOccupancy =
        await this.getCustomizationOccupancyByRealization(realization.id);

      return {
        sessionToken: rotatedSessionToken,
        realizationId: realization.id,
        team: {
          id: existingAssignment.team.id,
          slotNumber: existingAssignment.team.slotNumber,
          name: existingAssignment.team.name,
          color: existingAssignment.team.color,
          badgeKey: normalizeTeamBadgeKey(existingAssignment.team.badgeKey),
          badgeImageUrl: existingAssignment.team.badgeImageUrl,
          points: existingAssignment.team.points,
        },
        customizationOccupancy,
        locationRequired: realization.locationRequired,
        refreshedAt: refreshed,
      };
    }

    const teams = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
    });

    const now = new Date();
    let selectedTeam = existingAssignment?.team
      ? teams.find((team) => team.id === existingAssignment.teamId) || teams[0]
      : teams[0];

    if (existingAssignment?.team && selectedTeam) {
      const activeOnSelected = await this.prisma.teamAssignment.findMany({
        where: {
          teamId: selectedTeam.id,
          expiresAt: { gt: now },
          deviceId: { not: deviceId },
        },
        select: { id: true },
      });

      if (activeOnSelected.length > 0) {
        await this.prisma.teamAssignment.deleteMany({
          where: {
            id: { in: activeOnSelected.map((item) => item.id) },
          },
        });
      }
    }

    if (!existingAssignment?.team) {
      for (const candidate of teams) {
        const activeCount = await this.prisma.teamAssignment.count({
          where: {
            teamId: candidate.id,
            expiresAt: { gt: now },
          },
        });
        if (activeCount === 0) {
          selectedTeam = candidate;
          break;
        }
      }
    }

    if (!selectedTeam) {
      throw new ConflictException('No free team slots');
    }

    const customizationOccupancy =
      await this.getCustomizationOccupancyByRealization(realization.id);

    if (existingAssignment) {
      await this.prisma.teamAssignment.deleteMany({
        where: {
          realizationId: realization.id,
          deviceId,
        },
      });
    }

    const sessionToken = this.generateSessionToken();
    const assignment = await this.prisma.teamAssignment.create({
      data: {
        realizationId: realization.id,
        teamId: selectedTeam.id,
        deviceId,
        memberName: input.memberName?.trim() || null,
        sessionToken: hashOpaqueToken(sessionToken),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        lastSeenAt: now,
      },
    });

    await this.prisma.team.update({
      where: { id: selectedTeam.id },
      data: {
        status: TeamStatus.ACTIVE,
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: selectedTeam.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: deviceId,
      eventType: 'team_joined',
      payload: {
        slotNumber: selectedTeam.slotNumber,
        memberName: assignment.memberName,
      },
    });

    return {
      sessionToken,
      realizationId: realization.id,
      team: {
        id: selectedTeam.id,
        slotNumber: selectedTeam.slotNumber,
        name: selectedTeam.name,
        color: selectedTeam.color,
        badgeKey: normalizeTeamBadgeKey(selectedTeam.badgeKey),
        badgeImageUrl: selectedTeam.badgeImageUrl,
        points: selectedTeam.points,
      },
      customizationOccupancy,
      locationRequired: realization.locationRequired,
    };
  }

  async getMobileSessionState(sessionToken: string, selectedLanguage?: string) {
    const { assignment, team, realization } =
      await this.requireSession(sessionToken);
    const languageContext = resolveRealizationLanguageContext({
      language: realization.language,
      customLanguage: realization.customLanguage,
      selectedLanguage,
    });
    const taskProgress = await this.prisma.teamTaskProgress.findMany({
      where: {
        realizationId: realization.id,
        teamId: team.id,
      },
    });
    const failedStationIds = await this.getFailedTaskStationIds({
      realizationId: realization.id,
      teamId: team.id,
    });
    const stationScans = await this.prisma.teamStationScan.findMany({
      where: {
        realizationId: realization.id,
        teamId: team.id,
      },
      select: { stationId: true },
    });
    const scanCountByStationId = new Map<string, number>();
    for (const scan of stationScans) {
      scanCountByStationId.set(
        scan.stationId,
        (scanCountByStationId.get(scan.stationId) ?? 0) + 1,
      );
    }

    const orderedStationIds = this.resolveTeamStationOrder(
      realization.stationIds,
      team.slotNumber,
      realization.teamStationNumberingEnabled,
    );
    const timeLimitSecondsByStationId =
      await this.getTimeLimitSecondsByStationId(
        orderedStationIds.map(({ stationId }) => stationId),
      );

    const tasks = orderedStationIds.map(({ stationId, stationNumber }) => {
      const progress = taskProgress.find(
        (item) => item.stationId === stationId,
      );
      return {
        stationId,
        stationNumber,
        status:
          this.resolveEffectiveTaskStatus(
            progress?.status,
            failedStationIds.has(stationId),
            progress?.startedAt,
            timeLimitSecondsByStationId.get(stationId),
          ) || 'todo',
        pointsAwarded: progress?.pointsAwarded || 0,
        startedAt: progress?.startedAt?.toISOString() || null,
        finishedAt: progress?.finishedAt?.toISOString() || null,
        qrScanCompletedCount: scanCountByStationId.get(stationId) ?? 0,
      };
    });

    const eventLogCount = await this.prisma.eventLog.count({
      where: { realizationId: realization.id },
    });
    const customizationOccupancy =
      await this.getCustomizationOccupancyByRealization(realization.id);
    const normalizedRealizationStatus = this.normalizeStatus(
      realization.status,
      realization.scheduledAt,
      realization.durationMinutes,
    );
    const sessionEndState = await this.resolveSessionEndState({
      realization,
      teamId: team.id,
      normalizedRealizationStatus,
    });
    const leaderboard = await this.buildRealizationLeaderboard(realization.id);

    if (normalizedRealizationStatus === 'planned') {
      await this.emitTeamReadyForStartIfNeeded({
        realizationId: realization.id,
        teamId: team.id,
        actorId: assignment.deviceId,
        sessionExpiresAt: assignment.expiresAt.toISOString(),
      });
    }

    const localizedTexts = resolveLocalizedRealizationTexts(
      realization,
      languageContext,
    );

    return {
      realization: {
        id: realization.id,
        companyName: realization.companyName,
        introText: localizedTexts.introText,
        gameRules: localizedTexts.gameRules,
        contactPerson: realization.contactPerson,
        contactPhone: realization.contactPhone,
        contactEmail: realization.contactEmail,
        logoUrl: realization.logoUrl,
        hideMap: realization.hideMap,
        mapImageUrl: realization.mapImageUrl,
        type: realization.type,
        teamCount: realization.teamCount,
        peopleCount: realization.peopleCount,
        positionsCount: realization.positionsCount,
        language: languageContext.baseLanguage,
        customLanguage: languageContext.customLanguage,
        selectedLanguage: languageContext.selectedLanguage,
        availableLanguages: languageContext.availableLanguageOptions,
        instructors: realization.instructors,
        status: normalizedRealizationStatus,
        locationRequired: realization.locationRequired,
        showLeaderboard: realization.showLeaderboard,
        showLeaderboardDuringGame: realization.showLeaderboardDuringGame,
        showLeaderboardOnFinish: realization.showLeaderboardOnFinish,
        hideLeaderboardMinutesBeforeEnd:
          realization.hideLeaderboardMinutesBeforeEnd,
        teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
        timedStationPointsDecayEnabled:
          realization.timedStationPointsDecayEnabled,
        hideTaskList: realization.hideTaskList,
        scheduledAt: realization.scheduledAt,
        durationMinutes: realization.durationMinutes,
        stations: realization.scenarioStations.map((station) =>
          this.toMobileStationPayload(station, languageContext),
        ),
      },
      team: {
        id: team.id,
        slotNumber: team.slotNumber,
        name: team.name,
        color: team.color,
        badgeKey: normalizeTeamBadgeKey(team.badgeKey),
        badgeImageUrl: team.badgeImageUrl,
        points: team.points,
        lastLocation: this.toLastLocation(team),
      },
      customizationOccupancy,
      tasks,
      endState: sessionEndState,
      leaderboard,
      meta: {
        sessionExpiresAt: assignment.expiresAt.toISOString(),
        eventLogCount,
      },
    };
  }

  async claimMobileTeam(input: {
    sessionToken: string;
    name: string;
    color: string;
    badgeKey?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    const teamName = input.name?.trim();
    const requestedColor = input.color?.trim();
    const color = requestedColor
      ? parseTeamColor(requestedColor)
      : normalizeTeamColor(team.color);

    if (!teamName) {
      throw new BadRequestException('Team name is required');
    }
    if (!color) {
      throw new BadRequestException('Team color is required');
    }

    const peers = await this.prisma.team.findMany({
      where: {
        realizationId: realization.id,
        id: { not: team.id },
      },
    });

    if (
      peers.some((item) => toLowerSafe(item.name) === teamName.toLowerCase())
    ) {
      throw new ConflictException('Team name already taken');
    }

    if (peers.some((item) => item.color === color)) {
      throw new ConflictException('Team color already taken');
    }

    const changedFields: string[] = [];
    const normalizedCurrentBadgeKey = normalizeTeamBadgeKey(team.badgeKey);
    if (team.name !== teamName) changedFields.push('name');
    if (team.color !== color) changedFields.push('color');

    const nextBadgeKey = normalizeTeamBadgeKey(input.badgeKey);
    if (
      nextBadgeKey &&
      peers.some(
        (item) => normalizeTeamBadgeKey(item.badgeKey) === nextBadgeKey,
      )
    ) {
      throw new ConflictException('Team icon already taken');
    }

    if (normalizedCurrentBadgeKey !== nextBadgeKey) {
      changedFields.push('badge');
    }

    try {
      await this.prisma.team.update({
        where: { id: team.id },
        data: {
          name: teamName,
          color,
          badgeKey: nextBadgeKey,
          status: TeamStatus.ACTIVE,
        },
      });
    } catch (error) {
      throwTeamCustomizationConflict(error);
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_profile_updated',
      payload: { changedFields },
    });
    const customizationOccupancy =
      await this.getCustomizationOccupancyByRealization(realization.id);

    return {
      teamId: team.id,
      name: teamName,
      color,
      badgeKey: nextBadgeKey,
      changedFields,
      customizationOccupancy,
    };
  }

  async uploadTeamSelfie(input: {
    sessionToken: string;
    file: Express.Multer.File;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    const uploaded = await this.stationStorageService.uploadTeamSelfie(
      input.file,
      { realizationId: realization.id, teamId: team.id },
    );

    const previousSelfie = await this.prisma.teamPhoto.findFirst({
      where: { teamId: team.id, kind: 'TEAM_SELFIE' },
    });

    await this.prisma.$transaction([
      this.prisma.teamPhoto.deleteMany({
        where: { teamId: team.id, kind: 'TEAM_SELFIE' },
      }),
      this.prisma.teamPhoto.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          kind: 'TEAM_SELFIE',
          objectKey: uploaded.key,
          url: uploaded.url,
        },
      }),
      this.prisma.team.update({
        where: { id: team.id },
        data: { badgeImageUrl: uploaded.url },
      }),
    ]);

    if (previousSelfie) {
      const previousKey = this.stationStorageService.getObjectKeyFromUrl(
        previousSelfie.url,
      );
      if (previousKey) {
        await this.stationStorageService.deleteObject(previousKey);
      }
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_profile_updated',
      payload: { changedFields: ['selfie'] },
    });

    return { teamId: team.id, url: uploaded.url };
  }

  async uploadTeamTaskPhoto(input: {
    sessionToken: string;
    stationId: string;
    file: Express.Multer.File;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    await this.assertGameplayAllowed({
      realization,
      teamId: team.id,
    });

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    if (station.type !== 'photo-task') {
      throw new BadRequestException(
        'This station does not accept photo submissions',
      );
    }

    this.assertLocationRequirementSatisfied(realization, team);

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      throw new ConflictException('Task already completed');
    }

    const uploaded = await this.stationStorageService.uploadTeamTaskPhoto(
      input.file,
      {
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
      },
    );

    await this.prisma.teamPhoto.create({
      data: {
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        kind: 'TASK_PROOF',
        objectKey: uploaded.key,
        url: uploaded.url,
      },
    });

    await this.prisma.teamTaskProgress.upsert({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
      create: {
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      update: {
        status: TaskStatus.IN_PROGRESS,
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'task_photo_submitted',
      payload: { stationId: input.stationId },
    });

    return {
      teamId: team.id,
      stationId: input.stationId,
      url: uploaded.url,
      taskStatus: 'in-progress' as const,
    };
  }

  async submitStationQrScan(input: {
    sessionToken: string;
    stationId: string;
    code: string;
    scannedAt?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    await this.assertGameplayAllowed({
      realization,
      teamId: team.id,
    });

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    if (station.type !== 'qr-hunt') {
      throw new BadRequestException(
        'This station does not accept QR code submissions',
      );
    }

    this.assertLocationRequirementSatisfied(realization, team);

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      throw new ConflictException('Task already completed');
    }

    const normalizedCode = input.code.trim().toUpperCase();
    if (!normalizedCode || !station.qrScanCodes.includes(normalizedCode)) {
      throw new BadRequestException({
        code: 'INVALID_QR_CODE',
        message: 'This code does not belong to this station',
      });
    }

    let isDuplicateScan = false;
    try {
      await this.prisma.teamStationScan.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
          code: normalizedCode,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      // Already scanned this exact code before — idempotent no-op, not an
      // error for the player (they may have scanned the same sticker twice).
      isDuplicateScan = true;
    }

    const progress = await this.prisma.teamTaskProgress.upsert({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
      create: {
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      update: {
        status: TaskStatus.IN_PROGRESS,
      },
    });

    const scannedCount = await this.prisma.teamStationScan.count({
      where: {
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
      },
    });
    const requiredCount = station.qrScanCodes.length;

    if (scannedCount < requiredCount) {
      await this.emitEvent({
        realizationId: realization.id,
        teamId: team.id,
        actorType: EventActorType.MOBILE_DEVICE,
        actorId: assignment.deviceId,
        eventType: 'task_qr_scanned',
        payload: {
          stationId: input.stationId,
          code: normalizedCode,
          scannedCount,
          requiredCount,
        },
      });

      return {
        teamId: team.id,
        stationId: input.stationId,
        scannedCount,
        requiredCount,
        taskStatus: 'in-progress' as const,
        duplicate: isDuplicateScan,
      };
    }

    // Last required code just scanned — finalize completion, respecting the
    // same time-limit-expired failure path as completeMobileTask.
    const startedAtSource = progress.startedAt?.toISOString() || null;
    const finishedAt = parseMobileTaskTimestamp(input.scannedAt, new Date());
    const finishedAtIso = finishedAt.toISOString();
    const shouldApplyTimedPointsDecay = hasTimedPointsDecay({
      timedStationPointsDecayEnabled:
        realization.timedStationPointsDecayEnabled,
      timeLimitSeconds: station.timeLimitSeconds,
    });
    const elapsedSeconds = Math.max(
      0,
      Math.round(
        (finishedAt.getTime() -
          new Date(startedAtSource || finishedAtIso).getTime()) /
          1000,
      ),
    );

    if (
      shouldApplyTimedPointsDecay &&
      elapsedSeconds >= Math.max(0, Math.round(station.timeLimitSeconds))
    ) {
      await this.markMobileTaskFailed({
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        stationType: station.type,
        progress,
        actorId: assignment.deviceId,
        reason: 'time_limit_expired',
        startedAtSource,
        finishedAt,
        finishedAtIso,
        scoring: {
          mode: 'time-linear-expired',
          basePoints: station.points,
          timeLimitSeconds: station.timeLimitSeconds,
          elapsedSeconds,
        },
      });

      const pointsTotal = await this.recalculateTeamPoints(
        team.id,
        realization.id,
      );

      return {
        teamId: team.id,
        stationId: input.stationId,
        scannedCount,
        requiredCount,
        pointsTotal,
        pointsAwarded: 0,
        fastestBonusPoints: 0,
        taskStatus: 'failed' as const,
        duplicate: isDuplicateScan,
      };
    }

    const { awardedPoints, fastestBonusPoints, pointsTotal } =
      await this.finalizeMobileTaskCompletion({
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        station,
        actorId: assignment.deviceId,
        existingProgress: progress,
        startedAtSource,
        finishedAt,
        finishedAtIso,
        shouldApplyTimedPointsDecay,
        elapsedSeconds,
      });

    return {
      teamId: team.id,
      stationId: input.stationId,
      scannedCount,
      requiredCount,
      pointsTotal,
      pointsAwarded: awardedPoints,
      fastestBonusPoints,
      taskStatus: 'done' as const,
      duplicate: isDuplicateScan,
    };
  }

  async updateMobileTeamCustomization(input: {
    sessionToken: string;
    color?: string;
    badgeKey?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    const hasColorInput = typeof input.color !== 'undefined';
    const hasBadgeKeyInput = typeof input.badgeKey !== 'undefined';
    const requestedColor = input.color?.trim();
    const requestedBadgeKey = input.badgeKey?.trim();
    const currentColor = normalizeTeamColor(team.color);
    const currentBadgeKey = normalizeTeamBadgeKey(team.badgeKey);

    const nextColor = hasColorInput
      ? (() => {
          if (!requestedColor) {
            throw new BadRequestException('Team color is required');
          }
          return parseTeamColor(requestedColor);
        })()
      : currentColor;
    const nextBadgeKey = hasBadgeKeyInput
      ? normalizeTeamBadgeKey(requestedBadgeKey)
      : currentBadgeKey;

    const peers = await this.prisma.team.findMany({
      where: {
        realizationId: realization.id,
        id: { not: team.id },
      },
    });

    if (
      hasColorInput &&
      nextColor &&
      peers.some((item) => item.color === nextColor)
    ) {
      throw new ConflictException('Team color already taken');
    }
    if (
      hasBadgeKeyInput &&
      nextBadgeKey &&
      peers.some(
        (item) => normalizeTeamBadgeKey(item.badgeKey) === nextBadgeKey,
      )
    ) {
      throw new ConflictException('Team icon already taken');
    }

    const changedFields: string[] = [];
    if (currentColor !== nextColor) changedFields.push('color');
    if (currentBadgeKey !== nextBadgeKey) changedFields.push('badge');

    try {
      await this.prisma.team.update({
        where: { id: team.id },
        data: {
          color: nextColor,
          badgeKey: nextBadgeKey,
          status: TeamStatus.ACTIVE,
        },
      });
    } catch (error) {
      throwTeamCustomizationConflict(error);
    }

    if (changedFields.length > 0) {
      await this.emitEvent({
        realizationId: realization.id,
        teamId: team.id,
        actorType: EventActorType.MOBILE_DEVICE,
        actorId: assignment.deviceId,
        eventType: 'team_customization_updated',
        payload: { changedFields },
      });
    }

    const customizationOccupancy =
      await this.getCustomizationOccupancyByRealization(realization.id);

    return {
      teamId: team.id,
      color: nextColor,
      badgeKey: nextBadgeKey,
      changedFields,
      customizationOccupancy,
    };
  }

  async selectMobileTeam(input: { sessionToken: string; slotNumber: number }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    const slotNumber = Number(input.slotNumber);

    if (!Number.isInteger(slotNumber) || slotNumber < 1) {
      throw new BadRequestException('Invalid team slot');
    }

    const requestedTeam = await this.prisma.team.findFirst({
      where: {
        realizationId: realization.id,
        slotNumber,
      },
    });

    if (!requestedTeam) {
      throw new NotFoundException('Team not found');
    }

    let replacementCount = 0;
    if (requestedTeam.id !== team.id) {
      const activeOnRequested = await this.prisma.teamAssignment.findMany({
        where: {
          teamId: requestedTeam.id,
          expiresAt: { gt: new Date() },
          id: { not: assignment.id },
        },
        select: { id: true },
      });

      replacementCount = activeOnRequested.length;
      if (replacementCount > 0) {
        await this.prisma.teamAssignment.deleteMany({
          where: {
            id: {
              in: activeOnRequested.map((item) => item.id),
            },
          },
        });
      }

      await this.prisma.teamAssignment.update({
        where: { id: assignment.id },
        data: {
          teamId: requestedTeam.id,
          lastSeenAt: new Date(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });

      await this.prisma.team.update({
        where: { id: team.id },
        data: { status: TeamStatus.UNASSIGNED },
      });

      await this.prisma.team.update({
        where: { id: requestedTeam.id },
        data: { status: TeamStatus.ACTIVE },
      });
    }

    const customizationOccupancy =
      await this.getCustomizationOccupancyByRealization(realization.id);

    return {
      team: {
        id: requestedTeam.id,
        slotNumber: requestedTeam.slotNumber,
        name: requestedTeam.name,
        color: requestedTeam.color,
        badgeKey: normalizeTeamBadgeKey(requestedTeam.badgeKey),
        badgeImageUrl: requestedTeam.badgeImageUrl,
        points: requestedTeam.points,
      },
      customizationOccupancy,
      reassignment: {
        replacedExistingAssignment: replacementCount > 0,
        replacedAssignments: replacementCount,
        message:
          replacementCount > 0
            ? 'Team was already selected on another device. Assignment was switched to this device.'
            : 'Team selected successfully.',
      },
    };
  }

  async randomizeMobileTeam(input: { sessionToken: string }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    const peers = await this.prisma.team.findMany({
      where: {
        realizationId: realization.id,
        id: { not: team.id },
      },
    });

    const usedNames = new Set(
      peers.map((item) => toLowerSafe(item.name)).filter(Boolean),
    );
    const availableNames = FUNNY_TEAM_NAMES.filter(
      (name) => !usedNames.has(name.toLowerCase()),
    );

    if (availableNames.length === 0) {
      throw new ConflictException('No unique random names left');
    }

    const randomName =
      availableNames[Math.floor(Math.random() * availableNames.length)];
    const usedBadgeKeys = new Set(
      peers.map((item) => toLowerSafe(item.badgeKey)).filter(Boolean),
    );
    const availableBadgeKeys = BADGE_KEYS.filter(
      (badgeKey) => !usedBadgeKeys.has(badgeKey.toLowerCase()),
    );
    const randomBadgeKey =
      availableBadgeKeys[Math.floor(Math.random() * availableBadgeKeys.length)];

    if (!randomName || !randomBadgeKey) {
      throw new ConflictException('Randomization failed');
    }

    const usedColors = new Set(peers.map((item) => item.color).filter(Boolean));
    const availableColors = TEAM_COLORS.filter(
      (color) => !usedColors.has(color),
    );
    const color =
      normalizeTeamColor(team.color) ||
      availableColors[0] ||
      TEAM_COLORS[(Math.max(1, team.slotNumber) - 1) % TEAM_COLORS.length];

    try {
      await this.prisma.team.update({
        where: { id: team.id },
        data: {
          name: randomName,
          color,
          badgeKey: randomBadgeKey,
          status: TeamStatus.ACTIVE,
        },
      });
    } catch (error) {
      throwTeamCustomizationConflict(error);
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_name_randomized',
      payload: {
        randomizedName: randomName,
        badgeKey: randomBadgeKey,
      },
    });

    return {
      teamId: team.id,
      name: randomName,
      color,
      badgeKey: randomBadgeKey,
    };
  }

  async updateMobileTeamLocation(input: {
    sessionToken: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    at?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );

    if (!isLatitude(input.lat) || !isLongitude(input.lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const accuracy = parseOptionalNumberInRange({
      value: input.accuracy,
      min: 0,
      max: LOCATION_MAX_ACCURACY_METERS,
      field: 'accuracy',
    });
    const speed = parseOptionalNumberInRange({
      value: input.speed,
      min: 0,
      max: LOCATION_MAX_SPEED_MPS,
      field: 'speed',
    });
    const heading = parseOptionalNumberInRange({
      value: input.heading,
      min: 0,
      max: 360,
      field: 'heading',
    });

    const locationAt = parseIsoOrNow(input.at);

    if (!locationAt) {
      throw new BadRequestException('Invalid payload');
    }

    const serverReceivedAt = new Date().toISOString();
    const deduplicated = shouldSkipLocationUpdate(team, {
      lat: input.lat,
      lng: input.lng,
      at: locationAt,
    });

    if (deduplicated) {
      return {
        ok: true,
        deduplicated: true,
        lastLocationAt: team.lastLocationAt?.toISOString() || locationAt,
        serverReceivedAt,
      };
    }

    await this.prisma.team.update({
      where: { id: team.id },
      data: {
        lastLocationLat: input.lat,
        lastLocationLng: input.lng,
        lastLocationAccuracy: accuracy ?? null,
        lastLocationAt: new Date(locationAt),
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'team_location_updated',
      payload: {
        lat: input.lat,
        lng: input.lng,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        heading: heading ?? null,
        at: locationAt,
        serverReceivedAt,
      },
    });

    return {
      ok: true,
      deduplicated: false,
      lastLocationAt: locationAt,
      serverReceivedAt,
    };
  }

  async startMobileTask(input: {
    sessionToken: string;
    stationId: string;
    startedAt?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    await this.assertGameplayAllowed({
      realization,
      teamId: team.id,
    });

    if (!input.stationId?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    this.assertLocationRequirementSatisfied(realization, team);

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    if (station.type === 'photo-task') {
      throw new BadRequestException(
        'This station only accepts photo submissions',
      );
    }

    const startedAt = parseMobileTaskTimestamp(input.startedAt, new Date());

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      throw new ConflictException('Task already completed');
    }

    if (!station.allowConcurrentTeams) {
      const activeOtherTeamProgress =
        await this.prisma.teamTaskProgress.findFirst({
          where: {
            realizationId: realization.id,
            stationId: input.stationId,
            status: TaskStatus.IN_PROGRESS,
            teamId: { not: team.id },
          },
          select: { id: true },
        });

      if (activeOtherTeamProgress) {
        throw new ConflictException({
          code: 'STATION_IN_USE',
          message:
            'Inna drużyna wykonuje zadania na tym stanowisku, kiedy skończą uruchom to stanowisko',
        });
      }
    }

    const startedAtIso =
      existingProgress?.startedAt?.toISOString() || startedAt.toISOString();

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.IN_PROGRESS,
          startedAt: existingProgress.startedAt || startedAt,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
          status: TaskStatus.IN_PROGRESS,
          startedAt,
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'task_started',
      payload: {
        stationId: input.stationId,
        stationType: station.type,
        startedAt: startedAtIso,
      },
    });

    return {
      teamId: team.id,
      stationId: input.stationId,
      taskStatus: 'in-progress' as const,
      startedAt: startedAtIso,
    };
  }

  async completeMobileTask(input: {
    sessionToken: string;
    stationId: string;
    completionCode?: string;
    startedAt?: string;
    finishedAt?: string;
    challengeDifficulty?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    await this.assertGameplayAllowed({
      realization,
      teamId: team.id,
    });

    if (!input.stationId?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    this.assertLocationRequirementSatisfied(realization, team);

    const finishedAt = parseMobileTaskTimestamp(input.finishedAt, new Date());
    const finishedAtIso = finishedAt.toISOString();

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    if (station.type === 'qr-hunt') {
      throw new BadRequestException(
        'This station only accepts QR code submissions',
      );
    }

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      throw new ConflictException('Task already completed');
    }

    const requiresCompletionCode = isCodeProtectedStationType(station.type);
    if (requiresCompletionCode) {
      const expectedCode = parseCompletionCode(station.completionCode);
      const inputCode = parseCompletionCode(input.completionCode);
      if (!expectedCode || !inputCode || expectedCode !== inputCode) {
        throw new BadRequestException('Invalid completion code');
      }
    }

    const startedAtSource = existingProgress?.startedAt?.toISOString() || null;

    const shouldApplyTimedPointsDecay = hasTimedPointsDecay({
      timedStationPointsDecayEnabled:
        realization.timedStationPointsDecayEnabled,
      timeLimitSeconds: station.timeLimitSeconds,
    });
    const requiresStartedAt =
      isTimedStartRequiredStationType(station.type) ||
      shouldApplyTimedPointsDecay;

    if (requiresStartedAt && !startedAtSource) {
      throw new BadRequestException('Task timer not started');
    }

    const elapsedSeconds = Math.max(
      0,
      Math.round(
        (finishedAt.getTime() -
          new Date(startedAtSource || finishedAtIso).getTime()) /
          1000,
      ),
    );

    if (
      shouldApplyTimedPointsDecay &&
      elapsedSeconds >= Math.max(0, Math.round(station.timeLimitSeconds))
    ) {
      await this.markMobileTaskFailed({
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        stationType: station.type,
        progress: existingProgress,
        actorId: assignment.deviceId,
        reason: 'time_limit_expired',
        startedAtSource,
        finishedAt,
        finishedAtIso,
        scoring: {
          mode: 'time-linear-expired',
          basePoints: station.points,
          timeLimitSeconds: station.timeLimitSeconds,
          elapsedSeconds,
        },
      });

      const pointsTotal = await this.recalculateTeamPoints(
        team.id,
        realization.id,
      );

      return {
        teamId: team.id,
        stationId: input.stationId,
        pointsTotal,
        pointsAwarded: 0,
        fastestBonusPoints: 0,
        taskStatus: 'failed' as const,
      };
    }

    const { awardedPoints, fastestBonusPoints, pointsTotal } =
      await this.finalizeMobileTaskCompletion({
        realizationId: realization.id,
        teamId: team.id,
        stationId: input.stationId,
        station,
        actorId: assignment.deviceId,
        existingProgress,
        startedAtSource,
        finishedAt,
        finishedAtIso,
        shouldApplyTimedPointsDecay,
        elapsedSeconds,
        challengeDifficulty: input.challengeDifficulty,
      });

    return {
      teamId: team.id,
      stationId: input.stationId,
      pointsTotal,
      pointsAwarded: awardedPoints,
      fastestBonusPoints,
      taskStatus: 'done' as const,
    };
  }

  // Shared completion/scoring logic for every way a task can reach "all
  // requirements met right now": the typed-completion-code flow in
  // completeMobileTask, and (once every required code is scanned) the
  // QR-hunt flow in submitStationQrScan. Callers are responsible for their
  // own pre-conditions (already-done check, completion-code validation,
  // the time-limit-expired failure branch) since those differ per entry path.
  private async finalizeMobileTaskCompletion(input: {
    realizationId: string;
    teamId: string;
    stationId: string;
    station: StationEntity;
    actorId: string;
    existingProgress: { id: string; startedAt: Date | null } | null;
    startedAtSource: string | null;
    finishedAt: Date;
    finishedAtIso: string;
    shouldApplyTimedPointsDecay: boolean;
    elapsedSeconds: number;
    challengeDifficulty?: string;
  }) {
    const {
      realizationId,
      teamId,
      stationId,
      station,
      actorId,
      existingProgress,
      startedAtSource,
      finishedAt,
      finishedAtIso,
      shouldApplyTimedPointsDecay,
      elapsedSeconds,
      challengeDifficulty,
    } = input;

    // Fastest-completion bonus: only for no-time-limit stations with the stopwatch
    // display explicitly enabled by the admin. The eligibility check below is not
    // wrapped in a transaction (same accepted race window as the STATION_IN_USE
    // check in startMobileTask) — disproportionate to add locking for a small-scale
    // live-hosted team game.
    const isBonusEligibleStation =
      station.completionStopwatchEnabled === true &&
      station.timeLimitSeconds <= 0 &&
      station.fastestCompletionBonusPoints > 0;

    let fastestBonusPoints = 0;
    if (isBonusEligibleStation) {
      const otherTeamAlreadyDone = await this.prisma.teamTaskProgress.findFirst(
        {
          where: {
            realizationId,
            stationId,
            status: TaskStatus.DONE,
            teamId: { not: teamId },
          },
          select: { id: true },
        },
      );

      if (!otherTeamAlreadyDone) {
        fastestBonusPoints = station.fastestCompletionBonusPoints;
      }
    }

    const difficultyMultiplier =
      station.type === 'strong-password' ||
      station.type === 'mastermind' ||
      station.type === 'mini-sudoku'
        ? challengeDifficulty === 'easy'
          ? 0.5
          : challengeDifficulty === 'hard'
            ? 1.5
            : 1
        : 1;
    const baseAwardedPoints =
      shouldApplyTimedPointsDecay ||
      isTimedStartRequiredStationType(station.type)
        ? this.computeLinearTimePoints({
            basePoints: station.points,
            timeLimitSeconds: station.timeLimitSeconds,
            startedAtIso: startedAtSource || finishedAtIso,
            finishedAtIso,
          })
        : Math.max(0, Math.round(station.points));
    const awardedPoints =
      Math.max(0, Math.round(baseAwardedPoints * difficultyMultiplier)) +
      fastestBonusPoints;

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.DONE,
          pointsAwarded: awardedPoints,
          startedAt: existingProgress.startedAt
            ? existingProgress.startedAt
            : startedAtSource
              ? new Date(startedAtSource)
              : null,
          finishedAt,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId,
          teamId,
          stationId,
          status: TaskStatus.DONE,
          pointsAwarded: awardedPoints,
          startedAt: startedAtSource ? new Date(startedAtSource) : null,
          finishedAt,
        },
      });
    }

    const scoringMeta =
      shouldApplyTimedPointsDecay ||
      isTimedStartRequiredStationType(station.type)
        ? {
            mode: 'time-linear',
            basePoints: station.points,
            timeLimitSeconds: station.timeLimitSeconds,
            elapsedSeconds,
            difficulty: challengeDifficulty,
            difficultyMultiplier,
            fastestBonusPoints,
          }
        : {
            mode: 'fixed',
            basePoints: station.points,
            difficulty: challengeDifficulty,
            difficultyMultiplier,
            fastestBonusPoints,
          };

    await this.emitEvent({
      realizationId,
      teamId,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId,
      eventType: 'task_completed',
      payload: {
        stationId,
        stationType: station.type,
        pointsAwarded: awardedPoints,
        startedAt: startedAtSource,
        finishedAt: finishedAtIso,
        scoring: scoringMeta,
      },
    });

    const pointsTotal = await this.recalculateTeamPoints(teamId, realizationId);

    return { awardedPoints, fastestBonusPoints, pointsTotal };
  }

  async failMobileTask(input: {
    sessionToken: string;
    stationId: string;
    reason?: string;
    startedAt?: string;
    finishedAt?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    await this.assertGameplayAllowed({
      realization,
      teamId: team.id,
    });

    if (!input.stationId?.trim()) {
      throw new BadRequestException('Invalid payload');
    }

    if (!realization.stationIds.includes(input.stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    this.assertLocationRequirementSatisfied(realization, team);

    const finishedAt = new Date();
    const finishedAtIso = finishedAt.toISOString();

    const station = await this.stationService.findStationById(input.stationId);
    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    const existingProgress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
        },
      },
    });

    if (existingProgress?.status === TaskStatus.DONE) {
      const failedStationIds = await this.getFailedTaskStationIds({
        realizationId: realization.id,
        teamId: team.id,
      });
      if (failedStationIds.has(input.stationId)) {
        return {
          teamId: team.id,
          stationId: input.stationId,
          pointsTotal: team.points,
          pointsAwarded: 0,
          taskStatus: 'failed' as const,
        };
      }
      throw new ConflictException('Task already completed');
    }

    const startedAtSource = existingProgress?.startedAt?.toISOString() || null;
    const failureReason = this.resolveTaskFailureReason(input.reason);

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.DONE,
          pointsAwarded: 0,
          startedAt: existingProgress.startedAt
            ? existingProgress.startedAt
            : startedAtSource
              ? new Date(startedAtSource)
              : null,
          finishedAt,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: input.stationId,
          status: TaskStatus.DONE,
          pointsAwarded: 0,
          startedAt: startedAtSource ? new Date(startedAtSource) : null,
          finishedAt,
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'task_failed',
      payload: {
        stationId: input.stationId,
        stationType: station.type,
        reason: failureReason.code,
        reasonLabel: failureReason.label,
        reasonRaw: failureReason.raw,
        startedAt: startedAtSource,
        finishedAt: finishedAtIso,
      },
    });

    const pointsTotal = await this.recalculateTeamPoints(
      team.id,
      realization.id,
    );

    return {
      teamId: team.id,
      stationId: input.stationId,
      pointsTotal,
      pointsAwarded: 0,
      taskStatus: 'failed' as const,
    };
  }

  private async markMobileTaskFailed(input: {
    realizationId: string;
    teamId: string;
    stationId: string;
    stationType: string;
    progress?: { id: string; startedAt?: Date | null } | null;
    actorId: string;
    reason?: string;
    startedAtSource: string | null;
    finishedAt: Date;
    finishedAtIso: string;
    scoring?: Record<string, unknown>;
  }) {
    const failureReason = this.resolveTaskFailureReason(input.reason);

    if (input.progress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: input.progress.id },
        data: {
          status: TaskStatus.DONE,
          pointsAwarded: 0,
          startedAt: input.progress.startedAt
            ? input.progress.startedAt
            : input.startedAtSource
              ? new Date(input.startedAtSource)
              : null,
          finishedAt: input.finishedAt,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: input.realizationId,
          teamId: input.teamId,
          stationId: input.stationId,
          status: TaskStatus.DONE,
          pointsAwarded: 0,
          startedAt: input.startedAtSource
            ? new Date(input.startedAtSource)
            : null,
          finishedAt: input.finishedAt,
        },
      });
    }

    await this.emitEvent({
      realizationId: input.realizationId,
      teamId: input.teamId,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: input.actorId,
      eventType: 'task_failed',
      payload: {
        stationId: input.stationId,
        stationType: input.stationType,
        reason: failureReason.code,
        reasonLabel: failureReason.label,
        reasonRaw: failureReason.raw,
        startedAt: input.startedAtSource,
        finishedAt: input.finishedAtIso,
        ...(input.scoring ? { scoring: input.scoring } : {}),
      },
    });
  }

  async getMobileAdminStationQrs(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const stationById = new Map(
      realization.scenarioStations.map((station) => [station.id, station]),
    );

    return {
      realizationId: realization.id,
      entries: realization.stationIds.map((stationId) => {
        const station = stationById.get(stationId);
        const qrEntryCode = station?.qrEntryCode ?? null;

        return {
          stationId,
          stationName: station?.name || `Station ${stationId}`,
          stationType: station?.type || 'quiz',
          completionCode: station?.completionCode?.trim() || null,
          qrEntryCode,
          entryUrl: qrEntryCode ? buildStationQrEntryUrl(qrEntryCode) : null,
          qrScanCodes:
            station?.type === 'qr-hunt' && Array.isArray(station.qrScanCodes)
              ? station.qrScanCodes.filter(
                  (code) => typeof code === 'string' && code.trim().length > 0,
                )
              : [],
        };
      }),
    };
  }

  async listMobileAdminPointsQrCodes(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);

    const codes = await this.prisma.pointsQrCode.findMany({
      where: { realizationId: realization.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { claims: true } } },
    });

    return {
      realizationId: realization.id,
      entries: codes.map((code) => ({
        id: code.id,
        code: code.code,
        points: code.points,
        label: code.label,
        claimMode: code.claimMode,
        claimCount: code._count.claims,
        createdAt: code.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Distinct points-QR codes used across ALL realizations, for the admin UI's
   * "reuse an already-printed sticker" suggestions — mirrors how station
   * qrEntryCode suggestions are pulled from every template station.
   */
  async listMobileAdminPointsQrCodeSuggestions() {
    const codes = await this.prisma.pointsQrCode.findMany({
      distinct: ['code'],
      orderBy: { createdAt: 'desc' },
      select: { code: true, label: true, points: true },
      take: 200,
    });

    return { entries: codes };
  }

  async createMobileAdminPointsQrCode(
    realizationId: string,
    input: {
      points: number;
      label?: string;
      claimMode?: PointsQrClaimMode;
      code?: string;
    },
  ) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);

    if (!Number.isFinite(input.points) || input.points <= 0) {
      throw new BadRequestException('Points must be a positive number');
    }

    const claimMode =
      input.claimMode === PointsQrClaimMode.FIRST_TEAM
        ? PointsQrClaimMode.FIRST_TEAM
        : PointsQrClaimMode.PER_TEAM;
    const label = input.label?.trim() || null;
    const preferredCode = input.code?.trim().toUpperCase() || undefined;

    const candidateCodes = [
      ...(preferredCode ? [preferredCode] : []),
      ...Array.from({ length: 5 }, () => generateRandomCode(8)),
    ];

    for (const code of candidateCodes) {
      try {
        const created = await this.prisma.pointsQrCode.create({
          data: {
            realizationId: realization.id,
            code,
            points: Math.round(input.points),
            label,
            claimMode,
          },
        });

        return {
          id: created.id,
          code: created.code,
          points: created.points,
          label: created.label,
          claimMode: created.claimMode,
          claimCount: 0,
          createdAt: created.createdAt.toISOString(),
        };
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new Error('Failed to generate a unique points QR code');
  }

  async deleteMobileAdminPointsQrCode(
    realizationId: string,
    pointsQrCodeId: string,
  ) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);

    const deleted = await this.prisma.pointsQrCode.deleteMany({
      where: { id: pointsQrCodeId, realizationId: realization.id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Points QR code not found');
    }

    return { ok: true };
  }

  async resolveMobileStationQr(input: {
    sessionToken: string;
    token: string;
    selectedLanguage?: string;
  }) {
    const { assignment, team, realization } = await this.requireSession(
      input.sessionToken,
    );
    const languageContext = resolveRealizationLanguageContext({
      language: realization.language,
      customLanguage: realization.customLanguage,
      selectedLanguage: input.selectedLanguage,
    });
    await this.assertGameplayAllowed({
      realization,
      teamId: team.id,
    });
    const normalizedCode = input.token?.trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException('Invalid payload');
    }

    this.assertLocationRequirementSatisfied(realization, team);

    const station =
      await this.stationService.findStationByRealizationAndQrEntryCode(
        realization.id,
        normalizedCode,
      );
    if (!station) {
      const pointsQrResult = await this.claimPointsQrCode({
        realization,
        team,
        assignment,
        code: normalizedCode,
      });
      if (pointsQrResult) {
        return pointsQrResult;
      }

      await this.emitEvent({
        realizationId: realization.id,
        teamId: team.id,
        actorType: EventActorType.MOBILE_DEVICE,
        actorId: assignment.deviceId,
        eventType: 'station_qr_rejected',
        payload: { reason: 'code_not_found' },
      });
      throw new NotFoundException('Station not found');
    }

    const progress = await this.prisma.teamTaskProgress.findUnique({
      where: {
        realizationId_teamId_stationId: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: station.id,
        },
      },
    });
    const failedStationIds = await this.getFailedTaskStationIds({
      realizationId: realization.id,
      teamId: team.id,
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: assignment.deviceId,
      eventType: 'station_qr_resolved',
      payload: {
        stationId: station.id,
        stationType: station.type,
      },
    });

    return {
      kind: 'station' as const,
      realizationId: realization.id,
      station: this.toMobileStationPayload(station, languageContext),
      task: {
        stationId: station.id,
        status:
          this.resolveEffectiveTaskStatus(
            progress?.status,
            failedStationIds.has(station.id),
            progress?.startedAt,
            station.timeLimitSeconds,
          ) || 'todo',
        pointsAwarded: progress?.pointsAwarded || 0,
        startedAt: progress?.startedAt?.toISOString() || null,
        finishedAt: progress?.finishedAt?.toISOString() || null,
      },
    };
  }

  /**
   * Scanned codes that don't match any station's qrEntryCode fall back to a
   * lookup against standalone "points bonus" QR codes — independent of the
   * Station/TeamTaskProgress system, so they never show up on a team's task
   * list and never count toward "all tasks completed". Returns null when the
   * code doesn't match a points QR code either, so the caller can fall
   * through to its normal "station not found" handling.
   */
  private async claimPointsQrCode(input: {
    realization: { id: string };
    team: { id: string; points: number };
    assignment: { deviceId: string };
    code: string;
  }) {
    const pointsQrCode = await this.prisma.pointsQrCode.findUnique({
      where: {
        realizationId_code: {
          realizationId: input.realization.id,
          code: input.code,
        },
      },
    });

    if (!pointsQrCode) {
      return null;
    }

    const existingClaim = await this.prisma.pointsQrCodeClaim.findUnique({
      where: {
        pointsQrCodeId_teamId: {
          pointsQrCodeId: pointsQrCode.id,
          teamId: input.team.id,
        },
      },
    });

    if (existingClaim) {
      return {
        kind: 'points' as const,
        realizationId: input.realization.id,
        pointsAwarded: 0,
        teamPoints: input.team.points,
        alreadyClaimed: true,
      };
    }

    if (pointsQrCode.claimMode === PointsQrClaimMode.FIRST_TEAM) {
      const anyClaim = await this.prisma.pointsQrCodeClaim.findFirst({
        where: { pointsQrCodeId: pointsQrCode.id },
      });
      if (anyClaim) {
        await this.emitEvent({
          realizationId: input.realization.id,
          teamId: input.team.id,
          actorType: EventActorType.MOBILE_DEVICE,
          actorId: input.assignment.deviceId,
          eventType: 'points_qr_rejected',
          payload: {
            pointsQrCodeId: pointsQrCode.id,
            reason: 'already_claimed_by_other_team',
          },
        });
        return {
          kind: 'points' as const,
          realizationId: input.realization.id,
          pointsAwarded: 0,
          teamPoints: input.team.points,
          alreadyClaimedByOtherTeam: true,
        };
      }
    }

    await this.prisma.pointsQrCodeClaim.create({
      data: {
        pointsQrCodeId: pointsQrCode.id,
        teamId: input.team.id,
        realizationId: input.realization.id,
      },
    });

    const teamPoints = await this.recalculateTeamPoints(
      input.team.id,
      input.realization.id,
    );

    await this.emitEvent({
      realizationId: input.realization.id,
      teamId: input.team.id,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: input.assignment.deviceId,
      eventType: 'points_qr_claimed',
      payload: {
        pointsQrCodeId: pointsQrCode.id,
        pointsAwarded: pointsQrCode.points,
      },
    });

    return {
      kind: 'points' as const,
      realizationId: input.realization.id,
      pointsAwarded: pointsQrCode.points,
      teamPoints,
    };
  }

  async getMobileAdminRealizationOverview(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const normalizedRealizationStatus = this.normalizeStatus(
      realization.status,
      realization.scheduledAt,
      realization.durationMinutes,
    );

    const teams = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
    });

    const assignments = await this.prisma.teamAssignment.findMany({
      where: {
        realizationId: realization.id,
      },
    });

    const taskProgresses = await this.prisma.teamTaskProgress.findMany({
      where: {
        realizationId: realization.id,
      },
    });

    const logs = await this.prisma.eventLog.findMany({
      where: {
        realizationId: realization.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    const latestTaskOutcomeByTeam = new Map<
      string,
      Map<string, 'failed' | 'done' | 'reset'>
    >();
    for (const log of logs) {
      if (
        log.eventType === 'completed_tasks_reset' ||
        log.eventType === 'realization_reset'
      ) {
        break;
      }

      if (
        !log.teamId ||
        (log.eventType !== 'task_failed' &&
          log.eventType !== 'task_completed' &&
          log.eventType !== 'task_reset_by_admin')
      ) {
        continue;
      }

      const stationId = this.parseStationIdFromEventPayload(log.payload);
      if (!stationId) {
        continue;
      }

      const teamOutcome =
        latestTaskOutcomeByTeam.get(log.teamId) ||
        new Map<string, 'failed' | 'done' | 'reset'>();
      if (!latestTaskOutcomeByTeam.has(log.teamId)) {
        latestTaskOutcomeByTeam.set(log.teamId, teamOutcome);
      }

      if (!teamOutcome.has(stationId)) {
        teamOutcome.set(
          stationId,
          log.eventType === 'task_failed'
            ? 'failed'
            : log.eventType === 'task_completed'
              ? 'done'
              : 'reset',
        );
      }
    }

    const timeLimitSecondsByStationId =
      await this.getTimeLimitSecondsByStationId(realization.stationIds);

    const teamViews = teams.map((team) => {
      const teamAssignments = assignments.filter(
        (assignment) =>
          assignment.teamId === team.id &&
          !this.isExpired(assignment.expiresAt.toISOString()),
      );
      const orderedStationIds = this.resolveTeamStationOrder(
        realization.stationIds,
        team.slotNumber,
        realization.teamStationNumberingEnabled,
      );
      const tasks = orderedStationIds.map(({ stationId, stationNumber }) => {
        const progress = taskProgresses.find(
          (item) => item.stationId === stationId && item.teamId === team.id,
        );
        const isFailed =
          latestTaskOutcomeByTeam.get(team.id)?.get(stationId) === 'failed';

        return {
          stationId,
          stationNumber,
          status:
            this.resolveEffectiveTaskStatus(
              progress?.status,
              isFailed,
              progress?.startedAt,
              timeLimitSecondsByStationId.get(stationId),
            ) || 'todo',
          pointsAwarded: progress?.pointsAwarded || 0,
          startedAt: progress?.startedAt?.toISOString() || null,
          finishedAt: progress?.finishedAt?.toISOString() || null,
        };
      });
      const doneTasksCount = tasks.filter(
        (task) => task.status === 'done' || task.status === 'failed',
      ).length;

      return {
        id: team.id,
        slotNumber: team.slotNumber,
        name: team.name,
        color: team.color,
        badgeKey: team.badgeKey,
        badgeImageUrl: team.badgeImageUrl,
        points: team.points,
        status: this.resolveTeamAdminStatus(
          team.status,
          normalizedRealizationStatus,
          teamAssignments.length,
        ),
        taskStats: {
          total: tasks.length,
          done: doneTasksCount,
        },
        lastLocation: this.toLastLocation(team),
        deviceCount: teamAssignments.length,
        devices: teamAssignments.map((assignment) => ({
          deviceId: assignment.deviceId,
          memberName: assignment.memberName,
          lastSeenAt: assignment.lastSeenAt.toISOString(),
          expiresAt: assignment.expiresAt.toISOString(),
        })),
        tasks,
        updatedAt: team.updatedAt.toISOString(),
      };
    });

    return {
      realization: {
        id: realization.id,
        companyName: realization.companyName,
        introText: realization.introText,
        gameRules: realization.gameRules,
        location: realization.location,
        status: normalizedRealizationStatus,
        scheduledAt: realization.scheduledAt,
        durationMinutes: realization.durationMinutes,
        locationRequired: realization.locationRequired,
        showLeaderboard: realization.showLeaderboard,
        showLeaderboardDuringGame: realization.showLeaderboardDuringGame,
        showLeaderboardOnFinish: realization.showLeaderboardOnFinish,
        hideLeaderboardMinutesBeforeEnd:
          realization.hideLeaderboardMinutesBeforeEnd,
        teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
        hideTaskList: realization.hideTaskList,
        joinCode: realization.joinCode,
        teamCount: realization.teamCount,
        stationIds: realization.stationIds,
        stations: await Promise.all(
          realization.stationIds.map((stationId) =>
            this.getStationSummaryForAdmin(stationId),
          ),
        ),
        updatedAt: realization.updatedAt,
      },
      teams: teamViews,
      logs: logs.map((log) => {
        const teamForLog = log.teamId
          ? teamViews.find((team) => team.id === log.teamId)
          : null;

        return {
          id: log.id,
          realizationId: log.realizationId,
          teamId: log.teamId,
          teamSlot: teamForLog?.slotNumber ?? null,
          teamName: teamForLog?.name ?? null,
          actorType: this.fromActorType(log.actorType),
          actorId: log.actorId,
          eventType: log.eventType,
          payload: log.payload as Record<string, unknown>,
          createdAt: log.createdAt.toISOString(),
        };
      }),
      stats: {
        activeTeams: teamViews.filter((team) => team.status === 'active')
          .length,
        completedTasks: teamViews.reduce(
          (sum, team) =>
            sum +
            team.tasks.filter(
              (task) => task.status === 'done' || task.status === 'failed',
            ).length,
          0,
        ),
        pointsTotal: teamViews.reduce((sum, team) => sum + team.points, 0),
        eventCount: logs.length,
      },
    };
  }

  async resetMobileAdminCompletedTasks(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);

    const resettableTasks = await this.prisma.teamTaskProgress.findMany({
      where: {
        realizationId: realization.id,
        status: {
          in: [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
        },
      },
      select: {
        id: true,
        teamId: true,
        stationId: true,
      },
    });

    if (resettableTasks.length === 0) {
      return {
        realizationId: realization.id,
        resetCount: 0,
        affectedTeams: 0,
      };
    }

    const affectedTeamIds = Array.from(
      new Set(resettableTasks.map((item) => item.teamId)),
    );

    await this.prisma.teamTaskProgress.updateMany({
      where: {
        realizationId: realization.id,
        status: {
          in: [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
        },
      },
      data: {
        status: TaskStatus.TODO,
        pointsAwarded: 0,
        startedAt: null,
        finishedAt: null,
      },
    });

    // Same reasoning as resetMobileAdminTeamTask: qr-hunt progress is derived
    // from this scan log, not from TeamTaskProgress, so it has to be cleared
    // separately or a bulk reset leaves stale scan counts behind.
    await this.prisma.teamStationScan.deleteMany({
      where: {
        realizationId: realization.id,
        OR: resettableTasks.map((task) => ({
          teamId: task.teamId,
          stationId: task.stationId,
        })),
      },
    });

    for (const teamId of affectedTeamIds) {
      await this.recalculateTeamPoints(teamId, realization.id);
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: null,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'completed_tasks_reset',
      payload: {
        resetCount: resettableTasks.length,
        affectedTeams: affectedTeamIds.length,
      },
    });

    return {
      realizationId: realization.id,
      resetCount: resettableTasks.length,
      affectedTeams: affectedTeamIds.length,
    };
  }

  async resetMobileAdminTeamTask(input: {
    realizationId: string;
    teamId: string;
    stationId: string;
  }) {
    const { realization, team, station, existingProgress, stationId } =
      await this.resolveMobileAdminTeamTaskContext(input);
    const resetAt = new Date();
    const failedStationIds = await this.getFailedTaskStationIds({
      realizationId: realization.id,
      teamId: team.id,
    });
    const previousStatus =
      this.fromTaskStatus(
        existingProgress?.status,
        failedStationIds.has(stationId),
      ) || 'todo';

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.TODO,
          pointsAwarded: 0,
          startedAt: null,
          finishedAt: null,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId,
          status: TaskStatus.TODO,
          pointsAwarded: 0,
          startedAt: null,
          finishedAt: null,
        },
      });
    }

    // qr-hunt progress (qrScanCompletedCount) is derived by counting rows here,
    // not stored on TeamTaskProgress — without this, a reset task kept showing
    // its old scan count (e.g. 2/4) because the scan log itself was untouched.
    await this.prisma.teamStationScan.deleteMany({
      where: { realizationId: realization.id, teamId: team.id, stationId },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'task_reset_by_admin',
      payload: {
        stationId,
        stationType: station.type,
        previousStatus,
        previousPointsAwarded: existingProgress?.pointsAwarded || 0,
        resetAt: resetAt.toISOString(),
      },
    });

    const pointsTotal = await this.recalculateTeamPoints(
      team.id,
      realization.id,
    );

    return {
      realizationId: realization.id,
      teamId: team.id,
      stationId,
      pointsTotal,
      pointsAwarded: 0,
      taskStatus: 'todo' as const,
      updatedAt: resetAt.toISOString(),
    };
  }

  async completeMobileAdminTeamTask(input: {
    realizationId: string;
    teamId: string;
    stationId: string;
  }) {
    const { realization, team, station, existingProgress, stationId } =
      await this.resolveMobileAdminTeamTaskContext(input);
    const finishedAt = new Date();
    const startedAt = existingProgress?.startedAt || finishedAt;
    const isTimedDecayTask = hasTimedPointsDecay({
      timedStationPointsDecayEnabled:
        realization.timedStationPointsDecayEnabled,
      timeLimitSeconds: station.timeLimitSeconds,
    });
    const awardedPoints = isTimedDecayTask
      ? Math.max(0, Math.round(station.points / 2))
      : Math.max(0, Math.round(station.points));

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.DONE,
          pointsAwarded: awardedPoints,
          startedAt,
          finishedAt,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId,
          status: TaskStatus.DONE,
          pointsAwarded: awardedPoints,
          startedAt,
          finishedAt,
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'task_completed',
      payload: {
        stationId,
        stationType: station.type,
        pointsAwarded: awardedPoints,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        scoring: {
          mode: isTimedDecayTask ? 'admin-half-time-limited' : 'admin-fixed',
          basePoints: station.points,
          awardedPoints,
          timeLimitSeconds: station.timeLimitSeconds,
        },
      },
    });

    const pointsTotal = await this.recalculateTeamPoints(
      team.id,
      realization.id,
    );

    return {
      realizationId: realization.id,
      teamId: team.id,
      stationId,
      pointsTotal,
      pointsAwarded: awardedPoints,
      taskStatus: 'done' as const,
      updatedAt: finishedAt.toISOString(),
    };
  }

  async failMobileAdminTeamTask(input: {
    realizationId: string;
    teamId: string;
    stationId: string;
    reason?: string;
  }) {
    const { realization, team, station, existingProgress, stationId } =
      await this.resolveMobileAdminTeamTaskContext(input);
    const finishedAt = new Date();
    const startedAt = existingProgress?.startedAt || null;
    const failureReason = this.resolveTaskFailureReason(input.reason);

    if (existingProgress) {
      await this.prisma.teamTaskProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: TaskStatus.DONE,
          pointsAwarded: 0,
          startedAt,
          finishedAt,
        },
      });
    } else {
      await this.prisma.teamTaskProgress.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId,
          status: TaskStatus.DONE,
          pointsAwarded: 0,
          startedAt: null,
          finishedAt,
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: team.id,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'task_failed',
      payload: {
        stationId,
        stationType: station.type,
        reason: failureReason.code,
        reasonLabel: failureReason.label,
        reasonRaw: failureReason.raw,
        startedAt: startedAt ? startedAt.toISOString() : null,
        finishedAt: finishedAt.toISOString(),
      },
    });

    const pointsTotal = await this.recalculateTeamPoints(
      team.id,
      realization.id,
    );

    return {
      realizationId: realization.id,
      teamId: team.id,
      stationId,
      pointsTotal,
      pointsAwarded: 0,
      taskStatus: 'failed' as const,
      updatedAt: finishedAt.toISOString(),
    };
  }

  async startMobileAdminRealization(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const startedAt = new Date();
    const normalizedStatus = this.normalizeStatus(
      realization.status,
      realization.scheduledAt,
      realization.durationMinutes,
    );

    if (normalizedStatus === 'done') {
      throw new ConflictException(
        'Realization is already completed and cannot be started again',
      );
    }

    if (normalizedStatus !== 'in-progress') {
      await this.prisma.realization.update({
        where: { id: realization.id },
        data: {
          status: PrismaRealizationStatus.IN_PROGRESS,
          scheduledAt: startedAt,
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: null,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'realization_started',
      payload: {
        previousStatus: normalizedStatus,
        startedAt: startedAt.toISOString(),
      },
    });

    return {
      realizationId: realization.id,
      status: 'in-progress' as const,
      started: normalizedStatus !== 'in-progress',
      startedAt: startedAt.toISOString(),
    };
  }

  async finishMobileAdminRealization(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const finishedAt = new Date();
    const normalizedStatus = this.normalizeStatus(
      realization.status,
      realization.scheduledAt,
      realization.durationMinutes,
    );

    if (normalizedStatus !== 'done') {
      await this.prisma.realization.update({
        where: { id: realization.id },
        data: {
          status: PrismaRealizationStatus.DONE,
        },
      });
    }

    await this.emitEvent({
      realizationId: realization.id,
      teamId: null,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'realization_finished',
      payload: {
        previousStatus: normalizedStatus,
        finishedAt: finishedAt.toISOString(),
      },
    });

    return {
      realizationId: realization.id,
      status: 'done' as const,
      finished: normalizedStatus !== 'done',
      finishedAt: finishedAt.toISOString(),
    };
  }

  async resetMobileAdminRealization(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const resetAt = new Date();

    await this.ensureTeamsForRealization(realization);

    const [
      deletedAssignments,
      deletedProgress,
      deletedRuntimeEvents,
      deletedStationScans,
    ] = await this.prisma.$transaction([
      this.prisma.teamAssignment.deleteMany({
        where: { realizationId: realization.id },
      }),
      this.prisma.teamTaskProgress.deleteMany({
        where: { realizationId: realization.id },
      }),
      this.prisma.eventLog.deleteMany({
        where: {
          realizationId: realization.id,
          actorType: {
            in: [EventActorType.MOBILE_DEVICE, EventActorType.SYSTEM],
          },
        },
      }),
      // qr-hunt progress is derived by counting these rows (see session/state
      // building), not stored on TeamTaskProgress — left out of this reset, a
      // "fresh" realization would still show old scan counts for qr-hunt tasks.
      this.prisma.teamStationScan.deleteMany({
        where: { realizationId: realization.id },
      }),
    ]);

    await this.prisma.team.updateMany({
      where: { realizationId: realization.id },
      data: {
        name: null,
        color: null,
        badgeKey: null,
        badgeImageUrl: null,
        points: 0,
        taskDone: 0,
        status: TeamStatus.UNASSIGNED,
        lastLocationLat: null,
        lastLocationLng: null,
        lastLocationAccuracy: null,
        lastLocationAt: null,
      },
    });

    await this.prisma.realization.update({
      where: { id: realization.id },
      data: {
        status: PrismaRealizationStatus.PLANNED,
        scheduledAt: resetAt,
      },
    });

    await this.emitEvent({
      realizationId: realization.id,
      teamId: null,
      actorType: EventActorType.ADMIN,
      actorId: 'admin',
      eventType: 'realization_reset',
      payload: {
        resetAt: resetAt.toISOString(),
        deletedAssignments: deletedAssignments.count,
        deletedTaskProgress: deletedProgress.count,
        deletedRuntimeEvents: deletedRuntimeEvents.count,
        deletedStationScans: deletedStationScans.count,
      },
    });

    return {
      realizationId: realization.id,
      status: 'planned' as const,
      resetAt: resetAt.toISOString(),
      deletedAssignments: deletedAssignments.count,
      deletedTaskProgress: deletedProgress.count,
      deletedRuntimeEvents: deletedRuntimeEvents.count,
      deletedStationScans: deletedStationScans.count,
    };
  }

  async getMobileAdminRealizationLocations(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);
    const teams = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
      select: {
        id: true,
        slotNumber: true,
        name: true,
        color: true,
        status: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationAccuracy: true,
        lastLocationAt: true,
        updatedAt: true,
      },
    });

    const serverTime = new Date();

    return {
      serverTime: serverTime.toISOString(),
      realization: {
        id: realization.id,
        companyName: realization.companyName,
        status: realization.status,
        scheduledAt: realization.scheduledAt,
        durationMinutes: realization.durationMinutes,
        locationRequired: realization.locationRequired,
        joinCode: realization.joinCode,
        updatedAt: realization.updatedAt,
      },
      teams: teams.map((team) => {
        const location = this.toLastLocation(team);
        const locationAgeSeconds = team.lastLocationAt
          ? Math.max(
              0,
              Math.round(
                (serverTime.getTime() - team.lastLocationAt.getTime()) / 1000,
              ),
            )
          : null;

        return {
          id: team.id,
          slotNumber: team.slotNumber,
          name: team.name,
          color: team.color,
          status: this.fromTeamStatus(team.status),
          hasLocation: Boolean(location),
          locationAgeSeconds,
          lastLocation: location,
          updatedAt: team.updatedAt.toISOString(),
        };
      }),
    };
  }

  async listPendingPhotoReviews(realizationId: string) {
    const realization =
      await this.resolveMobileAdminRealizationOrThrow(realizationId);

    const [photos, progresses, teams, stations] = await Promise.all([
      this.prisma.teamPhoto.findMany({
        where: { realizationId: realization.id, kind: 'TASK_PROOF' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teamTaskProgress.findMany({
        where: { realizationId: realization.id },
      }),
      this.prisma.team.findMany({
        where: { realizationId: realization.id },
      }),
      this.stationService.findStationsByIds(realization.stationIds),
    ]);

    const progressByKey = new Map(
      progresses.map((progress) => [
        `${progress.teamId}:${progress.stationId}`,
        progress,
      ]),
    );
    const teamById = new Map(teams.map((team) => [team.id, team]));
    const stationById = new Map(
      stations.map((station) => [station.id, station]),
    );

    const latestPhotoByKey = new Map<string, (typeof photos)[number]>();
    for (const photo of photos) {
      if (!photo.stationId) {
        continue;
      }
      const key = `${photo.teamId}:${photo.stationId}`;
      if (!latestPhotoByKey.has(key)) {
        latestPhotoByKey.set(key, photo);
      }
    }

    const pending = Array.from(latestPhotoByKey.values()).filter((photo) => {
      const progress = progressByKey.get(`${photo.teamId}:${photo.stationId}`);
      return progress?.status === TaskStatus.IN_PROGRESS;
    });

    return pending
      .map((photo) => {
        const team = teamById.get(photo.teamId);
        const station = stationById.get(photo.stationId as string);
        if (!team || !station) {
          return null;
        }

        return {
          teamId: team.id,
          teamName: team.name || `Drużyna ${team.slotNumber}`,
          stationId: station.id,
          stationName: station.name,
          stationDescription: station.description,
          photoUrl: photo.url,
          submittedAt: photo.createdAt.toISOString(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  }

  private async resolveMobileAdminRealizationOrThrow(realizationId: string) {
    const requestedId = realizationId.trim();
    const realizations = await this.getRealizationsView();
    const realization =
      requestedId && requestedId !== 'current'
        ? realizations.find((item) => item.id === requestedId)
        : this.resolveCurrentMobileRealization(realizations);

    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    return realization;
  }

  private async getRealizationsView() {
    const items = await this.realizationService.listRealizations();
    const realizationRows = await this.prisma.realization.findMany({
      select: {
        id: true,
        locationRequired: true,
        showLeaderboard: true,
        showLeaderboardDuringGame: true,
        showLeaderboardOnFinish: true,
        hideLeaderboardMinutesBeforeEnd: true,
        teamStationNumberingEnabled: true,
        timedStationPointsDecayEnabled: true,
        hideTaskList: true,
      },
    });
    const rowById = new Map(realizationRows.map((row) => [row.id, row]));

    return items.map((item) => ({
      ...item,
      id: item.id,
      companyName: item.companyName,
      introText: item.introText,
      gameRules: item.gameRules,
      status: this.normalizeStatus(
        item.status,
        item.scheduledAt,
        item.durationMinutes,
      ),
      scheduledAt: item.scheduledAt,
      durationMinutes: item.durationMinutes,
      language: item.language,
      customLanguage: item.customLanguage,
      locationRequired:
        rowById.get(item.id)?.locationRequired ?? item.status === 'in-progress',
      showLeaderboard:
        rowById.get(item.id)?.showLeaderboard ?? item.showLeaderboard,
      showLeaderboardDuringGame:
        rowById.get(item.id)?.showLeaderboardDuringGame ??
        item.showLeaderboardDuringGame ??
        rowById.get(item.id)?.showLeaderboard ??
        item.showLeaderboard,
      showLeaderboardOnFinish:
        rowById.get(item.id)?.showLeaderboardOnFinish ??
        item.showLeaderboardOnFinish ??
        rowById.get(item.id)?.showLeaderboard ??
        item.showLeaderboard,
      hideLeaderboardMinutesBeforeEnd:
        rowById.get(item.id)?.hideLeaderboardMinutesBeforeEnd ??
        item.hideLeaderboardMinutesBeforeEnd ??
        0,
      teamStationNumberingEnabled:
        rowById.get(item.id)?.teamStationNumberingEnabled ??
        item.teamStationNumberingEnabled ??
        true,
      timedStationPointsDecayEnabled:
        rowById.get(item.id)?.timedStationPointsDecayEnabled ??
        item.timedStationPointsDecayEnabled ??
        false,
      hideTaskList:
        rowById.get(item.id)?.hideTaskList ?? item.hideTaskList ?? false,
      joinCode: item.joinCode,
      teamCount: Math.max(1, Math.round(item.teamCount)),
      stationIds: item.stationIds,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  private resolveCurrentMobileRealization<
    T extends { id: string; status: RealizationStatus; scheduledAt: string },
  >(realizations: T[]) {
    const inProgress = realizations.find(
      (item) => item.status === 'in-progress',
    );
    if (inProgress) return inProgress;

    const planned = realizations.filter((item) => item.status === 'planned');

    if (planned.length > 0) {
      const now = Date.now();
      let nearestUpcoming: T | null = null;
      let nearestUpcomingTimestamp = Number.POSITIVE_INFINITY;
      let latestPast: T | null = null;
      let latestPastTimestamp = Number.NEGATIVE_INFINITY;

      for (const item of planned) {
        const timestamp = new Date(item.scheduledAt).getTime();
        if (!Number.isFinite(timestamp)) {
          continue;
        }

        if (timestamp >= now && timestamp < nearestUpcomingTimestamp) {
          nearestUpcoming = item;
          nearestUpcomingTimestamp = timestamp;
        }

        if (timestamp < now && timestamp > latestPastTimestamp) {
          latestPast = item;
          latestPastTimestamp = timestamp;
        }
      }

      if (nearestUpcoming) {
        return nearestUpcoming;
      }

      if (latestPast) {
        return latestPast;
      }

      return planned[0];
    }

    return realizations[0] || null;
  }

  private async ensureTeamsForRealization(realization: {
    id: string;
    teamCount: number;
    stationIds: string[];
  }) {
    const targetTaskTotal = realization.stationIds.length;
    const existing = await this.prisma.team.findMany({
      where: { realizationId: realization.id },
      orderBy: { slotNumber: 'asc' },
    });

    if (existing.length > realization.teamCount) {
      const overflow = existing
        .slice(realization.teamCount)
        .map((item) => item.id);
      if (overflow.length > 0) {
        await this.prisma.team.deleteMany({ where: { id: { in: overflow } } });
      }
    }

    const keptTeams = existing.slice(
      0,
      Math.min(existing.length, realization.teamCount),
    );
    const teamsWithOutdatedTaskTotal = keptTeams.filter(
      (team) => team.taskTotal !== targetTaskTotal,
    );
    if (teamsWithOutdatedTaskTotal.length > 0) {
      await this.prisma.$transaction(
        teamsWithOutdatedTaskTotal.map((team) =>
          this.prisma.team.update({
            where: { id: team.id },
            data: {
              taskTotal: targetTaskTotal,
              taskDone: Math.min(team.taskDone, targetTaskTotal),
            },
          }),
        ),
      );
    }

    for (
      let slot = existing.length + 1;
      slot <= realization.teamCount;
      slot += 1
    ) {
      await this.prisma.team.create({
        data: {
          realizationId: realization.id,
          slotNumber: slot,
          taskTotal: targetTaskTotal,
          taskDone: 0,
          status: TeamStatus.UNASSIGNED,
        },
      });
    }
  }

  private findRealizationByJoinCode<T extends { joinCode: string }>(
    realizations: T[],
    joinCode: string,
  ) {
    return realizations.find(
      (item) => item.joinCode.toLowerCase() === joinCode.toLowerCase(),
    );
  }

  private async requireSession(sessionToken: string) {
    if (!sessionToken?.trim()) {
      throw new UnauthorizedException('Missing session token');
    }

    const candidates = getOpaqueTokenCandidates(sessionToken);

    const assignment = await this.prisma.teamAssignment.findFirst({
      where: { sessionToken: { in: candidates } },
      include: { team: true },
    });

    if (!assignment) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (this.isExpired(assignment.expiresAt.toISOString())) {
      await this.prisma.teamAssignment.delete({ where: { id: assignment.id } });
      throw new UnauthorizedException('Session expired');
    }

    const rawToken = sessionToken.trim();
    await this.touchAssignment(
      assignment.id,
      assignment.sessionToken === rawToken ? rawToken : undefined,
    );
    const realizations = await this.getRealizationsView();
    const realization = realizations.find(
      (item) => item.id === assignment.realizationId,
    );

    if (!assignment.team || !realization) {
      throw new NotFoundException('Session resources not found');
    }

    return {
      assignment,
      team: assignment.team,
      realization,
    };
  }

  private toMobileStationPayload(
    station: StationEntity,
    languageContext: ReturnType<typeof resolveRealizationLanguageContext>,
  ) {
    const localized = resolveLocalizedStationPresentation(
      station,
      languageContext,
    );
    const quizAudioUrl =
      (localized.quiz?.audioUrl && localized.quiz.audioUrl.trim()) ||
      (station.quiz?.audioUrl && station.quiz.audioUrl.trim()) ||
      undefined;
    const parsedCompletionCode = parseCompletionCode(
      station.completionCode ?? '',
    );
    const completionCodeLength = parsedCompletionCode?.length ?? 0;

    return {
      id: station.id,
      name: localized.name,
      type: station.type,
      description: localized.description,
      imageUrl: station.imageUrl,
      points: station.points,
      timeLimitSeconds: station.timeLimitSeconds,
      challengeDifficultyMode: station.challengeDifficultyMode,
      challengeDifficulty: station.challengeDifficulty,
      completionStopwatchEnabled: station.completionStopwatchEnabled,
      fastestCompletionBonusPoints: station.fastestCompletionBonusPoints,
      qrScanRequiredCount:
        station.type === 'qr-hunt' ? station.qrScanCodes.length : undefined,
      completionCodeInputMode: resolveCompletionCodeInputMode(
        station.completionCode,
      ),
      completionCodeLength:
        completionCodeLength > 0 ? completionCodeLength : undefined,
      quiz:
        localized.quiz && Array.isArray(localized.quiz.answers)
          ? {
              question: localized.quiz.question,
              answers: localized.quiz.answers,
              correctAnswerIndex: localized.quiz.correctAnswerIndex,
              ...(quizAudioUrl ? { audioUrl: quizAudioUrl } : {}),
              ...(localized.quiz.acceptedAnswers?.length
                ? { acceptedAnswers: localized.quiz.acceptedAnswers }
                : {}),
              // Not translation-dependent — always read from the base
              // station, never the per-language override.
              ...(typeof station.quiz?.caesarShift === 'number'
                ? { caesarShift: station.quiz.caesarShift }
                : {}),
            }
          : undefined,
      color: station.color,
      latitude: station.latitude,
      longitude: station.longitude,
    };
  }

  private async touchAssignment(
    assignmentId: string,
    rawSessionToken?: string,
  ) {
    const refreshed = new Date();
    await this.prisma.teamAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(rawSessionToken
          ? { sessionToken: hashOpaqueToken(rawSessionToken) }
          : {}),
        lastSeenAt: refreshed,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return refreshed.toISOString();
  }

  private async recalculateTeamPoints(teamId: string, realizationId: string) {
    const doneTasks = await this.prisma.teamTaskProgress.findMany({
      where: {
        teamId,
        status: TaskStatus.DONE,
      },
    });

    const pointsQrClaims = await this.prisma.pointsQrCodeClaim.findMany({
      where: { teamId },
      include: { pointsQrCode: { select: { points: true } } },
    });

    const taskPoints = doneTasks.reduce(
      (sum, item) => sum + item.pointsAwarded,
      0,
    );
    const pointsQrPoints = pointsQrClaims.reduce(
      (sum, claim) => sum + claim.pointsQrCode.points,
      0,
    );
    const points = taskPoints + pointsQrPoints;

    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        points,
        taskDone: doneTasks.length,
      },
    });

    await this.emitEvent({
      realizationId,
      teamId,
      actorType: EventActorType.SYSTEM,
      actorId: 'system',
      eventType: 'points_recalculated',
      payload: {
        pointsTotal: points,
        taskDone: doneTasks.length,
      },
    });

    return points;
  }

  private async getStationSummaryForAdmin(stationId: string) {
    const station = await this.stationService.findStationById(stationId);
    return {
      stationId,
      stationName: station?.name ?? `Stanowisko ${stationId}`,
      stationType: station?.type ?? 'quiz',
      defaultPoints: station?.points ?? 0,
      completionStopwatchEnabled: station?.completionStopwatchEnabled ?? false,
      fastestCompletionBonusPoints: station?.fastestCompletionBonusPoints ?? 0,
      latitude:
        typeof station?.latitude === 'number' &&
        Number.isFinite(station.latitude)
          ? station.latitude
          : null,
      longitude:
        typeof station?.longitude === 'number' &&
        Number.isFinite(station.longitude)
          ? station.longitude
          : null,
    };
  }

  private async resolveMobileAdminTeamTaskContext(input: {
    realizationId: string;
    teamId: string;
    stationId: string;
  }) {
    const teamId = input.teamId?.trim();
    const stationId = input.stationId?.trim();
    if (!teamId || !stationId) {
      throw new BadRequestException('Invalid payload');
    }

    const realization = await this.resolveMobileAdminRealizationOrThrow(
      input.realizationId,
    );
    if (!realization.stationIds.includes(stationId)) {
      throw new BadRequestException(
        'Station not available in this realization',
      );
    }

    const [team, station, existingProgress] = await Promise.all([
      this.prisma.team.findFirst({
        where: {
          id: teamId,
          realizationId: realization.id,
        },
        select: {
          id: true,
        },
      }),
      this.stationService.findStationById(stationId),
      this.prisma.teamTaskProgress.findUnique({
        where: {
          realizationId_teamId_stationId: {
            realizationId: realization.id,
            teamId,
            stationId,
          },
        },
      }),
    ]);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (!station || station.realizationId !== realization.id) {
      throw new NotFoundException('Station not found');
    }

    return {
      realization,
      team,
      station,
      existingProgress,
      stationId,
    };
  }

  private computeLinearTimePoints(input: {
    basePoints: number;
    timeLimitSeconds: number;
    startedAtIso: string;
    finishedAtIso: string;
  }) {
    const safeBasePoints = Math.max(0, Math.round(input.basePoints));
    const safeLimit = Math.max(0, Math.round(input.timeLimitSeconds));
    if (safeBasePoints === 0) {
      return 0;
    }

    if (safeLimit === 0) {
      return safeBasePoints;
    }

    const startedAtMs = new Date(input.startedAtIso).getTime();
    const finishedAtMs = new Date(input.finishedAtIso).getTime();
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) {
      throw new BadRequestException('Invalid payload');
    }

    const elapsedSeconds = Math.max(
      0,
      Math.round((finishedAtMs - startedAtMs) / 1000),
    );
    if (elapsedSeconds >= safeLimit) {
      return 0;
    }

    const ratio = Math.max(0, 1 - elapsedSeconds / safeLimit);
    return Math.max(0, Math.round(safeBasePoints * ratio));
  }

  private async assertGameplayAllowed(input: {
    realization: {
      id: string;
      status: RealizationStatus;
      scheduledAt: string;
      durationMinutes: number;
      stationIds: string[];
      updatedAt: string;
    };
    teamId: string;
  }) {
    const endState = await this.resolveSessionEndState({
      realization: input.realization,
      teamId: input.teamId,
    });

    if (!endState.isEnded) {
      return;
    }

    if (endState.reason === 'time-expired') {
      throw new ConflictException('Realization time is over');
    }

    if (endState.reason === 'all-tasks-completed') {
      throw new ConflictException(
        'All tasks are already completed for this team',
      );
    }

    throw new ConflictException('Realization has been finished');
  }

  private resolveTeamStationOrder(
    stationIds: string[],
    slotNumber: number,
    teamStationNumberingEnabled: boolean,
  ) {
    const uniqueStationIds: string[] = [];
    const seenStationIds = new Set<string>();

    for (const stationId of stationIds) {
      const normalizedStationId = stationId.trim();
      if (!normalizedStationId || seenStationIds.has(normalizedStationId)) {
        continue;
      }

      seenStationIds.add(normalizedStationId);
      uniqueStationIds.push(normalizedStationId);
    }

    if (!teamStationNumberingEnabled || uniqueStationIds.length === 0) {
      return uniqueStationIds.map((stationId, index) => ({
        stationId,
        stationNumber: index + 1,
      }));
    }

    const stationCount = uniqueStationIds.length;
    const slotOffset =
      (((Math.max(1, Math.round(slotNumber)) - 1) % stationCount) +
        stationCount) %
      stationCount;

    return uniqueStationIds.map((_, index) => {
      const stationIndex = (index + slotOffset) % stationCount;
      return {
        stationId: uniqueStationIds[stationIndex],
        stationNumber: index + 1,
      };
    });
  }

  private assertLocationRequirementSatisfied(
    realization: { locationRequired: boolean },
    team: { lastLocationAt?: Date | null },
  ) {
    if (realization.locationRequired && !team.lastLocationAt) {
      throw new BadRequestException(
        'Location update is required for this realization',
      );
    }
  }

  private async resolveSessionEndState(input: {
    realization: {
      id: string;
      status: RealizationStatus;
      scheduledAt: string;
      durationMinutes: number;
      stationIds: string[];
      updatedAt: string;
    };
    teamId: string;
    normalizedRealizationStatus?: RealizationStatus;
  }) {
    const normalizedRealizationStatus =
      input.normalizedRealizationStatus ||
      this.normalizeStatus(
        input.realization.status,
        input.realization.scheduledAt,
        input.realization.durationMinutes,
      );

    if (normalizedRealizationStatus === 'done') {
      return {
        isEnded: true,
        reason: 'realization-finished' as MobileSessionEndReason,
        endedAt: input.realization.updatedAt,
      };
    }

    const deadlineAt = this.resolveRealizationDeadlineAtIso(
      input.realization.scheduledAt,
      input.realization.durationMinutes,
    );
    if (deadlineAt && new Date(deadlineAt).getTime() <= Date.now()) {
      return {
        isEnded: true,
        reason: 'time-expired' as MobileSessionEndReason,
        endedAt: deadlineAt,
      };
    }

    const stationIds = input.realization.stationIds;
    if (stationIds.length > 0) {
      const [doneTasksCount, latestDoneTask] = await Promise.all([
        this.prisma.teamTaskProgress.count({
          where: {
            realizationId: input.realization.id,
            teamId: input.teamId,
            stationId: { in: stationIds },
            status: TaskStatus.DONE,
          },
        }),
        this.prisma.teamTaskProgress.findFirst({
          where: {
            realizationId: input.realization.id,
            teamId: input.teamId,
            stationId: { in: stationIds },
            status: TaskStatus.DONE,
          },
          orderBy: { finishedAt: 'desc' },
          select: { finishedAt: true },
        }),
      ]);

      if (doneTasksCount >= stationIds.length) {
        return {
          isEnded: true,
          reason: 'all-tasks-completed' as MobileSessionEndReason,
          endedAt:
            latestDoneTask?.finishedAt?.toISOString() ||
            new Date().toISOString(),
        };
      }
    }

    return {
      isEnded: false,
      reason: null,
      endedAt: null,
    } as const;
  }

  private resolveRealizationDeadlineAtIso(
    scheduledAt: string,
    durationMinutes: number,
  ) {
    const scheduledAtMs = new Date(scheduledAt).getTime();
    if (!Number.isFinite(scheduledAtMs)) {
      return null;
    }

    const safeDurationMinutes = Math.max(1, Math.round(durationMinutes));
    const deadlineMs = scheduledAtMs + safeDurationMinutes * MINUTES_TO_MS;
    return new Date(deadlineMs).toISOString();
  }

  private async buildRealizationLeaderboard(realizationId: string) {
    const [teams, assignments] = await Promise.all([
      this.prisma.team.findMany({
        where: { realizationId },
        orderBy: [{ points: 'desc' }, { slotNumber: 'asc' }],
        select: {
          id: true,
          slotNumber: true,
          name: true,
          color: true,
          badgeKey: true,
          badgeImageUrl: true,
          points: true,
          taskDone: true,
          taskTotal: true,
          status: true,
        },
      }),
      this.prisma.teamAssignment.findMany({
        where: { realizationId },
        select: { teamId: true },
      }),
    ]);

    const assignedTeamIds = new Set(assignments.map((item) => item.teamId));
    const participatingTeams = teams.filter((team) => {
      const hasName = Boolean(team.name?.trim());
      const hasProgress = team.taskDone > 0 || team.points > 0;
      const hasDeviceAssignment = assignedTeamIds.has(team.id);
      const hasRuntimeStatus = team.status !== TeamStatus.UNASSIGNED;
      return hasName || hasProgress || hasDeviceAssignment || hasRuntimeStatus;
    });

    return {
      updatedAt: new Date().toISOString(),
      entries: participatingTeams.map((team, index) => {
        const progressDone = Math.max(0, team.taskDone);
        const progressTotal = Math.max(progressDone, team.taskTotal);
        const progressPercent =
          progressTotal > 0
            ? Math.max(
                0,
                Math.min(100, Math.round((progressDone / progressTotal) * 100)),
              )
            : 0;

        return {
          position: index + 1,
          teamId: team.id,
          slotNumber: team.slotNumber,
          name: team.name?.trim() || `Drużyna ${team.slotNumber}`,
          color: normalizeTeamColor(team.color),
          badgeKey: normalizeTeamBadgeKey(team.badgeKey),
          badgeImageUrl: team.badgeImageUrl || null,
          points: team.points,
          progressDone,
          progressTotal,
          progressPercent,
        };
      }),
    };
  }

  private async getCustomizationOccupancyByRealization(realizationId: string) {
    const teams = await this.prisma.team.findMany({
      where: { realizationId },
      select: {
        slotNumber: true,
        color: true,
        badgeKey: true,
      },
      orderBy: { slotNumber: 'asc' },
    });

    const colors: Partial<Record<TeamColor, number>> = {};
    const icons: Record<string, number> = {};
    for (const item of teams) {
      const normalizedColor = normalizeTeamColor(item.color);
      if (normalizedColor && typeof colors[normalizedColor] !== 'number') {
        colors[normalizedColor] = item.slotNumber;
      }

      const normalizedBadgeKey = item.badgeKey?.trim();
      const normalizedIcon = normalizeTeamBadgeKey(normalizedBadgeKey);
      if (normalizedIcon && typeof icons[normalizedIcon] !== 'number') {
        icons[normalizedIcon] = item.slotNumber;
      }
    }

    return { colors, icons };
  }

  private async emitEvent(log: {
    realizationId: string;
    teamId: string | null;
    actorType: EventActorType;
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.eventLog.create({
      data: {
        realizationId: log.realizationId,
        teamId: log.teamId,
        actorType: log.actorType,
        actorId: log.actorId,
        eventType: log.eventType,
        payload: log.payload as Prisma.InputJsonValue,
      },
    });
  }

  private normalizeStatus(
    status: RealizationStatus,
    scheduledAt: string,
    durationMinutes: number,
  ) {
    const timestamp = new Date(scheduledAt).getTime();
    const safeDurationMinutes = Math.max(1, Math.round(durationMinutes));
    const autoDoneTimestamp =
      timestamp + safeDurationMinutes * MINUTES_TO_MS + AUTO_DONE_GRACE_MS;

    if (Number.isFinite(timestamp) && autoDoneTimestamp < Date.now()) {
      return 'done' as const;
    }

    return status;
  }

  private generateSessionToken() {
    return `mob_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  private isExpired(iso: string) {
    return new Date(iso).getTime() < Date.now();
  }

  private toLastLocation(team: {
    lastLocationLat: number | null;
    lastLocationLng: number | null;
    lastLocationAccuracy: number | null;
    lastLocationAt: Date | null;
  }) {
    if (
      typeof team.lastLocationLat !== 'number' ||
      typeof team.lastLocationLng !== 'number' ||
      !team.lastLocationAt
    ) {
      return null;
    }

    return {
      lat: team.lastLocationLat,
      lng: team.lastLocationLng,
      accuracy: team.lastLocationAccuracy || undefined,
      at: team.lastLocationAt.toISOString(),
    };
  }

  private parseStationIdFromEventPayload(payload: unknown) {
    const source =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : null;
    const stationId = source?.stationId;
    return typeof stationId === 'string' && stationId.trim().length > 0
      ? stationId.trim()
      : null;
  }

  private resolveTaskFailureReason(reason?: string) {
    const raw = reason?.trim() || null;
    const normalized = raw?.toLowerCase() || '';

    if (normalized === 'quiz_incorrect_answer') {
      return {
        code: 'quiz_incorrect_answer',
        label: 'Błędna odpowiedź quizu',
        raw,
      } as const;
    }

    if (normalized === 'time_limit_expired') {
      return {
        code: 'time_limit_expired',
        label: 'Przekroczony limit czasu',
        raw,
      } as const;
    }

    if (normalized === 'task_closed_before_completion') {
      return {
        code: 'task_closed_before_completion',
        label: 'Zamknięto zadanie przed ukończeniem',
        raw,
      } as const;
    }

    if (!raw) {
      return {
        code: 'manual_fail',
        label: 'Oznaczono jako niezaliczone',
        raw: null,
      } as const;
    }

    return {
      code: 'custom_fail_reason',
      label: 'Niestandardowy powód niezaliczenia',
      raw,
    } as const;
  }

  private async getFailedTaskStationIds(input: {
    realizationId: string;
    teamId: string;
  }) {
    const logs = await this.prisma.eventLog.findMany({
      where: {
        realizationId: input.realizationId,
        OR: [
          {
            teamId: input.teamId,
            eventType: {
              in: ['task_failed', 'task_completed', 'task_reset_by_admin'],
            },
          },
          {
            teamId: null,
            eventType: {
              in: ['completed_tasks_reset', 'realization_reset'],
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        eventType: true,
        payload: true,
      },
    });

    const failed = new Set<string>();
    const decided = new Set<string>();
    for (const log of logs) {
      if (
        log.eventType === 'completed_tasks_reset' ||
        log.eventType === 'realization_reset'
      ) {
        break;
      }

      const stationId = this.parseStationIdFromEventPayload(log.payload);
      if (!stationId || decided.has(stationId)) {
        continue;
      }

      decided.add(stationId);
      if (log.eventType === 'task_failed') {
        failed.add(stationId);
      }
    }

    return failed;
  }

  private fromTaskStatus(status?: TaskStatus | null, failed = false) {
    if (failed) return 'failed' as const;
    if (!status || status === TaskStatus.TODO) return 'todo' as const;
    if (status === TaskStatus.IN_PROGRESS) return 'in-progress' as const;
    return 'done' as const;
  }

  /**
   * Same as fromTaskStatus, but also treats an IN_PROGRESS task as 'failed'
   * once its time limit has elapsed, even if the device that ran the
   * countdown never called task/fail (app closed, backgrounded, station
   * never revisited). Purely a read-time projection, same pattern as
   * resolveRealizationStatus — nothing is written to the DB here.
   */
  private resolveEffectiveTaskStatus(
    status: TaskStatus | null | undefined,
    failed: boolean,
    startedAt: Date | null | undefined,
    timeLimitSeconds: number | null | undefined,
  ) {
    if (failed) return 'failed' as const;
    if (!status || status === TaskStatus.TODO) return 'todo' as const;
    const effectiveTimeLimitSeconds = timeLimitSeconds ?? 0;
    if (
      status === TaskStatus.IN_PROGRESS &&
      startedAt &&
      effectiveTimeLimitSeconds > 0 &&
      startedAt.getTime() + effectiveTimeLimitSeconds * 1000 < Date.now()
    ) {
      return 'failed' as const;
    }
    if (status === TaskStatus.IN_PROGRESS) return 'in-progress' as const;
    return 'done' as const;
  }

  private async getTimeLimitSecondsByStationId(stationIds: string[]) {
    const uniqueStationIds = Array.from(new Set(stationIds));
    if (uniqueStationIds.length === 0) {
      return new Map<string, number>();
    }

    const stations = await this.prisma.station.findMany({
      where: { id: { in: uniqueStationIds } },
      select: { id: true, timeLimitSeconds: true },
    });

    return new Map(
      stations.map((station) => [station.id, station.timeLimitSeconds]),
    );
  }

  private fromTeamStatus(status: TeamStatus) {
    if (status === TeamStatus.ACTIVE) return 'active' as const;
    if (status === TeamStatus.OFFLINE) return 'offline' as const;
    return 'unassigned' as const;
  }

  private resolveTeamAdminStatus(
    status: TeamStatus,
    realizationStatus: RealizationStatus,
    activeDeviceCount: number,
  ) {
    if (realizationStatus === 'planned' && activeDeviceCount > 0) {
      return 'ready' as const;
    }

    return this.fromTeamStatus(status);
  }

  private async emitTeamReadyForStartIfNeeded(input: {
    realizationId: string;
    teamId: string;
    actorId: string;
    sessionExpiresAt: string;
  }) {
    const existingReadyLog = await this.prisma.eventLog.findFirst({
      where: {
        realizationId: input.realizationId,
        teamId: input.teamId,
        eventType: 'team_ready_for_start',
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existingReadyLog) {
      return;
    }

    await this.emitEvent({
      realizationId: input.realizationId,
      teamId: input.teamId,
      actorType: EventActorType.MOBILE_DEVICE,
      actorId: input.actorId,
      eventType: 'team_ready_for_start',
      payload: {
        state: 'ready',
        waitingFor: 'realization_start',
        sessionExpiresAt: input.sessionExpiresAt,
      },
    });
  }

  private fromActorType(actorType: EventActorType) {
    if (actorType === EventActorType.ADMIN) return 'admin' as const;
    if (actorType === EventActorType.MOBILE_DEVICE)
      return 'mobile-device' as const;
    return 'system' as const;
  }
}
