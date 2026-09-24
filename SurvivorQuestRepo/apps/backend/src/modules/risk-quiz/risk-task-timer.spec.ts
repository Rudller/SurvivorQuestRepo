import { resolveRiskRemainingSeconds } from './risk-task-timer';

describe('resolveRiskRemainingSeconds', () => {
  const now = new Date('2026-09-24T12:00:00.000Z');

  it('gives the full limit to a card drawn just now', () => {
    expect(resolveRiskRemainingSeconds(90, null, now)).toBe(90);
  });

  it('counts from the first draw, so a rescan does not refill the clock', () => {
    const openedAt = new Date(now.getTime() - 75_500);
    expect(resolveRiskRemainingSeconds(90, openedAt, now)).toBe(15);
  });

  it('never goes below zero once the time is up', () => {
    const openedAt = new Date(now.getTime() - 10 * 60_000);
    expect(resolveRiskRemainingSeconds(90, openedAt, now)).toBe(0);
  });

  it('returns null for a station without a time limit', () => {
    expect(resolveRiskRemainingSeconds(0, null, now)).toBeNull();
  });
});
