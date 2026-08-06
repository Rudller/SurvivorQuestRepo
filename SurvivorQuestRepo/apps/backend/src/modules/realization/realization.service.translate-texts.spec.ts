import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScenarioService } from '../scenario/scenario.service';
import { StationService } from '../station/station.service';
import { StationStorageService } from '../station/station-storage.service';
import { TranslationService } from '../translation/translation.service';
import { RealizationService } from './realization.service';

describe('RealizationService.translateTexts', () => {
  function createService() {
    const translationService = {
      translateBatch: jest.fn(),
    } as unknown as jest.Mocked<TranslationService>;

    const service = new RealizationService(
      {} as PrismaService,
      {} as ScenarioService,
      {} as StationService,
      {} as StationStorageService,
      translationService,
    );

    return { service, translationService };
  }

  it('delegates a valid batch to TranslationService and returns translated texts', async () => {
    const { service, translationService } = createService();
    translationService.translateBatch.mockResolvedValue(['Witaj', 'Świat']);

    const result = await service.translateTexts({
      sourceLanguage: 'english',
      targetLanguage: 'polish',
      texts: ['Hello', 'World'],
    });

    expect(result).toEqual({ texts: ['Witaj', 'Świat'] });
    expect(translationService.translateBatch).toHaveBeenCalledWith(
      ['Hello', 'World'],
      'english',
      'polish',
    );
  });

  it('rejects a custom ("other") target language', async () => {
    const { service, translationService } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'polish',
        targetLanguage: 'other',
        texts: ['Cześć'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(translationService.translateBatch).not.toHaveBeenCalled();
  });

  it('rejects a custom ("other") source language', async () => {
    const { service, translationService } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'other',
        targetLanguage: 'polish',
        texts: ['Cześć'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(translationService.translateBatch).not.toHaveBeenCalled();
  });

  it('rejects when source and target language are the same', async () => {
    const { service, translationService } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'polish',
        targetLanguage: 'polish',
        texts: ['Cześć'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(translationService.translateBatch).not.toHaveBeenCalled();
  });

  it('rejects a missing or invalid language', async () => {
    const { service } = createService();

    await expect(
      service.translateTexts({
        targetLanguage: 'polish',
        texts: ['Cześć'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.translateTexts({
        sourceLanguage: 'klingon' as never,
        targetLanguage: 'polish',
        texts: ['Cześć'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty texts array', async () => {
    const { service, translationService } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'english',
        targetLanguage: 'polish',
        texts: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(translationService.translateBatch).not.toHaveBeenCalled();
  });

  it('rejects a non-array texts payload', async () => {
    const { service } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'english',
        targetLanguage: 'polish',
        texts: 'Hello' as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a texts array containing a non-string entry', async () => {
    const { service } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'english',
        targetLanguage: 'polish',
        texts: ['Hello', 42 as never],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects more than 200 texts', async () => {
    const { service } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'english',
        targetLanguage: 'polish',
        texts: Array.from({ length: 201 }, (_, index) => `text-${index}`),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a single text longer than 5000 characters', async () => {
    const { service } = createService();

    await expect(
      service.translateTexts({
        sourceLanguage: 'english',
        targetLanguage: 'polish',
        texts: ['a'.repeat(5001)],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
