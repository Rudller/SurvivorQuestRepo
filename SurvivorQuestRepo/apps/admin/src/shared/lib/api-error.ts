import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export function resolveApiErrorMessage(error: unknown) {
  const base = error as FetchBaseQueryError & {
    data?: {
      message?: string | string[];
      error?: { message?: string; details?: unknown };
    };
    error?: string;
  };

  if (Array.isArray(base?.data?.message) && base.data.message.length > 0) {
    return base.data.message[0];
  }

  if (typeof base?.data?.message === "string" && base.data.message.trim()) {
    return base.data.message;
  }

  if (typeof base?.data?.error?.message === "string" && base.data.error.message.trim()) {
    return base.data.error.message;
  }

  if (Array.isArray(base?.data?.error?.details) && base.data.error.details.length > 0) {
    const firstDetail = base.data.error.details[0];
    if (typeof firstDetail === "string" && firstDetail.trim()) {
      return firstDetail;
    }
  }

  if (typeof base?.error === "string" && base.error.trim()) {
    return base.error;
  }

  return null;
}
