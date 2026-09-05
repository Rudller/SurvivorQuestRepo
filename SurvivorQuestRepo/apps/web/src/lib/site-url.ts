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

/**
 * Shared Open Graph / Twitter image.
 *
 * In the App Router a route's `openGraph` replaces the parent object instead of
 * merging field by field, so a page that declares its own `openGraph` and omits
 * `images` ends up with no preview picture at all. Every such route spreads this
 * in rather than repeating the dimensions.
 */
export const OG_IMAGE = {
  url: "/hero-visual.png",
  width: 1536,
  height: 1024,
  alt: "SurvivorQuest — platforma do gier terenowych i realizacji eventowych",
} as const;
