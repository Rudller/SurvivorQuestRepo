import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001';

export const baseApi = createApi({
    reducerPath: 'baseApi',
    baseQuery: fetchBaseQuery({
        baseUrl: apiBaseUrl,
        credentials: 'include',
    }),
    tagTypes: ["User", "Auth", "Station", "Realization", "Scenario", "Chat"],
    endpoints: () => ({}),
});
