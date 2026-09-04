import {
  MOBILE_JOIN_THROTTLE,
  MOBILE_PHOTO_UPLOAD_THROTTLE,
  MOBILE_QR_RESOLVE_THROTTLE,
  MOBILE_SESSION_STATE_THROTTLE,
  RISK_QUIZ_PENDING_DRAW_THROTTLE,
  RISK_QUIZ_POLL_THROTTLE,
  mobileAwareTracker,
  mobileSessionTracker,
} from './throttle.constants';

describe('mobileSessionTracker', () => {
  it('keys by session token when the device has one', () => {
    expect(
      mobileSessionTracker({ ip: '10.0.0.5', body: { sessionToken: ' abc ' } }),
    ).toBe('session:abc');
  });

  it('keys by device id at join time, before a session exists', () => {
    expect(mobileSessionTracker({ ip: '10.0.0.5', body: { deviceId: 'tab-7' } })).toBe(
      'device:tab-7',
    );
  });

  it('prefers the session token over the device id', () => {
    expect(
      mobileSessionTracker({ ip: '10.0.0.5', body: { sessionToken: 'abc', deviceId: 'tab-7' } }),
    ).toBe('session:abc');
  });

  it('falls back to the address when the body identifies nothing', () => {
    expect(mobileSessionTracker({ ip: '10.0.0.5', body: {} })).toBe('10.0.0.5');
    expect(mobileSessionTracker({ ip: '10.0.0.5', body: { sessionToken: '   ' } })).toBe(
      '10.0.0.5',
    );
    expect(mobileSessionTracker({ ip: '10.0.0.5' })).toBe('10.0.0.5');
  });

  // The whole point: fifteen tablets on one venue Wi-Fi must not share a bucket.
  it('gives two tablets on one address separate buckets', () => {
    const first = mobileSessionTracker({ ip: '10.0.0.5', body: { sessionToken: 'a' } });
    const second = mobileSessionTracker({ ip: '10.0.0.5', body: { sessionToken: 'b' } });

    expect(first).not.toBe(second);
  });
});

describe('mobileAwareTracker', () => {
  it.each(['/mobile/risk-quiz/chat', '/api/mobile/session/state'])(
    'keys %s per device',
    (url) => {
      expect(mobileAwareTracker({ ip: '10.0.0.5', url, body: { sessionToken: 'abc' } })).toBe(
        'session:abc',
      );
    },
  );

  it('reads the path from originalUrl when express has rewritten url', () => {
    expect(
      mobileAwareTracker({
        ip: '10.0.0.5',
        originalUrl: '/api/mobile/risk-quiz/pigs',
        url: '/pigs',
        body: { sessionToken: 'abc' },
      }),
    ).toBe('session:abc');
  });

  // A body-supplied key can be rotated at will, so it is only trusted where the
  // clients are known to be tablets. Admin and auth traffic stays on the address.
  it.each(['/realizations', '/auth/login', '/mobile-ish/not-really'])(
    'keys %s by address',
    (url) => {
      expect(mobileAwareTracker({ ip: '10.0.0.5', url, body: { sessionToken: 'abc' } })).toBe(
        '10.0.0.5',
      );
    },
  );
});

describe('per-device throttle configuration', () => {
  // Every bucket a tablet hits during a game has to be keyed per device; one of
  // them left on the address is enough to take a fifteen-team room down.
  it.each([
    ['join', MOBILE_JOIN_THROTTLE],
    ['qr resolve', MOBILE_QR_RESOLVE_THROTTLE],
    ['photo upload', MOBILE_PHOTO_UPLOAD_THROTTLE],
    ['session state', MOBILE_SESSION_STATE_THROTTLE],
    ['pending draw', RISK_QUIZ_PENDING_DRAW_THROTTLE],
    ['risk-quiz polls', RISK_QUIZ_POLL_THROTTLE],
  ])('%s is keyed per device on both windows', (_name, throttle) => {
    expect(throttle.short.getTracker).toBe(mobileSessionTracker);
    expect(throttle.long.getTracker).toBe(mobileSessionTracker);
  });

  it('sizes the poll buckets above the steady poll rate', () => {
    // Chat and pigs poll every 5s — 12/min each — and share this bucket with
    // the deck counter's refreshes.
    expect(RISK_QUIZ_POLL_THROTTLE.short.limit).toBeGreaterThanOrEqual(30);
    // Pending draw polls every 4s: 15/min.
    expect(RISK_QUIZ_PENDING_DRAW_THROTTLE.short.limit).toBeGreaterThanOrEqual(20);
  });
});
