const DEFAULT_BACKEND_API_URL = "http://localhost:3001";
const API_URL_STORAGE_KEY = "survivorquest.admin.api-url";
const API_URL_CHANGE_EVENT = "survivorquest:api-url-changed";

function getDefaultApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_BACKEND_API_URL;
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

export function getConfiguredApiUrl() {
  return readStoredApiUrl() || normalizeApiUrl(getDefaultApiUrl()) || DEFAULT_BACKEND_API_URL;
}

export function setConfiguredApiUrl(value: string) {
  if (typeof window === "undefined") {
    return { ok: false as const, message: "Zmiana serwera jest dostępna tylko w przeglądarce." };
  }

  const normalized = normalizeApiUrl(value);
  if (!normalized) {
    return { ok: false as const, message: "Podaj poprawny adres serwera (np. http://localhost:3001)." };
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
