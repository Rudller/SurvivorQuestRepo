"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildApiPath,
  getConfiguredApiUrl,
  resetConfiguredApiUrl,
  setConfiguredApiUrl,
  subscribeConfiguredApiUrlChange,
} from "@/shared/api/api-path";

type ApiConnectionStatus = "checking" | "connected" | "disconnected";
type ApiConnectionStatusBadgeProps = {
  inline?: boolean;
  allowServerEdit?: boolean;
};
const PROBE_TIMEOUT_MS = 5000;
const PROBE_INTERVAL_MS = 10000;

export function ApiConnectionStatusBadge({
  inline = false,
  allowServerEdit = true,
}: ApiConnectionStatusBadgeProps) {
  const [apiUrl, setApiUrl] = useState(() => getConfiguredApiUrl());
  const [apiUrlDraft, setApiUrlDraft] = useState(() => getConfiguredApiUrl());
  const [apiUrlEditError, setApiUrlEditError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const probeUrl = useMemo(
    () => `${apiUrl.replace(/\/+$/, "")}${buildApiPath("/auth/me")}`,
    [apiUrl],
  );
  const [status, setStatus] = useState<ApiConnectionStatus>("checking");

  useEffect(() => {
    return subscribeConfiguredApiUrlChange(() => {
      const nextApiUrl = getConfiguredApiUrl();
      setApiUrl(nextApiUrl);
      setApiUrlDraft(nextApiUrl);
      setApiUrlEditError(null);
      setStatus("checking");
      setIsEditorOpen(false);
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let activeController: AbortController | null = null;

    const runProbe = () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

      fetch(probeUrl, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      })
        .then(() => {
          if (!isCancelled) {
            setStatus("connected");
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setStatus("disconnected");
          }
        })
        .finally(() => {
          window.clearTimeout(timeoutId);
        });
    };

    runProbe();
    const intervalId = window.setInterval(runProbe, PROBE_INTERVAL_MS);

    return () => {
      isCancelled = true;
      activeController?.abort();
      window.clearInterval(intervalId);
    };
  }, [probeUrl]);

  const indicatorClassName =
    status === "connected"
      ? "bg-emerald-400"
      : status === "checking"
        ? "bg-amber-300"
        : "bg-red-400";

  return (
    <div
      className={`rounded-lg border border-zinc-700/70 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 backdrop-blur ${
        inline
          ? ""
          : "absolute right-4 top-4 z-10 w-[22rem] shadow-lg sm:right-6 sm:top-6"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate">
          <span className="text-zinc-400">Serwer:</span> {apiUrl}
        </p>
        {allowServerEdit && (
          <button
            type="button"
            onClick={() => {
              setIsEditorOpen((current) => !current);
              setApiUrlEditError(null);
            }}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            aria-label={isEditorOpen ? "Zamknij zmianę serwera" : "Zmień serwer"}
            title="Zmień serwer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
              <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 0 6H7a3 3 0 0 1-3-3Zm3-1a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2H7Zm10 12a3 3 0 0 1-3 3H4a3 3 0 0 1 0-6h10a3 3 0 0 1 3 3Zm-3-1H4a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2Z" />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-1 inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${indicatorClassName}`} />
        <span className="text-zinc-400">Status:</span>
        <span className="font-medium">{status}</span>
      </p>

      {allowServerEdit && isEditorOpen && (
        <div className="mt-2 space-y-2 border-t border-zinc-800 pt-2">
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Zmień serwer API</span>
            <input
              value={apiUrlDraft}
              onChange={(event) => {
                setApiUrlDraft(event.target.value);
                setApiUrlEditError(null);
              }}
              placeholder="http://localhost:3001"
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none transition focus:border-amber-400/80"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const result = setConfiguredApiUrl(apiUrlDraft);
                if (!result.ok) {
                  setApiUrlEditError(result.message);
                  return;
                }
                setStatus("checking");
                setApiUrl(result.value);
                setApiUrlDraft(result.value);
                setIsEditorOpen(false);
              }}
              className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 transition hover:border-zinc-500"
            >
              Zapisz
            </button>
            <button
              type="button"
              onClick={() => {
                resetConfiguredApiUrl();
                const fallbackUrl = getConfiguredApiUrl();
                setStatus("checking");
                setApiUrl(fallbackUrl);
                setApiUrlDraft(fallbackUrl);
                setApiUrlEditError(null);
                setIsEditorOpen(false);
              }}
              className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 transition hover:border-zinc-500"
            >
              Domyślny
            </button>
          </div>

          {apiUrlEditError && <p className="text-[11px] text-red-300">{apiUrlEditError}</p>}
        </div>
      )}
    </div>
  );
}
