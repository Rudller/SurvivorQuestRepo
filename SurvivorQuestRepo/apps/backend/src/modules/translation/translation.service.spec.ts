import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { TranslationService } from './translation.service';

describe('TranslationService.translateBatch', () => {
  const originalEnv = process.env.DEEPL_API_KEY;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.DEEPL_API_KEY = 'test-key:fx';
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.DEEPL_API_KEY = originalEnv;
    jest.clearAllMocks();
  });

  it('calls the DeepL free-tier endpoint with mapped language codes and returns translated texts', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        translations: [{ text: 'Witaj' }, { text: 'Świat' }],
      }),
    });

    const service = new TranslationService();
    const result = await service.translateBatch(
      ['Hello', 'World'],
      'english',
      'polish',
    );

    expect(result).toEqual(['Witaj', 'Świat']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-free.deepl.com/v2/translate');
    expect(init.headers.Authorization).toBe('DeepL-Auth-Key test-key:fx');
    const body = init.body as URLSearchParams;
    expect(body.getAll('text')).toEqual(['Hello', 'World']);
    expect(body.get('source_lang')).toBe('EN');
    expect(body.get('target_lang')).toBe('PL');
  });

  it('uses EN-GB (not bare EN) when translating into English', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: [{ text: 'Hello' }] }),
    });

    const service = new TranslationService();
    await service.translateBatch(['Cześć'], 'polish', 'english');

    const [, init] = fetchMock.mock.calls[0];
    const body = init.body as URLSearchParams;
    expect(body.get('target_lang')).toBe('EN-GB');
  });

  it('skips blank entries without spending quota and preserves their position', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: [{ text: 'Witaj' }] }),
    });

    const service = new TranslationService();
    const result = await service.translateBatch(
      ['', 'Hello', '   '],
      'english',
      'polish',
    );

    expect(result).toEqual(['', 'Witaj', '']);
    const [, init] = fetchMock.mock.calls[0];
    const body = init.body as URLSearchParams;
    expect(body.getAll('text')).toEqual(['Hello']);
  });

  it('returns all-blank output without calling DeepL when every text is blank', async () => {
    const service = new TranslationService();
    const result = await service.translateBatch(['', '  '], 'english', 'polish');

    expect(result).toEqual(['', '']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects "other" as a source or target language', async () => {
    const service = new TranslationService();

    await expect(
      service.translateBatch(['Hello'], 'other', 'polish'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.translateBatch(['Hello'], 'english', 'other'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when DEEPL_API_KEY is not configured', async () => {
    delete process.env.DEEPL_API_KEY;
    const service = new TranslationService();

    await expect(
      service.translateBatch(['Hello'], 'english', 'polish'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when DeepL responds with a non-OK status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 456 });
    const service = new TranslationService();

    await expect(
      service.translateBatch(['Hello'], 'english', 'polish'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('uses the pro endpoint when the key has no :fx suffix', async () => {
    process.env.DEEPL_API_KEY = 'pro-key';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: [{ text: 'Witaj' }] }),
    });

    const service = new TranslationService();
    await service.translateBatch(['Hello'], 'english', 'polish');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepl.com/v2/translate');
  });
});
