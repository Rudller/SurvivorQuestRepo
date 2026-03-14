const DEFAULT_BACKEND_API_URL = "http://localhost:3001";

export function buildApiPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getApiConnectionLabel() {
  return getConfiguredApiUrl();
}

export function getConfiguredApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_BACKEND_API_URL;
}
