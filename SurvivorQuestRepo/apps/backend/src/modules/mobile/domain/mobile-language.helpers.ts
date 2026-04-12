import { BadRequestException } from '@nestjs/common';
import type { RealizationLanguage } from '../../realization/realization.service';
import type { StationEntity, StationQuiz } from '../../station/station.service';

type LanguageOption = { value: RealizationLanguage; label: string };

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'polish', label: 'Polski' },
  { value: 'english', label: 'Angielski' },
  { value: 'ukrainian', label: 'Ukraiński' },
  { value: 'russian', label: 'Rosyjski' },
  { value: 'other', label: 'Inne' },
];

const REALIZATION_LANGUAGE_ORDER = LANGUAGE_OPTIONS.map((option) => option.value);
const LANGUAGE_LABEL_BY_VALUE = new Map(
  LANGUAGE_OPTIONS.map((option) => [option.value, option.label]),
);
const LANGUAGE_TOKEN_TO_VALUE = new Map<string, RealizationLanguage>(
  LANGUAGE_OPTIONS.flatMap((option) => [
    [option.value.toLowerCase(), option.value],
    [option.label.toLowerCase(), option.value],
  ]),
);

export type MobileRealizationLanguageOption = {
  value: RealizationLanguage;
  label: string;
};

export type MobileRealizationLanguageContext = {
  baseLanguage: RealizationLanguage;
  selectedLanguage: RealizationLanguage;
  customLanguage?: string;
  availableLanguages: RealizationLanguage[];
  availableLanguageOptions: MobileRealizationLanguageOption[];
  fallbackChain: RealizationLanguage[];
};

export function splitLanguageTokens(value: string) {
  return value
    .split(/\s*(?:\+|,|;|\n)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLanguageSelection(languages: RealizationLanguage[]) {
  const selected = new Set(languages);
  return REALIZATION_LANGUAGE_ORDER.filter((value) => selected.has(value));
}

export function parseSelectedLanguageOrThrow(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (
    normalized === 'polish' ||
    normalized === 'english' ||
    normalized === 'ukrainian' ||
    normalized === 'russian' ||
    normalized === 'other'
  ) {
    return normalized as RealizationLanguage;
  }

  throw new BadRequestException('Invalid selected language');
}

function resolveAvailableLanguages(input: {
  language: RealizationLanguage;
  customLanguage?: string;
}) {
  if (input.language !== 'other') {
    return {
      availableLanguages: [input.language] as RealizationLanguage[],
      otherLabel: input.customLanguage?.trim() || undefined,
    };
  }

  const tokens = splitLanguageTokens(input.customLanguage?.trim() || '');
  const selectedKnown = new Set<RealizationLanguage>();
  const customParts: string[] = [];

  for (const token of tokens) {
    const mappedValue = LANGUAGE_TOKEN_TO_VALUE.get(token.toLowerCase());
    if (mappedValue && mappedValue !== 'other') {
      selectedKnown.add(mappedValue);
      continue;
    }

    if (mappedValue === 'other') {
      continue;
    }

    customParts.push(token);
  }

  const selectedCandidates: RealizationLanguage[] = [...selectedKnown];
  if (customParts.length > 0 || selectedKnown.size === 0) {
    selectedCandidates.push('other');
  }

  return {
    availableLanguages: normalizeLanguageSelection(selectedCandidates),
    otherLabel:
      customParts.length > 0
        ? customParts.join(', ')
        : input.customLanguage?.trim() || undefined,
  };
}

function buildFallbackChain(input: {
  selectedLanguage: RealizationLanguage;
  baseLanguage: RealizationLanguage;
}) {
  const chain = [
    input.selectedLanguage,
    input.baseLanguage,
    'polish' as const,
  ];
  return [...new Set(chain)];
}

export function resolveRealizationLanguageContext(input: {
  language: RealizationLanguage;
  customLanguage?: string;
  selectedLanguage?: string;
}): MobileRealizationLanguageContext {
  const parsedSelectedLanguage = parseSelectedLanguageOrThrow(
    input.selectedLanguage,
  );
  const { availableLanguages, otherLabel } = resolveAvailableLanguages({
    language: input.language,
    customLanguage: input.customLanguage,
  });

  const selectedLanguage =
    (parsedSelectedLanguage &&
      availableLanguages.includes(parsedSelectedLanguage) &&
      parsedSelectedLanguage) ||
    (input.language !== 'other' && availableLanguages.includes(input.language)
      ? input.language
      : undefined) ||
    (availableLanguages.includes('polish') ? 'polish' : undefined) ||
    availableLanguages[0] ||
    'polish';

  return {
    baseLanguage: input.language,
    selectedLanguage,
    customLanguage: input.customLanguage?.trim() || undefined,
    availableLanguages,
    availableLanguageOptions: availableLanguages.map((value) => ({
      value,
      label:
        value === 'other'
          ? otherLabel || 'Inne'
          : LANGUAGE_LABEL_BY_VALUE.get(value) || 'Inne',
    })),
    fallbackChain: buildFallbackChain({
      selectedLanguage,
      baseLanguage: input.language,
    }),
  };
}

function pickFirstString(
  values: Array<string | undefined>,
  fallback: string,
) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

function pickFirstQuiz(
  values: Array<StationQuiz | undefined>,
  fallback: StationQuiz | undefined,
) {
  for (const value of values) {
    if (value && Array.isArray(value.answers)) {
      return value;
    }
  }

  return fallback;
}

export function resolveLocalizedStationPresentation(
  station: StationEntity,
  context: MobileRealizationLanguageContext,
) {
  const translations = context.fallbackChain.map(
    (language) => station.translations?.[language],
  );

  return {
    name: pickFirstString(
      translations.map((value) => value?.name),
      station.name,
    ),
    description: pickFirstString(
      translations.map((value) => value?.description),
      station.description,
    ),
    quiz: pickFirstQuiz(
      translations.map((value) => value?.quiz),
      station.quiz,
    ),
  };
}
