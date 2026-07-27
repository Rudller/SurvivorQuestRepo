const COMPLETION_CODE_DIGITS_ONLY_REGEX = /^\d{3,32}$/;

export function buildStationQrEntryUrl(token: string) {
  const base =
    process.env.MOBILE_QR_ENTRY_BASE_URL?.trim() || 'sq://station-entry';
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}

export function isCodeProtectedStationType(stationType: string) {
  return stationType === 'time' || stationType === 'points';
}

export function isTimedStartRequiredStationType(stationType: string) {
  return stationType === 'time' || stationType === 'wordle' || stationType === 'strong-password';
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
