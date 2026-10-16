import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import archiver from 'archiver';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { PrismaService } from '../../prisma/prisma.service';
import { RealizationJoinCodeService } from '../realization/domain/realization.join-code';
import {
  getGalleryTokenSecret,
  signGalleryToken,
  verifyGalleryToken,
} from '../../shared/lib/gallery-token';

const GALLERY_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Bilet pobierania: krótki, bo jedzie w adresie URL (przeglądarka pobiera plik
 * zwykłą nawigacją, więc nie da się dołożyć nagłówka). 30-dniowy token dostępu
 * nigdy nie trafia do URL-a — wymienia się go na bilet tuż przed pobraniem.
 */
const DOWNLOAD_TICKET_TTL_MS = 2 * 60 * 1000;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

type GalleryPhotoEntry = Awaited<
  ReturnType<GalleryService['buildGallery']>
>['photos'][number];

@Injectable()
export class GalleryService {
  private readonly joinCodeService = new RealizationJoinCodeService();
  private readonly logger = new Logger(GalleryService.name);

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
    this.assertAccess(realizationId, accessToken);
    return this.buildGallery(realizationId);
  }

  /** Wymienia token dostępu (nagłówek) na krótki bilet do adresu pobierania. */
  issueDownloadTicket(realizationId: string, accessToken: string) {
    this.assertAccess(realizationId, accessToken);

    const issuedAtMs = Date.now();
    const ticket = signGalleryToken(
      {
        realizationId,
        issuedAtMs,
        expiresAtMs: issuedAtMs + DOWNLOAD_TICKET_TTL_MS,
      },
      getGalleryTokenSecret(),
    );

    return { ticket };
  }

  /**
   * ZIP ze wszystkimi zdjęciami galerii, folder na drużynę. Składany w locie:
   * zdjęcia płyną z R2 prosto do odpowiedzi, bez trzymania archiwum w pamięci
   * ani na dysku. Bez kompresji — JPEG-i i tak się nie zmniejszą, a kompresja
   * kosztowałaby CPU serwera przy każdym pobraniu.
   */
  async streamArchive(realizationId: string, ticket: string, res: Response) {
    this.assertAccess(realizationId, ticket);
    const gallery = await this.buildGallery(realizationId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      contentDisposition(
        `SurvivorQuest - ${gallery.realization.companyName}.zip`,
      ),
    );
    res.setHeader('Cache-Control', 'no-store');

    const archive = archiver('zip', { store: true });
    archive.on('warning', (error) => this.logger.warn(error.message));
    archive.on('error', (error) => {
      this.logger.error(`Gallery archive failed: ${error.message}`);
      res.destroy(error);
    });
    archive.pipe(res);

    const usedNames = new Set<string>();
    for (const [index, photo] of gallery.photos.entries()) {
      const source = await this.fetchPhoto(photo.url);
      if (!source) {
        // Brakujący plik nie może wywrócić całego archiwum klienta.
        continue;
      }

      const name = uniqueName(
        `${safeName(photo.teamName ?? 'Drużyna')}/${buildPhotoBaseName(photo, index)}.${source.extension}`,
        usedNames,
      );
      archive.append(source.stream, { name, date: new Date(photo.createdAt) });
    }

    await archive.finalize();
  }

  /** Jedno zdjęcie jako załącznik — bez tego przeglądarka otworzyłaby je w karcie. */
  async streamPhoto(
    realizationId: string,
    photoId: string,
    ticket: string,
    res: Response,
  ) {
    this.assertAccess(realizationId, ticket);
    const gallery = await this.buildGallery(realizationId);
    const index = gallery.photos.findIndex((photo) => photo.id === photoId);
    const photo = gallery.photos[index];
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const source = await this.fetchPhoto(photo.url);
    if (!source) {
      throw new NotFoundException('Photo file not found');
    }

    res.setHeader('Content-Type', source.contentType);
    res.setHeader(
      'Content-Disposition',
      contentDisposition(
        `${safeName(photo.teamName ?? 'Drużyna')} - ${buildPhotoBaseName(photo, index)}.${source.extension}`,
      ),
    );
    res.setHeader('Cache-Control', 'no-store');
    source.stream.pipe(res);
  }

  private assertAccess(realizationId: string, token: string) {
    const verified = verifyGalleryToken(token, getGalleryTokenSecret());
    if (!verified.ok || verified.payload.realizationId !== realizationId) {
      throw new UnauthorizedException(
        'Invalid or expired gallery access token',
      );
    }
  }

  private async fetchPhoto(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        return null;
      }
      const contentType =
        response.headers.get('content-type')?.split(';')[0]?.trim() ||
        'image/jpeg';
      return {
        contentType,
        extension:
          EXTENSION_BY_CONTENT_TYPE[contentType] ??
          url.split('?')[0].split('.').pop()?.toLowerCase() ??
          'jpg',
        stream: Readable.fromWeb(response.body as WebReadableStream),
      };
    } catch (error) {
      this.logger.warn(
        `Gallery photo fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async buildGallery(realizationId: string) {
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
    const stationById = new Map(
      stations.map((station) => [station.id, station]),
    );

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

/** Nazwa pliku bez znaków, które psują ścieżki w ZIP-ie i systemach plików. */
function safeName(value: string) {
  const cleaned = value
    // Znaki sterujące celowo: nazwa drużyny pochodzi od graczy.
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 80) || 'Zdjęcie';
}

function buildPhotoBaseName(photo: GalleryPhotoEntry, index: number) {
  const number = String(index + 1).padStart(3, '0');
  const label =
    photo.kind === 'TEAM_SELFIE'
      ? 'Selfie drużyny'
      : (photo.stationName ?? 'Zadanie');
  return `${number} ${safeName(label)}`;
}

function uniqueName(name: string, used: Set<string>) {
  let candidate = name;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = name.replace(/(\.[^.]+)$/, ` (${counter})$1`);
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Nagłówek Content-Disposition z polskimi znakami: wersja ASCII dla starych
 * klientów i `filename*` w UTF-8 dla wszystkich nowych przeglądarek.
 */
export function contentDisposition(fileName: string) {
  const ascii = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
