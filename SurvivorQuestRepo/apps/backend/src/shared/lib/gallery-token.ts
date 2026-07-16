import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { readRuntimeSecret } from './runtime-secret';

const TOKEN_VERSION = 1;

type GalleryTokenPayload = {
  v: number;
  realizationId: string;
  iat: number;
  exp: number;
  nonce: string;
};

export type SignedGalleryTokenInput = {
  realizationId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  nonce?: string;
};

export type VerifyGalleryTokenResult =
  | {
      ok: true;
      payload: GalleryTokenPayload;
    }
  | {
      ok: false;
      reason:
        | 'invalid_format'
        | 'invalid_signature'
        | 'invalid_payload'
        | 'expired_token';
    };

function encodePayload(payload: GalleryTokenPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): GalleryTokenPayload | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Record<string, unknown>;

    const v = parsed.v;
    const realizationId = parsed.realizationId;
    const iat = parsed.iat;
    const exp = parsed.exp;
    const nonce = parsed.nonce;

    if (
      v !== TOKEN_VERSION ||
      typeof realizationId !== 'string' ||
      realizationId.trim().length === 0 ||
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
      iat: Math.round(iat),
      exp: Math.round(exp),
      nonce: nonce.trim(),
    };
  } catch {
    return null;
  }
}

function signEncodedPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
}

function signaturesEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function signGalleryToken(
  input: SignedGalleryTokenInput,
  secret: string,
) {
  const payload: GalleryTokenPayload = {
    v: TOKEN_VERSION,
    realizationId: input.realizationId.trim(),
    iat: Math.round(input.issuedAtMs),
    exp: Math.round(input.expiresAtMs),
    nonce: input.nonce?.trim() || randomUUID(),
  };

  const encodedPayload = encodePayload(payload);
  const signature = signEncodedPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyGalleryToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): VerifyGalleryTokenResult {
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

export function getGalleryTokenSecret() {
  return readRuntimeSecret({
    key: 'GALLERY_ACCESS_TOKEN_SECRET',
    developmentFallback: 'dev-gallery-access-token-secret-change-me-123456',
  });
}
