import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealizationJoinCodeService } from '../realization/domain/realization.join-code';
import {
  getGalleryTokenSecret,
  signGalleryToken,
  verifyGalleryToken,
} from '../../shared/lib/gallery-token';

const GALLERY_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class GalleryService {
  private readonly joinCodeService = new RealizationJoinCodeService();

  constructor(private readonly prisma: PrismaService) {}

  async verifyPassword(realizationId: string, code: string) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
      select: { id: true, joinCode: true },
    });

    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    const publicJoinCode = this.joinCodeService.resolvePublicJoinCode(
      realization.id,
      realization.joinCode,
    );

    if (publicJoinCode.toLowerCase() !== code.trim().toLowerCase()) {
      throw new UnauthorizedException('Invalid code');
    }

    const issuedAtMs = Date.now();
    const accessToken = signGalleryToken(
      {
        realizationId: realization.id,
        issuedAtMs,
        expiresAtMs: issuedAtMs + GALLERY_TOKEN_TTL_MS,
      },
      getGalleryTokenSecret(),
    );

    return { accessToken };
  }

  async getPhotos(realizationId: string, accessToken: string) {
    const verified = verifyGalleryToken(accessToken, getGalleryTokenSecret());
    if (!verified.ok || verified.payload.realizationId !== realizationId) {
      throw new UnauthorizedException('Invalid or expired gallery access token');
    }

    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
      select: {
        id: true,
        companyName: true,
        scheduledAt: true,
        location: true,
      },
    });

    if (!realization) {
      throw new NotFoundException('Realization not found');
    }

    const [photos, teams, stations, taskOutcomeLogs] = await Promise.all([
      this.prisma.teamPhoto.findMany({
        where: { realizationId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.team.findMany({ where: { realizationId } }),
      this.prisma.station.findMany({ where: { realizationId } }),
      this.prisma.eventLog.findMany({
        where: {
          realizationId,
          eventType: { in: ['task_completed', 'task_failed'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { teamId: true, eventType: true, payload: true },
      }),
    ]);

    const teamById = new Map(teams.map((team) => [team.id, team]));
    const stationById = new Map(stations.map((station) => [station.id, station]));

    const latestOutcomeByKey = new Map<string, 'done' | 'failed'>();
    for (const log of taskOutcomeLogs) {
      const stationId = this.parseStationIdFromPayload(log.payload);
      if (!log.teamId || !stationId) {
        continue;
      }
      const key = `${log.teamId}:${stationId}`;
      if (!latestOutcomeByKey.has(key)) {
        latestOutcomeByKey.set(
          key,
          log.eventType === 'task_completed' ? 'done' : 'failed',
        );
      }
    }

    const visiblePhotos = photos.filter((photo) => {
      if (photo.kind === 'TEAM_SELFIE') {
        return true;
      }

      const outcome = latestOutcomeByKey.get(
        `${photo.teamId}:${photo.stationId}`,
      );
      return outcome === 'done';
    });

    return {
      realization: {
        companyName: realization.companyName,
        scheduledAt: realization.scheduledAt.toISOString(),
        location: realization.location,
      },
      photos: visiblePhotos.map((photo) => {
        const team = teamById.get(photo.teamId);
        const station = photo.stationId
          ? stationById.get(photo.stationId)
          : undefined;

        return {
          id: photo.id,
          kind: photo.kind,
          url: photo.url,
          teamId: photo.teamId,
          teamName: team?.name || null,
          teamColor: team?.color || null,
          stationName: station?.name || null,
          createdAt: photo.createdAt.toISOString(),
        };
      }),
    };
  }

  private parseStationIdFromPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    const stationId = (payload as Record<string, unknown>).stationId;
    return typeof stationId === 'string' && stationId.trim()
      ? stationId.trim()
      : null;
  }
}
