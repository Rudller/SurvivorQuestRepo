import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { RealizationLanguage } from '../realization/entities/realization.entity';

const DEEPL_SOURCE_LANGUAGE_CODES: Partial<Record<RealizationLanguage, string>> = {
  polish: 'PL',
  english: 'EN',
  ukrainian: 'UK',
  russian: 'RU',
};

const DEEPL_TARGET_LANGUAGE_CODES: Partial<Record<RealizationLanguage, string>> = {
  polish: 'PL',
  english: 'EN-GB',
  ukrainian: 'UK',
  russian: 'RU',
};

type DeeplTranslateResponse = {
  translations?: Array<{ text?: unknown }>;
};

@Injectable()
export class TranslationService {
  async translateBatch(
    texts: string[],
    sourceLanguage: RealizationLanguage,
    targetLanguage: RealizationLanguage,
  ): Promise<string[]> {
    const sourceCode = DEEPL_SOURCE_LANGUAGE_CODES[sourceLanguage];
    const targetCode = DEEPL_TARGET_LANGUAGE_CODES[targetLanguage];

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

    const translated = await this.callDeepl(
      nonBlankEntries.map((entry) => entry.text),
      sourceCode,
      targetCode,
    );

    const results = texts.map(() => '');
    nonBlankEntries.forEach((entry, position) => {
      results[entry.index] = translated[position] ?? '';
    });

    return results;
  }

  private async callDeepl(texts: string[], sourceCode: string, targetCode: string) {
    const apiKey = this.getRequiredEnv('DEEPL_API_KEY');
    const baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    const body = new URLSearchParams();
    for (const text of texts) {
      body.append('text', text);
    }
    body.append('source_lang', sourceCode);
    body.append('target_lang', targetCode);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch {
      throw new InternalServerErrorException(
        'Failed to reach the translation provider.',
      );
    }

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Translation provider returned an error (${response.status}).`,
      );
    }

    const payload = (await response.json()) as DeeplTranslateResponse;
    const translations = payload.translations ?? [];

    return translations.map((item) =>
      typeof item.text === 'string' ? item.text : '',
    );
  }

  private getRequiredEnv(key: string) {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new InternalServerErrorException(
        `Missing required environment variable: ${key}`,
      );
    }

    return value;
  }
}
