import { UnauthorizedException } from '@nestjs/common';

import {
  getGalleryTokenSecret,
  signGalleryToken,
} from '../../shared/lib/gallery-token';
import { contentDisposition, GalleryService } from './gallery.service';

describe('contentDisposition', () => {
  it('daje wersję ASCII i pełną nazwę w UTF-8 dla polskich znaków', () => {
    const header = contentDisposition('SurvivorQuest - Łódź Żółw.zip');

    expect(header).toContain('filename="SurvivorQuest - Lodz Zolw.zip"');
    expect(header).toContain(
      `filename*=UTF-8''${encodeURIComponent('SurvivorQuest - Łódź Żółw.zip')}`,
    );
  });
});

describe('GalleryService.issueDownloadTicket', () => {
  const service = new GalleryService({} as never);

  function tokenFor(realizationId: string, ttlMs = 60_000) {
    const now = Date.now();
    return signGalleryToken(
      { realizationId, issuedAtMs: now, expiresAtMs: now + ttlMs },
      getGalleryTokenSecret(),
    );
  }

  it('wydaje bilet dla ważnego tokenu tej realizacji', () => {
    const { ticket } = service.issueDownloadTicket('r-1', tokenFor('r-1'));

    expect(typeof ticket).toBe('string');
    expect(ticket).not.toBe(tokenFor('r-1'));
  });

  it('odmawia tokenowi innej realizacji', () => {
    expect(() => service.issueDownloadTicket('r-1', tokenFor('r-2'))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('GalleryService.getPhotos', () => {
  function tokenFor(realizationId: string) {
    const now = Date.now();
    return signGalleryToken(
      { realizationId, issuedAtMs: now, expiresAtMs: now + 60_000 },
      getGalleryTokenSecret(),
    );
  }

  function proof(id: string, createdAt: string) {
    return {
      id,
      kind: 'TASK_PROOF',
      url: `https://cdn/${id}.jpg`,
      teamId: 't-1',
      stationId: 's-1',
      createdAt: new Date(createdAt),
    };
  }

  function serviceWith(
    photos: ReturnType<typeof proof>[],
    logs: { eventType: string; createdAt: string }[],
  ) {
    const prisma = {
      realization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'r-1',
          companyName: 'Firma',
          scheduledAt: new Date('2026-10-01T10:00:00Z'),
          location: 'Hotel',
        }),
      },
      teamPhoto: { findMany: jest.fn().mockResolvedValue(photos) },
      team: { findMany: jest.fn().mockResolvedValue([]) },
      station: { findMany: jest.fn().mockResolvedValue([]) },
      eventLog: {
        findMany: jest.fn().mockResolvedValue(
          [...logs]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((log) => ({
              teamId: 't-1',
              eventType: log.eventType,
              payload: { stationId: 's-1' },
              createdAt: new Date(log.createdAt),
            })),
        ),
      },
    };
    return new GalleryService(prisma as never);
  }

  it('po odrzuceniu do poprawy pokazuje tylko zaakceptowane, nowsze zdjęcie', async () => {
    const service = serviceWith(
      [proof('a', '2026-10-01T10:00:00Z'), proof('b', '2026-10-01T10:10:00Z')],
      [
        {
          eventType: 'task_rejected_for_retry',
          createdAt: '2026-10-01T10:05:00Z',
        },
        { eventType: 'task_completed', createdAt: '2026-10-01T10:15:00Z' },
      ],
    );

    const gallery = await service.getPhotos('r-1', tokenFor('r-1'));

    expect(gallery.photos.map((photo) => photo.id)).toEqual(['b']);
  });

  it('nie pokazuje zdjęcia, gdy ostatnie zdarzenie to odrzucenie', async () => {
    const service = serviceWith(
      [proof('a', '2026-10-01T10:00:00Z')],
      [
        {
          eventType: 'task_rejected_for_retry',
          createdAt: '2026-10-01T10:05:00Z',
        },
      ],
    );

    const gallery = await service.getPhotos('r-1', tokenFor('r-1'));

    expect(gallery.photos).toEqual([]);
  });
});
