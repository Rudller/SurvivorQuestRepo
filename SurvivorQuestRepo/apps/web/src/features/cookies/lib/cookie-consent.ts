export const COOKIE_CONSENT_KEY = "sq-cookie-consent-v1";
export const COOKIE_CONSENT_COOKIE_NAME = "sq_cookie_consent";
export const COOKIE_CONSENT_UPDATED_EVENT = "sq:cookie-consent-updated";
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentState = {
  version: number;
  analytics: boolean;
  updatedAt: string;
};

export function parseCookieConsent(raw: string | null | undefined): CookieConsentState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      analytics: parsed.analytics,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function readCookieValue(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match?.[1] ?? null;
}

export function readCookieConsentState(): CookieConsentState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromStorage = parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY));
  if (fromStorage) {
    return fromStorage;
  }

  const cookieRaw = readCookieValue(COOKIE_CONSENT_COOKIE_NAME);
  if (!cookieRaw) {
    return null;
  }

  const fromCookie = parseCookieConsent(decodeURIComponent(cookieRaw));
  if (fromCookie) {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fromCookie));
  }
  return fromCookie;
}

export function persistCookieConsent(analytics: boolean): CookieConsentState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextState: CookieConsentState = {
    version: COOKIE_CONSENT_VERSION,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(nextState);

  window.localStorage.setItem(COOKIE_CONSENT_KEY, serialized);
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, { detail: nextState }));
  return nextState;
}
