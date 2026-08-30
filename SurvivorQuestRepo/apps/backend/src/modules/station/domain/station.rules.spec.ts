import {
  isFillBlankStationType,
  isStationType,
  isTrueFalseStationType,
  joinTrueFalseAnswer,
  normalizeTrueFalseAnswer,
  splitTrueFalseAnswer,
} from './station.rules';

// A true/false statement and its verdict share one answer slot. The codec is the
// only thing keeping them apart, and both the admin form and the mobile panel
// depend on it round-tripping exactly, so it is worth pinning down.
describe('true/false answer codec', () => {
  it('round-trips a statement and its verdict', () => {
    const encoded = joinTrueFalseAnswer('Mieszko I przyjal chrzest w 966 roku.', true);

    expect(encoded).toBe('Mieszko I przyjal chrzest w 966 roku. :: T');
    expect(splitTrueFalseAnswer(encoded)).toEqual({
      statement: 'Mieszko I przyjal chrzest w 966 roku.',
      isTrue: true,
    });
  });

  it('round-trips a false verdict', () => {
    expect(splitTrueFalseAnswer(joinTrueFalseAnswer('Zdanie', false))).toEqual({
      statement: 'Zdanie',
      isTrue: false,
    });
  });

  it('keeps a statement that itself contains the delimiter', () => {
    expect(splitTrueFalseAnswer('Zapis 12 :: 30 to godzina. :: F')).toEqual({
      statement: 'Zapis 12 :: 30 to godzina.',
      isTrue: false,
    });
  });

  it('rejects a slot with no verdict, so validation can reject the station', () => {
    expect(splitTrueFalseAnswer('Bez flagi')).toEqual({ statement: '', isTrue: false });
    expect(splitTrueFalseAnswer('Zla flaga :: X')).toEqual({ statement: '', isTrue: false });
    expect(splitTrueFalseAnswer(' :: T')).toEqual({ statement: '', isTrue: false });
  });

  it('normalizes spacing without changing the verdict', () => {
    expect(normalizeTrueFalseAnswer('  Zdanie   ::   T  ')).toBe('Zdanie :: T');
  });

  it('normalizes an unusable slot to an empty string', () => {
    expect(normalizeTrueFalseAnswer('Bez flagi')).toBe('');
  });
});

describe('station type families', () => {
  it('recognises every new quiz variant as a station type', () => {
    for (const type of ['true-false', 'fill-blank']) {
      expect(isStationType(type)).toBe(true);
    }
  });

  // Removed on purpose: odd-one-out and picture-quiz were pure aliases of quiz —
  // same storage, same server-side check, same mobile panel — so they only ever
  // added a label. Their Postgres enum values stay behind (PostgreSQL cannot
  // drop one without recreating the type) and nothing maps to them.
  it('no longer recognises the removed quiz aliases', () => {
    expect(isStationType('odd-one-out')).toBe(false);
    expect(isStationType('picture-quiz')).toBe(false);
  });

  it('identifies the client-checked variants', () => {
    expect(isTrueFalseStationType('true-false')).toBe(true);
    expect(isFillBlankStationType('fill-blank')).toBe(true);
  });
});
