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
