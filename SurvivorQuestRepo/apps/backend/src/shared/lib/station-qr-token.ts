import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const TOKEN_VERSION = 1;

type StationQrTokenPayload = {
  v: number;
  realizationId: string;
  stationId: string;
  iat: number;
  exp: number;
  nonce: string;
};

export type SignedStationQrTokenInput = {
  realizationId: string;
  stationId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  nonce?: string;
};

export type VerifyStationQrTokenResult =
  | {
      ok: true;
      payload: StationQrTokenPayload;
    }
  | {
      ok: false;
      reason:
        | 'invalid_format'
        | 'invalid_signature'
        | 'invalid_payload'
        | 'expired_token';
    };

function encodePayload(payload: StationQrTokenPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): StationQrTokenPayload | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Record<string, unknown>;

    const v = parsed.v;
    const realizationId = parsed.realizationId;
    const stationId = parsed.stationId;
    const iat = parsed.iat;
    const exp = parsed.exp;
    const nonce = parsed.nonce;

    if (
      v !== TOKEN_VERSION ||
      typeof realizationId !== 'string' ||
      realizationId.trim().length === 0 ||
      typeof stationId !== 'string' ||
      stationId.trim().length === 0 ||
      typeof iat !== 'number' ||
      !Number.isFinite(iat) ||
      typeof exp !== 'number' ||
      !Number.isFinite(exp) ||
      exp <= iat ||
      typeof nonce !== 'string' ||
      nonce.trim().length < 6
    ) {
      return null;
    }

    return {
      v: TOKEN_VERSION,
      realizationId: realizationId.trim(),
      stationId: stationId.trim(),
      iat: Math.round(iat),
      exp: Math.round(exp),
      nonce: nonce.trim(),
    };
  } catch {
    return null;
  }
}

function signEncodedPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function signaturesEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function signStationQrToken(
  input: SignedStationQrTokenInput,
  secret: string,
) {
  const payload: StationQrTokenPayload = {
    v: TOKEN_VERSION,
    realizationId: input.realizationId.trim(),
    stationId: input.stationId.trim(),
    iat: Math.round(input.issuedAtMs),
    exp: Math.round(input.expiresAtMs),
    nonce: input.nonce?.trim() || randomUUID(),
  };

  const encodedPayload = encodePayload(payload);
  const signature = signEncodedPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyStationQrToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): VerifyStationQrTokenResult {
  const normalized = token.trim();
  const dotIndex = normalized.indexOf('.');

  if (
    dotIndex <= 0 ||
    dotIndex === normalized.length - 1 ||
    normalized.indexOf('.', dotIndex + 1) !== -1
  ) {
    return {
      ok: false,
      reason: 'invalid_format',
    };
  }

  const encodedPayload = normalized.slice(0, dotIndex);
  const signature = normalized.slice(dotIndex + 1);
  const expectedSignature = signEncodedPayload(encodedPayload, secret);

  if (!signaturesEqual(signature, expectedSignature)) {
    return {
      ok: false,
      reason: 'invalid_signature',
    };
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return {
      ok: false,
      reason: 'invalid_payload',
    };
  }

  if (Math.round(nowMs) >= payload.exp) {
    return {
      ok: false,
      reason: 'expired_token',
    };
  }

  return {
    ok: true,
    payload,
  };
}
