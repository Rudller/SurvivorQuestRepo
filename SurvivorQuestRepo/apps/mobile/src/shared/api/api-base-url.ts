import AsyncStorage from "@react-native-async-storage/async-storage";

// Where the operator's explicit choice and the last address that actually
// answered are kept. Both were private to the onboarding screen, which is why a
// reloaded session had no way to find the backend again once the address stored
// with it went stale.
export const API_BASE_URL_OVERRIDE_STORAGE_KEY = "sq.mobile.api-base-url-override.v1";
export const API_LAST_SUCCESSFUL_BASE_URL_STORAGE_KEY = "sq.mobile.api-base-url-last-successful.v1";

/**
 * Turns whatever was typed, stored or baked into the build into a usable origin,
 * or null if it cannot be one.
 *
 * A bare host is allowed, and gets http:// on loopback and private ranges (a LAN
 * dev backend has no certificate) and https:// everywhere else.
 */
export function normalizeApiBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const hasExplicitProtocol = /^https?:\/\//i.test(trimmed);
  const hostCandidate = hasExplicitProtocol
    ? (() => {
        try {
          return new URL(trimmed).hostname.toLowerCase();
        } catch {
          return "";
        }
      })()
    : trimmed.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const shouldUseHttpByDefault =
    hostCandidate === "localhost" ||
    hostCandidate === "10.0.2.2" ||
    hostCandidate === "127.0.0.1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostCandidate);
  const inferredProtocol = shouldUseHttpByDefault ? "http" : "https";
  const candidate = hasExplicitProtocol ? trimmed : `${inferredProtocol}://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

/**
 * The address a restored session should talk to.
 *
 * `sessionBaseUrl` is whatever was persisted alongside the session and wins when
 * it is still usable — it is the address that worked when the team joined. The
 * rest is the same chain the join screen walks, so a tablet whose stored address
 * went stale (a LAN address that moved, a session written before the address was
 * persisted at all) can still find the backend after a reload instead of falling
 * back to an empty string and quietly asking its own dev server for the API.
 */
export async function resolveSessionApiBaseUrl(sessionBaseUrl: string | null | undefined) {
  const fromSession = normalizeApiBaseUrl(sessionBaseUrl);
  if (fromSession) {
    return fromSession;
  }

  try {
    const [storedOverride, storedLastSuccessful] = await Promise.all([
      AsyncStorage.getItem(API_BASE_URL_OVERRIDE_STORAGE_KEY),
      AsyncStorage.getItem(API_LAST_SUCCESSFUL_BASE_URL_STORAGE_KEY),
    ]);

    return (
      normalizeApiBaseUrl(storedOverride) ??
      normalizeApiBaseUrl(storedLastSuccessful) ??
      normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL)
    );
  } catch {
    return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  }
}
