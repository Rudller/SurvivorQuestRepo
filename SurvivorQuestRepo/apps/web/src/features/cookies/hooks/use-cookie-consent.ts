"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_UPDATED_EVENT,
  type CookieConsentState,
  readCookieConsentState,
} from "@/features/cookies/lib/cookie-consent";

export function useCookieConsentState() {
  const [state, setState] = useState<CookieConsentState | null>(null);

  useEffect(() => {
    setState(readCookieConsentState());

    function syncFromStorage() {
      setState(readCookieConsentState());
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === COOKIE_CONSENT_KEY) {
        syncFromStorage();
      }
    }

    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, syncFromStorage);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return state;
}

export function useAnalyticsConsent() {
  const state = useCookieConsentState();
  return Boolean(state?.analytics);
}
