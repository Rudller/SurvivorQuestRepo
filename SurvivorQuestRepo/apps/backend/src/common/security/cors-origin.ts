const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export function getCorsOriginAllowlist() {
  const rawAllowlist = process.env.CORS_ORIGIN_ALLOWLIST || '';
  return rawAllowlist
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10 || first === 127) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  return false;
}

export function isDevLocalNetworkOrigin(origin: string) {
  try {
    const parsedUrl = new URL(origin);
    if (!HTTP_PROTOCOLS.has(parsedUrl.protocol)) {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '::1') {
      return true;
    }

    return isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}

export function isCorsOriginAllowed(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  const allowlist = getCorsOriginAllowlist();
  const allowAllDevOrigins =
    process.env.NODE_ENV !== 'production' &&
    allowlist.length === 0 &&
    process.env.CORS_ALLOW_ALL_DEV_ORIGINS === 'true';

  if (allowAllDevOrigins || allowlist.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV !== 'production' && isDevLocalNetworkOrigin(origin)) {
    return true;
  }

  return false;
}

export function resolveOriginFromHeaders(
  headers: Record<string, string | string[] | undefined>,
) {
  const originHeader = headers.origin;
  if (typeof originHeader === 'string' && originHeader.trim()) {
    return originHeader.trim();
  }

  const refererHeader = headers.referer;
  const referer = Array.isArray(refererHeader)
    ? refererHeader[0]?.trim()
    : refererHeader?.trim();
  if (!referer) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(referer);
    if (!HTTP_PROTOCOLS.has(parsedUrl.protocol)) {
      return undefined;
    }
    return parsedUrl.origin;
  } catch {
    return undefined;
  }
}
