const DEFAULT_BACKEND_API_URL = "http://localhost:3001";
const DEFAULT_BACKEND_API_PORT = "3001";
const API_URL_STORAGE_KEY = "survivorquest.admin.api-url";
const API_URL_CHANGE_EVENT = "survivorquest:api-url-changed";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_API_URL_OVERRIDE = process.env.NEXT_PUBLIC_ALLOW_API_URL_OVERRIDE === "true";

function isLocalHostname(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1"
  );
}

function buildHostBasedDefaultApiUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_BACKEND_API_URL;
  }

  const currentHostname = window.location.hostname.trim();
  if (!currentHostname || isLocalHostname(currentHostname)) {
    return DEFAULT_BACKEND_API_URL;
  }

  const protocol = window.location.protocol === "https:" ? "https" : "http";
  return `${protocol}://${currentHostname}:${DEFAULT_BACKEND_API_PORT}`;
}

function getDefaultApiUrl() {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envApiUrl) {
    return buildHostBasedDefaultApiUrl();
  }

  const normalizedEnvApiUrl = normalizeApiUrl(envApiUrl);
  if (!normalizedEnvApiUrl) {
    return buildHostBasedDefaultApiUrl();
  }

  if (typeof window === "undefined") {
    return normalizedEnvApiUrl;
  }

  const currentHostname = window.location.hostname.trim();
  if (!currentHostname || isLocalHostname(currentHostname)) {
    return normalizedEnvApiUrl;
  }

  const envHostname = new URL(normalizedEnvApiUrl).hostname;
  if (isLocalHostname(envHostname)) {
    return buildHostBasedDefaultApiUrl();
  }

  return normalizedEnvApiUrl;
}

function normalizeApiUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, "");
  return `${parsedUrl.origin}${pathname}`;
}

function readStoredApiUrl() {
  if (!canEditConfiguredApiUrl()) {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return normalizeApiUrl(window.localStorage.getItem(API_URL_STORAGE_KEY) ?? "");
}

export function buildApiPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path.trim())) {
    return path.trim();
  }

  return `${getConfiguredApiUrl().replace(/\/+$/, "")}${buildApiPath(path)}`;
}

export function getApiConnectionLabel() {
  return getConfiguredApiUrl();
}

const PRODUCTION_API_HOSTNAME = "survivorquest.pl";

export function isProductionApiUrl(apiUrl: string) {
  try {
    const hostname = new URL(apiUrl).hostname.toLowerCase();
    return (
      hostname === PRODUCTION_API_HOSTNAME ||
      hostname.endsWith(`.${PRODUCTION_API_HOSTNAME}`)
    );
  } catch {
    return false;
  }
}

export function getApiEnvironmentLabel() {
  return isProductionApiUrl(getConfiguredApiUrl()) ? "PRODUKCJA" : "TEST/DEV";
}

export function getConfiguredApiUrl() {
  return readStoredApiUrl() || normalizeApiUrl(getDefaultApiUrl()) || DEFAULT_BACKEND_API_URL;
}

export function canEditConfiguredApiUrl() {
  return !IS_PRODUCTION || ALLOW_API_URL_OVERRIDE;
}

function isApiUrlAllowed(normalizedUrl: string) {
  if (!IS_PRODUCTION) {
    return true;
  }

  const parsedUrl = new URL(normalizedUrl);
  if (parsedUrl.protocol !== "https:") {
    return isLocalHostname(parsedUrl.hostname);
  }

  return true;
}

export function setConfiguredApiUrl(value: string) {
  if (!canEditConfiguredApiUrl()) {
    return {
      ok: false as const,
      message: "Zmiana serwera API jest zablokowana w tej instalacji.",
    };
  }

  if (typeof window === "undefined") {
    return { ok: false as const, message: "Zmiana serwera jest dostępna tylko w przeglądarce." };
  }

  const normalized = normalizeApiUrl(value);
  if (!normalized) {
    return { ok: false as const, message: "Podaj poprawny adres serwera (np. http://localhost:3001)." };
  }

  if (!isApiUrlAllowed(normalized)) {
    return {
      ok: false as const,
      message: "W produkcji użyj adresu HTTPS albo lokalnego adresu developerskiego.",
    };
  }

  window.localStorage.setItem(API_URL_STORAGE_KEY, normalized);
  window.dispatchEvent(new Event(API_URL_CHANGE_EVENT));
  return { ok: true as const, value: normalized };
}

export function resetConfiguredApiUrl() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(API_URL_STORAGE_KEY);
  window.dispatchEvent(new Event(API_URL_CHANGE_EVENT));
}

export function subscribeConfiguredApiUrlChange(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const localHandler = () => onChange();
  const storageHandler = (event: StorageEvent) => {
    if (event.key === API_URL_STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(API_URL_CHANGE_EVENT, localHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(API_URL_CHANGE_EVENT, localHandler);
    window.removeEventListener("storage", storageHandler);
  };
}
