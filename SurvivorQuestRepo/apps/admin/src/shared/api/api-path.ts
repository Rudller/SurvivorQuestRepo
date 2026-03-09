const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export function buildApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const prefix = useMockApi ? "/api" : "";
  return `${prefix}${normalizedPath}`;
}

export function getApiConnectionLabel() {
  if (useMockApi) {
    return "Mock API (lokalne /api)";
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configuredApiUrl) {
    return "Backend API (brak NEXT_PUBLIC_API_URL)";
  }

  return configuredApiUrl;
}

export function isMockApiEnabled() {
  return useMockApi;
}

export function getConfiguredApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
}
