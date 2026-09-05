"use client";

import { useSyncExternalStore } from "react";
import {
  type CookieConsentSnapshot,
  getCookieConsentSnapshot,
  getServerCookieConsentSnapshot,
  subscribeToCookieConsent,
} from "@/features/cookies/lib/cookie-consent-store";

/**
 * Consent as an external store rather than `useState` + `useEffect`.
 *
 * It genuinely is external state — it lives in localStorage and a cookie, and
 * another tab can change it — so reading it into React state on mount both
 * tripped `react-hooks/set-state-in-effect` and cost an extra render with a
 * placeholder value.
 *
 * Returns `undefined` until the browser has been read; see CookieConsentSnapshot.
 */
export function useCookieConsentState(): CookieConsentSnapshot {
  return useSyncExternalStore(
    subscribeToCookieConsent,
    getCookieConsentSnapshot,
    getServerCookieConsentSnapshot,
  );
}

export function useAnalyticsConsent() {
  return Boolean(useCookieConsentState()?.analytics);
}
