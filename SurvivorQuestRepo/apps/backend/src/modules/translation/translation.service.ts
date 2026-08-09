import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { translate } from 'google-translate-api-x';
import type { RealizationLanguage } from '../realization/entities/realization.entity';

// google-translate-api-x wraps Google Translate's consumer web endpoint rather than
// the official (paid-beyond-free-tier) Cloud Translation API — it needs no API key or
// billing account, but it isn't a sanctioned API: it can break without notice if Google
// changes that endpoint, and is more likely than an individual user to get rate-limited
// since every request comes from this server's one IP. If that becomes a problem, swap
// this service for the official Cloud Translation API or DeepL.
const GOOGLE_TRANSLATE_LANGUAGE_CODES: Partial<
  Record<RealizationLanguage, string>
> = {
  polish: 'pl',
  english: 'en',
  ukrainian: 'uk',
  russian: 'ru',
};

const CHUNK_MAX_ITEMS = 100;
const CHUNK_MAX_CHARS = 4000;
const RETRY_DELAY_MS = 2000;

function chunkEntries(entries: string[]): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentChars = 0;

  for (const entry of entries) {
    const wouldOverflow =
      currentChunk.length > 0 &&
      (currentChunk.length >= CHUNK_MAX_ITEMS ||
        currentChars + entry.length > CHUNK_MAX_CHARS);

    if (wouldOverflow) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }

    currentChunk.push(entry);
    currentChars += entry.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class TranslationService {
  async translateBatch(
    texts: string[],
    sourceLanguage: RealizationLanguage,
    targetLanguage: RealizationLanguage,
  ): Promise<string[]> {
    const sourceCode = GOOGLE_TRANSLATE_LANGUAGE_CODES[sourceLanguage];
    const targetCode = GOOGLE_TRANSLATE_LANGUAGE_CODES[targetLanguage];

    if (!sourceCode || !targetCode) {
      throw new BadRequestException(
        'Automatic translation is not available for a custom language.',
      );
    }

    const nonBlankEntries = texts
      .map((text, index) => ({ text, index }))
      .filter((entry) => entry.text.trim().length > 0);

    if (nonBlankEntries.length === 0) {
      return texts.map(() => '');
    }

    const chunks = chunkEntries(nonBlankEntries.map((entry) => entry.text));
    const translated: string[] = [];
    for (const chunk of chunks) {
      const chunkResult = await this.callGoogleTranslate(
        chunk,
        sourceCode,
        targetCode,
      );
      translated.push(...chunkResult);
    }

    const results = texts.map(() => '');
    nonBlankEntries.forEach((entry, position) => {
      results[entry.index] = translated[position] ?? '';
    });

    return results;
  }

  private async callGoogleTranslate(
    texts: string[],
    sourceCode: string,
    targetCode: string,
  ) {
    try {
      return await this.requestGoogleTranslate(texts, sourceCode, targetCode);
    } catch {
      // Unofficial endpoint — a single retry after a short delay absorbs transient
      // rate-limit/network blips without building out a full backoff system.
      await delay(RETRY_DELAY_MS);

      try {
        return await this.requestGoogleTranslate(texts, sourceCode, targetCode);
      } catch {
        throw new InternalServerErrorException(
          'Failed to reach the translation provider.',
        );
      }
    }
  }

  private async requestGoogleTranslate(
    texts: string[],
    sourceCode: string,
    targetCode: string,
  ) {
    const responses = await translate(texts, {
      from: sourceCode,
      to: targetCode,
      forceFrom: true,
      forceTo: true,
    });

    return responses.map((item) =>
      typeof item.text === 'string' ? item.text : '',
    );
  }
}
