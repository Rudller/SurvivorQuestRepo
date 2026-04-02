import { createHmac } from 'node:crypto';
import { readRuntimeSecret } from '../../../shared/lib/runtime-secret';
import type { VerifyStationQrTokenResult } from '../../../shared/lib/station-qr-token';

const DEFAULT_STATION_QR_TTL_SECONDS = 12 * 60 * 60;
const MIN_STATION_QR_TTL_SECONDS = 5 * 60;
const MAX_STATION_QR_TTL_SECONDS = 24 * 60 * 60;
const STATIC_STATION_QR_VALIDITY_YEARS = 20;
const STATIC_STATION_QR_NONCE_LENGTH = 24;
const COMPLETION_CODE_DIGITS_ONLY_REGEX = /^\d{3,32}$/;

type StationQrRejectReason = Exclude<
  VerifyStationQrTokenResult,
  { ok: true }
>['reason'];

export function resolveStationQrTtlSeconds(ttlSeconds?: number) {
  if (!Number.isFinite(ttlSeconds)) {
    return DEFAULT_STATION_QR_TTL_SECONDS;
  }

  const normalized = Math.round(ttlSeconds as number);
  return Math.min(
    MAX_STATION_QR_TTL_SECONDS,
    Math.max(MIN_STATION_QR_TTL_SECONDS, normalized),
  );
}

export function resolveStaticStationQrWindow(createdAtIso: string) {
  const parsedCreatedAt = new Date(createdAtIso).getTime();
  const issuedAtMs = Number.isFinite(parsedCreatedAt)
    ? Math.round(parsedCreatedAt)
    : Date.UTC(2024, 0, 1);
  const tokenTtlSeconds = STATIC_STATION_QR_VALIDITY_YEARS * 365 * 24 * 60 * 60;
  const expiresAtMs = issuedAtMs + tokenTtlSeconds * 1000;

  return {
    issuedAtMs,
    expiresAtMs,
    tokenTtlSeconds,
  };
}

export function buildDeterministicStationQrNonce(
  realizationId: string,
  stationId: string,
  secret: string,
) {
  return createHmac('sha256', secret)
    .update(`${realizationId.trim()}:${stationId.trim()}`)
    .digest('base64url')
    .slice(0, STATIC_STATION_QR_NONCE_LENGTH);
}

export function getStationQrSecret() {
  return readRuntimeSecret({
    key: 'STATION_QR_SECRET',
    developmentFallback: 'dev-station-qr-secret-change-me-123456',
  });
}

export function buildStationQrEntryUrl(token: string) {
  const base =
    process.env.MOBILE_QR_ENTRY_BASE_URL?.trim() || 'sq://station-entry';
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}

export function toStationQrRejectedMessage(reason: StationQrRejectReason) {
  if (reason === 'expired_token') {
    return 'QR expired';
  }

  if (reason === 'invalid_signature') {
    return 'Invalid QR signature';
  }

  if (reason === 'invalid_payload') {
    return 'Invalid QR payload';
  }

  return 'Invalid QR token format';
}

export function isCodeProtectedStationType(stationType: string) {
  return stationType === 'time' || stationType === 'points';
}

export function isTimedStartRequiredStationType(stationType: string) {
  return stationType === 'time' || stationType === 'wordle';
}

export function parseCompletionCode(value?: string | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function resolveCompletionCodeInputMode(value?: string | null) {
  const normalized = parseCompletionCode(value);
  if (!normalized) {
    return 'alphanumeric' as const;
  }

  return COMPLETION_CODE_DIGITS_ONLY_REGEX.test(normalized)
    ? ('numeric' as const)
    : ('alphanumeric' as const);
}
