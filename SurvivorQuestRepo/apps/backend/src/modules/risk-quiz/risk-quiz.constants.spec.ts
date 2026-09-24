import { RiskDifficulty } from '@prisma/client';

import {
  buildRiskCardCode,
  normalizeRiskCardCodePrefix,
  readRiskCardCodePrefixes,
} from './risk-quiz.constants';

describe('buildRiskCardCode', () => {
  it('prefixes the code with RYZYKANCI, so a printed pile is distinguishable from normal station stickers', () => {
    expect(buildRiskCardCode('historia', RiskDifficulty.EASY, 3)).toBe(
      'RYZYKANCI-HISTORIA-LATWE-3',
    );
  });

  it('uses the Polish difficulty slug for every level', () => {
    expect(buildRiskCardCode('historia', RiskDifficulty.MEDIUM, 1)).toBe(
      'RYZYKANCI-HISTORIA-SREDNIE-1',
    );
    expect(buildRiskCardCode('historia', RiskDifficulty.HARD, 10)).toBe(
      'RYZYKANCI-HISTORIA-TRUDNE-10',
    );
  });

  it('uppercases the whole code, because scanCard() looks codes up uppercased', () => {
    expect(buildRiskCardCode('druga-wojna-2', RiskDifficulty.EASY, 7)).toBe(
      'RYZYKANCI-DRUGA-WOJNA-2-LATWE-7',
    );
  });
});

describe('buildRiskCardCode with a prefix override', () => {
  it('uses the printed prefix instead of the default one and keeps the number', () => {
    expect(
      buildRiskCardCode(
        'historia',
        RiskDifficulty.MEDIUM,
        4,
        'RYZYKANCI-HISTORIA-SREDNE',
      ),
    ).toBe('RYZYKANCI-HISTORIA-SREDNE-4');
  });
});

describe('normalizeRiskCardCodePrefix', () => {
  it('uppercases, trims and drops a trailing dash', () => {
    expect(normalizeRiskCardCodePrefix(' ryzykanci-sztuka-trudne- ')).toEqual({
      ok: true,
      value: 'RYZYKANCI-SZTUKA-TRUDNE',
    });
  });

  it('treats an empty value as "back to default"', () => {
    expect(normalizeRiskCardCodePrefix('   ')).toEqual({
      ok: true,
      value: null,
    });
  });

  it('rejects spaces and Polish letters', () => {
    expect(normalizeRiskCardCodePrefix('ŚREDNIE KARTY')).toEqual({ ok: false });
  });
});

describe('readRiskCardCodePrefixes', () => {
  it('keeps only valid prefixes of known difficulties', () => {
    expect(
      readRiskCardCodePrefixes({
        MEDIUM: 'RYZYKANCI-HISTORIA-SREDNE',
        HARD: 'zle kody',
        OTHER: 'X',
      }),
    ).toEqual({ MEDIUM: 'RYZYKANCI-HISTORIA-SREDNE' });
  });

  it('returns nothing for an empty column', () => {
    expect(readRiskCardCodePrefixes(null)).toEqual({});
  });
});
