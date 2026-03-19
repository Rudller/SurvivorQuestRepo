import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { buildApiUrl } from "./api-path";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "",
  credentials: "include",
});

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (
  args,
  api,
  extraOptions,
) => {
  if (typeof args === "string") {
    return rawBaseQuery(buildApiUrl(args), api, extraOptions);
  }

  return rawBaseQuery(
    {
      ...args,
      url: buildApiUrl(args.url),
    },
    api,
    extraOptions,
  );
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["User", "Auth", "Station", "Realization", "Scenario", "Chat"],
  endpoints: () => ({}),
});
