import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { translate } from 'google-translate-api-x';
import { TranslationService } from './translation.service';

jest.mock('google-translate-api-x', () => ({
  translate: jest.fn(),
}));

const translateMock = translate as unknown as jest.Mock;

describe('TranslationService.translateBatch', () => {
  beforeEach(() => {
    translateMock.mockReset();
  });

  it('calls the translation provider with mapped language codes and returns translated texts', async () => {
    translateMock.mockResolvedValue([{ text: 'Witaj' }, { text: 'Świat' }]);

    const service = new TranslationService();
    const result = await service.translateBatch(['Hello', 'World'], 'english', 'polish');

    expect(result).toEqual(['Witaj', 'Świat']);
    expect(translateMock).toHaveBeenCalledWith(
      ['Hello', 'World'],
      expect.objectContaining({ from: 'en', to: 'pl' }),
    );
  });

  it('maps each configured language to its symmetric ISO code', async () => {
    translateMock.mockResolvedValue([{ text: 'Hello' }]);

    const service = new TranslationService();
    await service.translateBatch(['Cześć'], 'polish', 'english');

    expect(translateMock).toHaveBeenCalledWith(
      ['Cześć'],
      expect.objectContaining({ from: 'pl', to: 'en' }),
    );
  });

  it('skips blank entries without spending a provider call on them and preserves their position', async () => {
    translateMock.mockResolvedValue([{ text: 'Witaj' }]);

    const service = new TranslationService();
    const result = await service.translateBatch(['', 'Hello', '   '], 'english', 'polish');

    expect(result).toEqual(['', 'Witaj', '']);
    expect(translateMock).toHaveBeenCalledWith(['Hello'], expect.anything());
  });

  it('returns all-blank output without calling the provider when every text is blank', async () => {
    const service = new TranslationService();
    const result = await service.translateBatch(['', '  '], 'english', 'polish');

    expect(result).toEqual(['', '']);
    expect(translateMock).not.toHaveBeenCalled();
  });

  it('rejects "other" as a source or target language', async () => {
    const service = new TranslationService();

    await expect(
      service.translateBatch(['Hello'], 'other', 'polish'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.translateBatch(['Hello'], 'english', 'other'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(translateMock).not.toHaveBeenCalled();
  });

  it('retries once and succeeds if the first attempt fails', async () => {
    translateMock
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce([{ text: 'Witaj' }]);

    const service = new TranslationService();
    const result = await service.translateBatch(['Hello'], 'english', 'polish');

    expect(result).toEqual(['Witaj']);
    expect(translateMock).toHaveBeenCalledTimes(2);
  }, 10000);

  it('throws after both the initial attempt and the retry fail', async () => {
    translateMock.mockRejectedValue(new Error('still down'));
    const service = new TranslationService();

    await expect(
      service.translateBatch(['Hello'], 'english', 'polish'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(translateMock).toHaveBeenCalledTimes(2);
  }, 10000);

  it('splits large batches into multiple provider calls and reassembles results in order', async () => {
    const texts = Array.from({ length: 150 }, (_, index) => `text-${index}`);
    translateMock.mockImplementation(async (chunk: string[]) =>
      chunk.map((text) => ({ text: `${text}-translated` })),
    );

    const service = new TranslationService();
    const result = await service.translateBatch(texts, 'english', 'polish');

    expect(translateMock.mock.calls.length).toBeGreaterThan(1);
    expect(result).toEqual(texts.map((text) => `${text}-translated`));
  });
});
