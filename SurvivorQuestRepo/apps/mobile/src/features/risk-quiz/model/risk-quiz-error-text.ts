import {
  MobileApiHttpError,
  isMobileApiTimeoutError,
} from "../../expedition-stage/api/mobile-session.api";

export type RiskQuizErrorText = {
  /** Shown when the request ran out of time. */
  timeout: string;
  /** Shown when the device could not reach the server at all. */
  offline: string;
};

/**
 * React Native's `fetch` rejects with `TypeError: Network request failed` when
 * the device cannot reach the host; browsers word it "Failed to fetch". Neither
 * is a message to put in front of a player.
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof Error && /network request failed|failed to fetch/i.test(error.message);
}

/**
 * Turns whatever was thrown into something a player should read.
 *
 * The bug this replaces was `error instanceof Error ? error.message : fallback`.
 * A dead network throws an `Error`, so that check passed and the localized
 * fallback never ran — the player was shown the JS engine's own English string.
 *
 * Only `MobileApiHttpError` carries a message written for a human by the
 * backend, so only that one is passed through. Everything else falls back to
 * the caller's wording, which is translated.
 */
export function describeRiskQuizError(
  error: unknown,
  fallback: string,
  text: RiskQuizErrorText,
): string {
  if (isMobileApiTimeoutError(error)) {
    return text.timeout;
  }

  if (isNetworkError(error)) {
    return text.offline;
  }

  if (error instanceof MobileApiHttpError) {
    return error.message;
  }

  return fallback;
}
