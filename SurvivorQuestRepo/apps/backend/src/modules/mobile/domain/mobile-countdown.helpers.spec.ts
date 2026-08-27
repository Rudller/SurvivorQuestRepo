import {
  PRE_GAME_COUNTDOWN_MS,
  resolveStartCountdownMs,
} from './mobile-countdown.helpers';

const NOW = new Date('2026-08-27T10:00:00.000Z');

function at(offsetMs: number) {
  return new Date(NOW.getTime() + offsetMs);
}

describe('resolveStartCountdownMs', () => {
  it('counts the time left from the moment start was pressed', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: at(-4_000),
        now: NOW,
      }),
    ).toBe(PRE_GAME_COUNTDOWN_MS - 4_000);
  });

  it('gives the full countdown the instant start is pressed', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: NOW,
        now: NOW,
      }),
    ).toBe(PRE_GAME_COUNTDOWN_MS);
  });

  // A team joining late must drop straight into the game rather than sit
  // through a countdown that finished without them.
  it('reports zero once the countdown has run out', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: at(-PRE_GAME_COUNTDOWN_MS),
        now: NOW,
      }),
    ).toBe(0);

    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: at(-60 * 60 * 1000),
        now: NOW,
      }),
    ).toBe(0);
  });

  // Realizations started before this field existed carry no stamp; they must
  // not be held on a countdown that can never resolve.
  it('applies no countdown without a start stamp', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: null,
        now: NOW,
      }),
    ).toBeNull();
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: new Date('nonsense'),
        now: NOW,
      }),
    ).toBeNull();
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: 'nonsense',
        now: NOW,
      }),
    ).toBeNull();
  });

  it.each(['planned', 'done'])('applies no countdown while %s', (status) => {
    expect(
      resolveStartCountdownMs({ status, startedAt: NOW, now: NOW }),
    ).toBeNull();
  });

  // Someone correcting a server clock mid-event should not hand the tablets a
  // countdown longer than the one they exist to show.
  it('caps a stamp that sits in the future', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: at(30_000),
        now: NOW,
      }),
    ).toBe(PRE_GAME_COUNTDOWN_MS);
  });

  it('reads the stamp from an ISO string too', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: at(-2_500).toISOString(),
        now: NOW,
      }),
    ).toBe(PRE_GAME_COUNTDOWN_MS - 2_500);
  });

  it('honours an explicit countdown length', () => {
    expect(
      resolveStartCountdownMs({
        status: 'in-progress',
        startedAt: at(-1_000),
        now: NOW,
        lengthMs: 3_000,
      }),
    ).toBe(2_000);
  });
});
