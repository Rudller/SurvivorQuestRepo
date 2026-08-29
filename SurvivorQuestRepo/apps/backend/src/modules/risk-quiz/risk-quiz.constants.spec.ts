import { RiskDifficulty } from '@prisma/client';

import { buildRiskCardCode } from './risk-quiz.constants';

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
