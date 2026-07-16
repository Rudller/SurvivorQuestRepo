const DEFAULT_BACKEND_API_URL = "http://localhost:3001";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getBackendApiUrl() {
  const candidate = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (!candidate) {
    return DEFAULT_BACKEND_API_URL;
  }
  return normalizeBaseUrl(candidate);
}

export function buildBackendApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendApiUrl()}/api${normalizedPath}`;
}
