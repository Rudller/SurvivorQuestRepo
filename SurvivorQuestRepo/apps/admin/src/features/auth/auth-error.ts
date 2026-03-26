import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export function isUnauthorizedError(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}
