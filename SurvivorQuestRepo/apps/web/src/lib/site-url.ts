const DEFAULT_SITE_URL = "https://survivorquest.pl";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!candidate) {
    return DEFAULT_SITE_URL;
  }
  return normalizeBaseUrl(candidate);
}

export function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
