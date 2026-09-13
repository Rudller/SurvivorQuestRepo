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
 *
 * 1200x630 is the 1.91:1 ratio Facebook, LinkedIn and X crop to. This used to
 * point at the 1536x1024 hero PNG, which meant every share cropped the photo
 * unpredictably and pulled 2 MB to build a thumbnail; the file here is a
 * pre-cropped 94 KB JPEG. Regenerate it from the hero photo with sharp if the
 * hero ever changes.
 */
export const OG_IMAGE = {
  url: "/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "SurvivorQuest — gry terenowe i eventy integracyjne dla firm",
} as const;
