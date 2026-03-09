"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildApiPath,
  getApiConnectionLabel,
  getConfiguredApiUrl,
  isMockApiEnabled,
} from "@/shared/api/api-path";

type ApiConnectionStatus = "checking" | "connected" | "disconnected" | "config-missing";
type ApiConnectionStatusBadgeProps = {
  inline?: boolean;
};

function getProbeUrl() {
  if (isMockApiEnabled()) {
    return buildApiPath("/auth/me");
  }

  const apiUrl = getConfiguredApiUrl();
  if (!apiUrl) {
    return null;
  }

  return `${apiUrl.replace(/\/+$/, "")}${buildApiPath("/auth/me")}`;
}

export function ApiConnectionStatusBadge({ inline = false }: ApiConnectionStatusBadgeProps) {
  const probeUrl = useMemo(() => getProbeUrl(), []);
  const [status, setStatus] = useState<ApiConnectionStatus>(
    probeUrl ? "checking" : "config-missing",
  );

  useEffect(() => {
    if (!probeUrl) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    fetch(probeUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(() => {
        setStatus("connected");
      })
      .catch(() => {
        setStatus("disconnected");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [probeUrl]);

  const indicatorClassName =
    status === "connected"
      ? "bg-emerald-400"
      : status === "checking"
        ? "bg-amber-300"
        : status === "config-missing"
          ? "bg-zinc-500"
          : "bg-red-400";

  return (
    <div
      className={`rounded-lg border border-zinc-700/70 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 backdrop-blur ${
        inline
          ? ""
          : "absolute right-4 top-4 z-10 shadow-lg sm:right-6 sm:top-6"
      }`}
    >
      <p>
        <span className="text-zinc-400">Serwer:</span> {getApiConnectionLabel()}
      </p>
      <p className="mt-1 inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${indicatorClassName}`} />
        <span className="text-zinc-400">Status:</span>
        <span className="font-medium">{status}</span>
      </p>
    </div>
  );
}
