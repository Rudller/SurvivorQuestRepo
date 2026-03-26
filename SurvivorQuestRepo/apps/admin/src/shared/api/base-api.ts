import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { buildApiUrl, getConfiguredApiUrl, resetConfiguredApiUrl } from "./api-path";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "",
  credentials: "include",
});

function buildRequestArgs(args: string | FetchArgs) {
  if (typeof args === "string") {
    return buildApiUrl(args);
  }

  return {
    ...args,
    url: buildApiUrl(args.url),
  };
}

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

function shouldRetryWithDefaultApiUrl(args: string | FetchArgs, error?: FetchBaseQueryError) {
  if (typeof window === "undefined" || !error || error.status !== "FETCH_ERROR") {
    return false;
  }

  if (typeof args === "string") {
    return !isAbsoluteUrl(args);
  }

  return !isAbsoluteUrl(args.url);
}

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const runRequest = () => rawBaseQuery(buildRequestArgs(args), api, extraOptions);
  const initialResult = await runRequest();

  if (!shouldRetryWithDefaultApiUrl(args, initialResult.error)) {
    return initialResult;
  }

  const currentApiUrl = getConfiguredApiUrl();
  resetConfiguredApiUrl();
  const fallbackApiUrl = getConfiguredApiUrl();

  if (fallbackApiUrl === currentApiUrl) {
    return initialResult;
  }

  return runRequest();
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["User", "Auth", "Station", "Realization", "Scenario", "Chat"],
  endpoints: () => ({}),
});
