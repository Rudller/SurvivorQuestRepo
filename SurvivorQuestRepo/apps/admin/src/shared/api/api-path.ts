const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export function buildApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const prefix = useMockApi ? "/api" : "";
  return `${prefix}${normalizedPath}`;
}
