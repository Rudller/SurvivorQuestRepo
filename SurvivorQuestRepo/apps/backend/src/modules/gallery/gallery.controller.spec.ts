import { BadRequestException } from '@nestjs/common';
import { GalleryController, readBearerToken } from './gallery.controller';
import type { GalleryService } from './gallery.service';

describe('readBearerToken', () => {
  it('reads the token out of a bearer header', () => {
    expect(readBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('is case-insensitive about the scheme and tolerates padding', () => {
    expect(readBearerToken('  bearer   abc123  ')).toBe('abc123');
  });

  it('rejects a missing, empty or non-bearer header', () => {
    expect(readBearerToken(undefined)).toBeNull();
    expect(readBearerToken('')).toBeNull();
    expect(readBearerToken('Bearer   ')).toBeNull();
    expect(readBearerToken('Basic abc123')).toBeNull();
  });
});

describe('GalleryController.getGalleryPhotos', () => {
  function setup() {
    const getPhotos = jest.fn().mockResolvedValue({ photos: [] });
    const controller = new GalleryController({ getPhotos } as unknown as GalleryService);
    return { controller, getPhotos };
  }

  it('takes the token from the Authorization header', async () => {
    const { controller, getPhotos } = setup();

    await controller.getGalleryPhotos('real-1', 'Bearer header-token');

    expect(getPhotos).toHaveBeenCalledWith('real-1', 'header-token');
  });

  // The query parameter is the deprecated transport, kept so that the web app
  // and this API can be deployed in either order.
  it('still accepts the token from the query string', async () => {
    const { controller, getPhotos } = setup();

    await controller.getGalleryPhotos('real-1', undefined, ' query-token ');

    expect(getPhotos).toHaveBeenCalledWith('real-1', 'query-token');
  });

  it('prefers the header when both are present', async () => {
    const { controller, getPhotos } = setup();

    await controller.getGalleryPhotos('real-1', 'Bearer header-token', 'query-token');

    expect(getPhotos).toHaveBeenCalledWith('real-1', 'header-token');
  });

  it('rejects a request carrying neither', async () => {
    const { controller, getPhotos } = setup();

    await expect(controller.getGalleryPhotos('real-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(getPhotos).not.toHaveBeenCalled();
  });
});
